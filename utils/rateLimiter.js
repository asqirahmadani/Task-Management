import { extractOperationName } from "./inputValidator.js";
import { logSecurityEvent } from "./logger.js";
import redis from "../config/redis.js";

export const tokenBucketRateLimit = async (
  identifier,
  maxTokens = 100,
  refillRate = 10,
  cost = 1
) => {
  const key = `rate_limit:token_bucket:${identifier}`;
  const now = Date.now();

  try {
    const bucket = await redis.getJSON(key);

    let tokens;
    let lastRefill;

    if (bucket) {
      const timePassed = (now - bucket.lastRefill) / 1000;
      const tokensToAdd = timePassed * refillRate;

      tokens = Math.min(bucket.tokens + tokensToAdd, maxTokens);
      lastRefill = now;
    } else {
      tokens = maxTokens;
      lastRefill = now;
    }

    if (tokens < cost) {
      const refillTime = Math.ceil((cost - tokens) / refillRate);

      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        identifier,
        tokensAvailable: Math.floor(tokens),
        tokensRequired: cost,
        maxTokens,
      });

      return {
        allowed: false,
        tokens: Math.floor(tokens),
        maxTokens,
        retryAfter: refillTime,
        message: `Rate limit exceeded. Try again in ${refillTime} seconds`,
      };
    }

    tokens -= cost;

    await redis.setJSON(key, { tokens, lastRefill }, { EX: 3600 });
    console.log(
      `Rate limit OK for ${identifier}: ${Math.floor(
        tokens
      )}/${maxTokens} tokens`
    );

    return {
      allowed: true,
      tokens: Math.floor(tokens),
      maxTokens,
      retryAfter: 0,
    };
  } catch (error) {
    console.error("Rate limiter error:", error.message);

    return {
      allowed: true,
      tokens: maxTokens,
      maxTokens,
      retryAfter: 0,
    };
  }
};

export const getQueryCost = (operationName) => {
  const costs = {
    // Expensive operations
    getAllTasks: 10,
    getAllUsers: 10,
    getAllComments: 10,
    searchUsers: 15,
    getTaskStats: 20,
    getGlobalTaskStats: 50,

    // Moderate operations
    getTask: 5,
    getUser: 5,
    getComment: 5,
    me: 3,

    // Cheap operations
    health: 1,

    // Mutations (slightly more expensive)
    createTask: 8,
    updateTask: 8,
    deleteTask: 8,
    createComment: 5,
    updateComment: 5,
    deleteComment: 5,

    // Default
    default: 5,
  };

  return costs[operationName] || costs.default;
};

export const operationRateLimit = async (
  identifier,
  operationName,
  maxRequests = 10,
  windowSeconds = 60
) => {
  const key = `rate_limit:operation:${operationName}:${identifier}`;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    const ttl = await redis.ttl(key);

    if (count > maxRequests) {
      console.log(
        `Operation rate limit exceeded: ${operationName} by ${identifier}`
      );

      return {
        allowed: false,
        remaining: 0,
        resetIn: ttl,
        message: `Too many ${operationName} requests. Try again in ${ttl} seconds.`,
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - count,
      resetIn: ttl,
    };
  } catch (error) {
    console.error("Operation rate limiter error:", error.message);
    return {
      allowed: true,
      remaining: maxRequests,
      resetIn: windowSeconds,
    };
  }
};

export const slidingWindowRateLimit = async (
  identifier,
  maxRequests = 100,
  windowSeconds = 60
) => {
  const key = `rate_limit:sliding:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  try {
    // remove old entries
    await redis.zRemRangeByScore(key, 0, windowStart);

    // count requests in window
    const count = await redis.zCard(key);

    if (count >= maxRequests) {
      const oldestEntry = await redis.zRange(key, 0, 0, { WITHSCORES: true });
      const resetTime = Math.ceil(
        (oldestEntry[0].score + windowSeconds * 1000 - now) / 1000
      );

      console.log(`Sliding window rate limit exceeded for ${identifier}`);

      return {
        allowed: false,
        remaining: 0,
        resetIn: resetTime,
        message: `Rate limit exceeded. Try again in ${resetTime} seconds`,
      };
    }

    // add current request
    await redis.zAdd(key, { score: now, value: `${now}` });
    await redis.expire(key, windowSeconds);

    return {
      allowed: true,
      remaining: maxRequests - count - 1,
      resetIn: windowSeconds,
    };
  } catch (error) {
    console.error("Sliding window rate limiter error:", error.message);

    return {
      allowed: true,
      remaining: maxRequests,
      resetIn: windowSeconds,
    };
  }
};

export const rateLimitPlugin = {
  async requestDidStart(requestContext) {
    return {
      async didResolveOperation(operationContext) {
        const { operation, contextValue } = operationContext;
        const operationName = extractOperationName(operation.loc.source.body);

        if (operationName === "IntrospectionQuery") {
          return;
        }

        const identifier =
          contextValue.user?.id ||
          requestContext.request.http?.headers.get("x-forwarded-for") ||
          "anonymous";

        const cost = await getQueryCost(operationName);
        const result = await tokenBucketRateLimit(identifier, 100, 10, cost);

        if (!result.allowed) {
          throw new Error(result.message);
        }

        if (cost >= 10) {
          const opResult = await operationRateLimit(
            identifier,
            operationName,
            5,
            60
          );

          if (!opResult.allowed) {
            throw new Error(opResult.message);
          }
        }

        // add rate limit info to response headers
        requestContext.response.http.headers.set(
          "X-RateLimit-Remaining",
          result.tokens.toString()
        );
        requestContext.response.http.headers.set(
          "X-RateLimit-Limit",
          result.maxTokens.toString()
        );
      },
    };
  },
};

import redis from "../config/redis.js";

// caching function
export const cacheAside = async (key, fetchFn, ttl = 3600) => {
  try {
    // try to get from cache
    const cached = await redis.getJSON(key);

    if (cached !== null) {
      console.log(`Cache HIT: ${key}`);
      return cached;
    }

    console.log(`Cache MISS: ${key}`);
    // fetch from database
    const data = await fetchFn();

    if (data !== null && data !== undefined) {
      await redis.setJSON(key, data, { EX: ttl });
      console.log(`Cached: ${key} (TTL: ${ttl}s)`);
    }

    return data;
  } catch (error) {
    console.error(`Cache error for ${key}:`, error.message);

    // if cache fails, fetch from database
    try {
      return await fetchFn();
    } catch (fetchError) {
      console.error(`Fetch error for ${key}:`, fetchError.message);
      throw fetchError;
    }
  }
};

// delete 1 key
export const invalidateCache = async (key) => {
  try {
    const deleted = await redis.del(key);

    if (deleted > 0) {
      console.log(`Invalidated: ${key}`);
    }

    return deleted;
  } catch (error) {
    console.error(`Error invalidating ${key}:`, error.message);
    return 0;
  }
};

// delete keys by pattern
export const invalidateCachePattern = async (pattern) => {
  try {
    const count = await redis.delPattern(pattern);

    if (count > 0) {
      console.log(`Invalidated ${count} key(s) matching: ${pattern}`);
    }

    return count;
  } catch (error) {
    console.error(`Error invalidating pattern ${pattern}:`, error.message);
    return 0;
  }
};

// delete multiple keys
export const invalidateMultiple = async (keys) => {
  try {
    if (keys.length === 0) return 0;

    const deleted = await redis.del(keys);
    console.log(`Invalidated ${deleted} key(s)`);
    return deleted;
  } catch (error) {
    console.error("Error invalidating multiple keys:", error.message);
    return 0;
  }
};

// preload cache
export const warmCache = async (key, data, ttl = 3600) => {
  try {
    await redis.setJSON(key, data, { EX: ttl });
    console.log(`Warmed cache: ${key} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    console.error(`Error warming cache ${key}:`, error.message);
    return false;
  }
};

// check if key exist in cache
export const isCached = async (key) => {
  try {
    return await redis.keyExists(key);
  } catch (error) {
    console.error(`Error checking cache ${key}:`, error.message);
    return false;
  }
};

export const getCacheTTL = async (key) => {
  try {
    return await redis.ttl(key);
  } catch (error) {
    console.error(`Error getting TTL for ${key}:`, error.message);
    return -2;
  }
};

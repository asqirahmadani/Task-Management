import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redis = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    reconnectStrategy: (retries) => {
      console.log(`Redis reconnecting... (attemp ${retries})`);

      if (retries > 10) {
        console.error("Too many redis reconnection attemps");
        return new error("Max reconnection attemps reached");
      }

      return Math.min(retries * 100, 3000);
    },
  },
});

// Event Handlers
redis.on("connect", () => {
  console.log("Redis client connecting...");
});

redis.on("ready", () => {
  console.log("Redis client ready");
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);

  if (err.code === "ECONNREFUSED") {
    console.error("Make sure Redis server is running");
  }
});

redis.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

redis.on("end", () => {
  console.log("Redis connection closed");
});

// Helper functions
redis.getJSON = async (key) => {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Error getting JSON from ${key}:`, error.message);
    return null;
  }
};

redis.setJSON = async (key, value, options = {}) => {
  try {
    return await redis.set(key, JSON.stringify(value), options);
  } catch (error) {
    console.error(`Error setting JSON to ${key}:`, error.message);
    throw error;
  }
};

redis.mgetJSON = async (keys) => {
  try {
    const values = await redis.mGet(keys);
    return values.map((v) => (v ? JSON.parse(v) : null));
  } catch (error) {
    console.error("Error mGet JSON:", error.message);
    throw keys.map(() => null);
  }
};

redis.delPattern = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    const deleted = await redis.del(keys);
    console.log(`Deleted ${deleted} key(s) matching: ${pattern}`);
    return deleted;
  } catch (error) {
    console.error(`Error deleting pattern ${pattern}:`, error.message);
    return 0;
  }
};

redis.keyExists = async (key) => {
  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`Error checking key ${key}:`, error.message);
    return false;
  }
};

// connect redis
await redis.connect();

const gracefulShutdown = async (signal) => {
  console.log(`\n ${signal} received, closing Redis connection...`);

  try {
    await redis.quit();
  } catch (error) {
    console.error("Error during Redis shutdown:", error.message);
    await redis.destroy();
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

export default redis;

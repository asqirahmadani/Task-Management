import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const testRedis = async () => {
  console.log("\n" + "=".repeat(80));
  console.log("🔍 TESTING REDIS CONNECTION");
  console.log("=".repeat(80) + "\n");

  console.log("📋 Step 1: Create Redis client\n");

  const redis = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
  });

  redis.on("error", (err) => {
    console.error("❌ Redis error:", err.message);
  });

  redis.on("connect", () => {
    console.log("✅ Connecting to Redis...");
  });

  redis.on("ready", () => {
    console.log("✅ Redis client ready\n");
  });

  try {
    console.log("📋 Step 2: Connect to Redis\n");
    await redis.connect();

    console.log("📋 Step 3: Test SET command\n");
    await redis.set("test:hello", "Hello from Redis!");
    console.log('✅ SET successful: test:hello = "Hello from Redis!"\n');

    console.log("📋 Step 4: Test GET command\n");
    const value = await redis.get("test:hello");
    console.log("✅ GET successful: test:hello =", value, "\n");

    console.log("📋 Step 5: Test JSON storage\n");
    const user = { id: 123, name: "John Doe", email: "john@example.com" };
    await redis.set("test:user:123", JSON.stringify(user));
    console.log("✅ Stored user:", user, "\n");

    console.log("📋 Step 6: Test JSON retrieval\n");
    const storedUser = await redis.get("test:user:123");
    const parsedUser = JSON.parse(storedUser);
    console.log("✅ Retrieved user:", parsedUser, "\n");

    console.log("📋 Step 7: Test TTL (expiration)\n");
    await redis.set("test:expires", "I will expire in 10 seconds", { EX: 10 });
    console.log("✅ SET with TTL: 10 seconds\n");

    const ttl = await redis.ttl("test:expires");
    console.log("⏱️  Time remaining:", ttl, "seconds\n");

    console.log("📋 Step 8: Test DEL command\n");
    await redis.del("test:hello");
    console.log("✅ Deleted: test:hello\n");

    const deleted = await redis.get("test:hello");
    console.log(
      "Verify:",
      deleted === null ? "✅ Key deleted successfully" : "❌ Key still exists",
      "\n"
    );

    console.log("📋 Step 9: Test MGET (batch get)\n");
    await redis.set("test:key1", "value1");
    await redis.set("test:key2", "value2");
    await redis.set("test:key3", "value3");

    const values = await redis.mGet(["test:key1", "test:key2", "test:key3"]);
    console.log("✅ MGET result:", values, "\n");

    console.log("📋 Step 10: Clean up test keys\n");
    await redis.del([
      "test:user:123",
      "test:expires",
      "test:key1",
      "test:key2",
      "test:key3",
    ]);
    console.log("✅ Test keys cleaned up\n");

    console.log("=".repeat(80));
    console.log("✅ ALL REDIS TESTS PASSED!");
    console.log("=".repeat(80) + "\n");
  } catch (error) {
    console.error("\n" + "=".repeat(80));
    console.error("❌ TEST FAILED");
    console.error("=".repeat(80));
    console.error("Error:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.error("\n💡 Redis server is not running!");
      console.error(
        "   Start Redis with: docker run -p 6379:6379 redis:7-alpine"
      );
    }
  } finally {
    await redis.destroy();
    console.log("🔌 Redis disconnected\n");
  }
};

testRedis();

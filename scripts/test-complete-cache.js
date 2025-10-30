import pool from "../config/database.js";
import redis from "../config/redis.js";
import { createLoaders } from "../utils/dataLoader.js";

const userId1 = "256b8b59-eee8-4c4b-b1bc-7fb3aa3211fd";
const userId2 = "0849e8f1-597d-4b8c-97fc-38e4fb9cdbd9";
const userId3 = "f81e39d4-5fb5-42a0-ac5c-826c82045fb1";
const userId4 = "e82ccbea-7315-4286-bc11-7e628f2a4dd4";
const userId5 = "f7e6639c-160b-4e31-8750-501ac0b5c08a";

const testCompleteCaching = async () => {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 TESTING COMPLETE CACHING SYSTEM");
  console.log("   (Redis + DataLoader Integration)");
  console.log("=".repeat(80) + "\n");

  try {
    // ==========================================
    // TEST 1: First Request (Cache Miss)
    // ==========================================

    console.log("📋 TEST 1: First Request (Cold Cache)\n");

    pool.resetQueryTracking();
    const start1 = Date.now();

    const loaders1 = createLoaders(pool);

    // Simulate fetching 3 users
    console.log("Fetching 3 users...\n");
    const userPromises1 = [
      loaders1.userLoader.load(userId1),
      loaders1.userLoader.load(userId2),
      loaders1.userLoader.load(userId3),
    ];

    await Promise.all(userPromises1);

    const duration1 = Date.now() - start1;
    const queries1 = pool.getQueryStats().count;

    console.log("\n📊 TEST 1 Results:");
    console.log(`   Duration: ${duration1}ms`);
    console.log(`   DB Queries: ${queries1}`);
    console.log(`   Expected: 1 query (batched by DataLoader)`);

    // ==========================================
    // TEST 2: Second Request (Cache Hit via Redis)
    // ==========================================

    console.log("\n" + "=".repeat(80));
    console.log("📋 TEST 2: Second Request (Warm Cache)\n");

    // Simulate new request (new DataLoader instance)
    pool.resetQueryTracking();
    const start2 = Date.now();

    const loaders2 = createLoaders(pool);

    // Fetch same users (should hit Redis cache)
    console.log("Fetching same 3 users...\n");
    const userPromises2 = [
      loaders2.userLoader.load(userId1),
      loaders2.userLoader.load(userId2),
      loaders2.userLoader.load(userId3),
    ];

    await Promise.all(userPromises2);

    const duration2 = Date.now() - start2;
    const queries2 = pool.getQueryStats().count;

    console.log("\n📊 TEST 2 Results:");
    console.log(`   Duration: ${duration2}ms`);
    console.log(`   DB Queries: ${queries2}`);
    console.log(`   Expected: 0 queries (all from Redis cache)`);

    // ==========================================
    // TEST 3: Mixed (Some Cached, Some New)
    // ==========================================

    console.log("\n" + "=".repeat(80));
    console.log("📋 TEST 3: Mixed Request (Partial Cache)\n");

    pool.resetQueryTracking();
    const start3 = Date.now();

    const loaders3 = createLoaders(pool);

    // 2 cached + 2 new users
    console.log("Fetching 2 cached + 2 new users...\n");
    const userPromises3 = [
      loaders3.userLoader.load(userId1), // cached
      loaders3.userLoader.load(userId2), // cached
      loaders3.userLoader.load(userId4), // new
      loaders3.userLoader.load(userId5), // new
    ];

    await Promise.all(userPromises3);

    const duration3 = Date.now() - start3;
    const queries3 = pool.getQueryStats().count;

    console.log("\n📊 TEST 3 Results:");
    console.log(`   Duration: ${duration3}ms`);
    console.log(`   DB Queries: ${queries3}`);
    console.log(`   Expected: 1 query (only for 2 new users)`);

    // ==========================================
    // COMPARISON
    // ==========================================

    console.log("\n" + "=".repeat(80));
    console.log("📊 PERFORMANCE COMPARISON");
    console.log("=".repeat(80));
    console.log(`
Test 1 (Cold Cache):    ${duration1}ms, ${queries1} queries
Test 2 (Warm Cache):    ${duration2}ms, ${queries2} queries
Test 3 (Partial Cache): ${duration3}ms, ${queries3} queries

Speed Improvement (Test 2 vs Test 1): ${(duration1 / duration2).toFixed(
      2
    )}x faster
Query Reduction: ${queries1} → ${queries2} (${(
      (1 - queries2 / queries1) *
      100
    ).toFixed(0)}% less)
    `);

    // ==========================================
    // CLEANUP
    // ==========================================

    console.log("🧹 Cleaning up test cache keys...\n");
    await redis.delPattern("user:*");

    console.log("=".repeat(80));
    console.log("✅ ALL TESTS COMPLETED!");
    console.log("=".repeat(80) + "\n");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    await redis.quit();
  }
};

testCompleteCaching();

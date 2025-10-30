import pool from "../config/database.js";
import { createLoaders } from "../utils/dataLoader.js";

const testDataLoader = async () => {
  console.log("\n" + "=".repeat(80));
  console.log("🧪 DATALOADER PERFORMANCE TEST");
  console.log("=".repeat(80));

  // ===========================================
  // TEST 1: WITHOUT DATALOADER (N+1 Problem)
  // ===========================================

  console.log("\n📊 TEST 1: WITHOUT DATALOADER\n");

  pool.resetQueryTracking();
  const start1 = Date.now();

  // Fetch tasks
  const tasksResult1 = await pool.query(
    "SELECT * FROM tasks ORDER BY created_at DESC LIMIT 20"
  );

  const tasks1 = tasksResult1.rows;

  // For each task, fetch assigned user (N+1!)
  for (const task of tasks1) {
    if (task.assigned_to) {
      const userResult = await pool.query(
        "SELECT id, name, email FROM users WHERE id = $1",
        [task.assigned_to]
      );
      task.assignedUser = userResult.rows[0];
    }

    // Fetch creator (N+1!)
    if (task.created_by) {
      const creatorResult = await pool.query(
        "SELECT id, name, email FROM users WHERE id = $1",
        [task.created_by]
      );
      task.creator = creatorResult.rows[0];
    }

    // Fetch comments (N+1!)
    const commentsResult = await pool.query(
      "SELECT * FROM comments WHERE task_id = $1",
      [task.id]
    );
    task.comments = commentsResult.rows;
  }

  const duration1 = Date.now() - start1;
  const stats1 = pool.getQueryStats();

  console.log(`✅ Processed ${tasks1.length} tasks`);
  console.log(`⏱️  Duration: ${duration1}ms`);
  console.log(`🔍 Queries: ${stats1.count}`);
  console.log(`⚡ Avg/query: ${(duration1 / stats1.count).toFixed(2)}ms`);

  // ===========================================
  // TEST 2: WITH DATALOADER (Optimized)
  // ===========================================

  console.log("\n📊 TEST 2: WITH DATALOADER\n");

  pool.resetQueryTracking();
  const start2 = Date.now();

  const loaders = createLoaders(pool);

  // Fetch tasks
  const tasksResult2 = await pool.query(
    "SELECT * FROM tasks ORDER BY created_at DESC LIMIT 20"
  );

  const tasks2 = tasksResult2.rows;

  // Batch load all users at once
  const userLoadPromises = [];

  tasks2.forEach((task) => {
    if (task.assigned_to) {
      userLoadPromises.push(
        loaders.userLoader.load(task.assigned_to).then((user) => {
          task.assignedUser = user;
        })
      );
    }
    if (task.created_by) {
      userLoadPromises.push(
        loaders.userLoader.load(task.created_by).then((user) => {
          task.creator = user;
        })
      );
    }
  });

  // Batch load all comments
  const commentLoadPromises = tasks2.map((task) =>
    loaders.commentsByTaskLoader.load(task.id).then((comments) => {
      task.comments = comments;
    })
  );

  // Wait for all batches
  await Promise.all([...userLoadPromises, ...commentLoadPromises]);

  const duration2 = Date.now() - start2;
  const stats2 = pool.getQueryStats();

  console.log(`✅ Processed ${tasks2.length} tasks`);
  console.log(`⏱️  Duration: ${duration2}ms`);
  console.log(`🔍 Queries: ${stats2.count}`);
  console.log(`⚡ Avg/query: ${(duration2 / stats2.count).toFixed(2)}ms`);

  // ===========================================
  // COMPARISON
  // ===========================================

  console.log("\n" + "=".repeat(80));
  console.log("📊 COMPARISON");
  console.log("=".repeat(80));

  const speedup = (duration1 / duration2).toFixed(2);
  const queryReduction = (
    ((stats1.count - stats2.count) / stats1.count) *
    100
  ).toFixed(1);

  console.log(`
╔═══════════════════════════╦══════════════════╦═════════════════╦══════════════╗
║ Metric                    ║ Without Loader   ║ With Loader     ║ Improvement  ║
╠═══════════════════════════╬══════════════════╬═════════════════╬══════════════╣
║ Duration                  ║ ${duration1.toString().padEnd(16)} ║ ${duration2
    .toString()
    .padEnd(15)} ║ ${speedup}x faster  ║
║ Database Queries          ║ ${stats1.count
    .toString()
    .padEnd(16)} ║ ${stats2.count
    .toString()
    .padEnd(15)} ║ ${queryReduction}% less    ║
║ Avg Query Time            ║ ${(duration1 / stats1.count)
    .toFixed(2)
    .padEnd(16)} ║ ${(duration2 / stats2.count)
    .toFixed(2)
    .padEnd(15)} ║              ║
╚═══════════════════════════╩══════════════════╩═════════════════╩══════════════╝
  `);

  console.log(
    `\n💡 Result: DataLoader is ${speedup}x faster with ${queryReduction}% fewer queries!\n`
  );

  await pool.end();
};

testDataLoader().catch(console.error);

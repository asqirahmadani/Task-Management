import { getCacheKey, cachePrefix, cacheTTL } from "../config/cache-config.js";
import redis from "../config/redis.js";
import DataLoader from "dataloader";

const batchUsers = async (userIds, db) => {
  console.log(`\n[DataLoader] Batching ${userIds.length} user(s)`);

  // check redis for all user IDs
  const cacheKeys = userIds.map((id) => getCacheKey(cachePrefix.user, id));
  let cachedUsers;

  try {
    cachedUsers = await redis.mgetJSON(cacheKeys);
  } catch (error) {
    console.error("Redis error, fallback to DB only:", error.message);
    cachedUsers = userIds.map(() => null);
  }

  // identify missing user IDs
  const missingIds = [];
  const userMap = {};

  userIds.forEach((id, index) => {
    if (cachedUsers[index]) {
      console.log(`Cache HIT: `, getCacheKey(cachePrefix.user, id));
      userMap[id] = cachedUsers[index];
    } else {
      console.log(`Cache MISS: `, getCacheKey(cachePrefix.user, id));
      missingIds.push(id);
    }
  });

  // query DB for missing users
  if (missingIds.length > 0) {
    try {
      const result = await db.query(
        `SELECT id, name, email, created_at
         FROM users
         WHERE id = ANY($1)`,
        [missingIds]
      );

      console.log(`Fetched ${result.rows.length} user(s) from DB`);

      const cachePromise = result.rows.map((user) => {
        userMap[user.id] = user;

        return redis
          .setJSON(getCacheKey(cachePrefix.user, user.id), user, {
            EX: cacheTTL.user,
          })
          .then(() =>
            console.log(
              `Cached: ${getCacheKey(cachePrefix.user, user.id)} (1h)`
            )
          )
          .catch((err) =>
            console.error(
              `Cache failed: ${getCacheKey(cachePrefix.user, user.id)}`,
              err.message
            )
          );
      });

      Promise.all(cachePromise).catch(() => {});
    } catch (error) {
      console.error("Database query failed:", error.message);
    }
  } else {
    console.log("\nAll users found in cache! (No DB query needed)");
  }

  // return users in correct order
  return userIds.map((id) => userMap[id] || null);
};

const batchTasks = async (taskIds, db) => {
  console.log(`\n[DataLoader] Batching ${taskIds.length} task(s)`);

  // check redis for all task IDs
  const cacheKeys = taskIds.map((id) => getCacheKey(cachePrefix.task, id));
  let cachedUsers;

  try {
    cachedUsers = await redis.mgetJSON(cacheKeys);
  } catch (error) {
    console.error("Redis error, fallback to DB only:", error.message);
    cachedUsers = taskIds.map(() => null);
  }

  // identify missing user IDs
  const missingIds = [];
  const taskMap = {};

  taskIds.forEach((id, index) => {
    if (cachedUsers[index]) {
      console.log(`Cache HIT: `, getCacheKey(cachePrefix.task, id));
      taskMap[id] = cachedUsers[index];
    } else {
      console.log(`Cache MISS: `, getCacheKey(cachePrefix.task, id));
      missingIds.push(id);
    }
  });

  // query DB for missing users
  if (missingIds.length > 0) {
    try {
      const result = await db.query(
        `SELECT id, title, description, status, priority, 
            assigned_to, created_by, created_at, updated_at 
         FROM tasks 
         WHERE id = ANY($1)`,
        [missingIds]
      );

      console.log(`Fetched ${result.rows.length} task(s) from DB`);

      const cachePromise = result.rows.map((task) => {
        taskMap[task.id] = task;

        return redis
          .setJSON(`task:${task.id}`, task, { EX: 3600 })
          .then(() =>
            console.log(
              `Cached: ${getCacheKey(cachePrefix.task, task.id)} (1h)`
            )
          )
          .catch((err) =>
            console.error(
              `Cache failed: ${getCacheKey(cachePrefix.task, task.id)}`,
              err.message
            )
          );
      });

      Promise.all(cachePromise).catch(() => {});
    } catch (error) {
      console.error("Database query failed:", error.message);
    }
  } else {
    console.log("\nAll tasks found in cache! (No DB query needed)");
  }

  // return tasks in correct order
  return taskIds.map((id) => taskMap[id] || null);
};

const batchTasksByCreator = async (userIds, db) => {
  console.log(`\n[DataLoader] Batching tasks for ${userIds.length} creator(s)`);

  // check cache
  const cacheKeys = userIds.map((id) =>
    getCacheKey(cachePrefix.tasksByCreator, id)
  );
  let cachedTasks;

  try {
    cachedTasks = await redis.mgetJSON(cacheKeys);
  } catch (error) {
    console.error("Redis error:", error.message);
    cachedTasks = userIds.map(() => null);
  }

  const missingIds = [];
  const tasksMap = {};

  userIds.forEach((id, index) => {
    if (cachedTasks[index]) {
      console.log(`Cache HIT: ${getCacheKey(cachePrefix.tasksByCreator, id)}`);
      tasksMap[id] = cachedTasks[index];
    } else {
      console.log(`Cache MISS: ${getCacheKey(cachePrefix.tasksByCreator, id)}`);
      missingIds.push(id);
    }
  });

  // query missing
  if (missingIds.length > 0) {
    console.log(`\nQuery DB for ${missingIds.length} creator(s)`);

    const result = await db.query(
      `SELECT id, title, description, status, priority, 
            assigned_to, created_by, created_at, updated_at 
       FROM tasks 
       WHERE created_by = ANY($1)
       ORDER BY created_at DESC`,
      [missingIds]
    );

    console.log(`Fetched ${result.rows.length} task(s)`);

    // Group by creator
    const tasksByCreator = {};
    missingIds.forEach((id) => {
      tasksByCreator[id] = [];
    });

    result.rows.forEach((task) => {
      if (tasksByCreator[task.created_by]) {
        tasksByCreator[task.created_by].push(task);
      }
    });

    // Cache results
    for (const userId of missingIds) {
      const tasks = tasksByCreator[userId];
      tasksMap[userId] = tasks;

      redis
        .setJSON(`${getCacheKey(cachePrefix.tasksByCreator, userId)}`, tasks, {
          EX: cacheTTL.task,
        })
        .catch((err) => console.error("Cache error:", err.message));
    }
  }

  return userIds.map((id) => tasksMap[id] || []);
};

const batchTasksByAssignee = async (userIds, db) => {
  console.log(
    `\n[DataLoader] Batching tasks for ${userIds.length} assignee(s)`
  );

  const cacheKeys = userIds.map((id) =>
    getCacheKey(cachePrefix.tasksByAssignee, id)
  );
  let cachedTasks;

  try {
    cachedTasks = await redis.mgetJSON(cacheKeys);
  } catch (error) {
    cachedTasks = userIds.map(() => null);
  }

  const missingIds = [];
  const tasksMap = {};

  userIds.forEach((id, index) => {
    if (cachedTasks[index]) {
      console.log(`Cache HIT: ${getCacheKey(cachePrefix.tasksByAssignee, id)}`);
      tasksMap[id] = cachedTasks[index];
    } else {
      console.log(
        `Cache MISS: ${getCacheKey(cachePrefix.tasksByAssignee, id)}`
      );
      missingIds.push(id);
    }
  });

  if (missingIds.length > 0) {
    const result = await db.query(
      `SELECT id, title, description, status, priority, 
            assigned_to, created_by, created_at, updated_at 
       FROM tasks 
       WHERE assigned_to = ANY($1)
       ORDER BY created_at DESC`,
      [missingIds]
    );

    const tasksByAssignee = {};
    missingIds.forEach((id) => {
      tasksByAssignee[id] = [];
    });

    result.rows.forEach((task) => {
      if (tasksByAssignee[task.assigned_to]) {
        tasksByAssignee[task.assigned_to].push(task);
      }
    });

    for (const userId of missingIds) {
      const tasks = tasksByAssignee[userId];
      tasksMap[userId] = tasks;

      redis
        .setJSON(getCacheKey(cachePrefix.tasksByAssignee, userId), tasks, {
          EX: cacheTTL.task,
        })
        .catch(() => {});
    }
  }

  return userIds.map((id) => tasksMap[id] || []);
};

const batchCommentsByTask = async (taskIds, db) => {
  console.log(`\n[DataLoader] Batching comments for ${taskIds.length} task(s)`);

  const cacheKeys = taskIds.map((id) =>
    getCacheKey(cachePrefix.commentsByTask, id)
  );
  let cachedComments;

  try {
    cachedComments = await redis.mgetJSON(cacheKeys);
  } catch (error) {
    cachedComments = taskIds.map(() => null);
  }

  const missingIds = [];
  const commentsMap = {};

  taskIds.forEach((id, index) => {
    if (cachedComments[index]) {
      console.log(`Cache HIT: ${getCacheKey(cachePrefix.commentsByTask, id)}`);
      commentsMap[id] = cachedComments[index];
    } else {
      console.log(`Cache MISS: ${getCacheKey(cachePrefix.commentsByTask, id)}`);
      missingIds.push(id);
    }
  });

  if (missingIds.length > 0) {
    const result = await db.query(
      `SELECT id, task_id, user_id, text, created_at 
       FROM comments 
       WHERE task_id = ANY($1) 
       ORDER BY created_at DESC`,
      [missingIds]
    );

    const commentsByTask = {};
    missingIds.forEach((id) => {
      commentsByTask[id] = [];
    });

    result.rows.forEach((comment) => {
      if (commentsByTask[comment.task_id]) {
        commentsByTask[comment.task_id].push(comment);
      }
    });

    for (const taskId of missingIds) {
      const comments = commentsByTask[taskId];
      commentsMap[taskId] = comments;

      redis
        .setJSON(getCacheKey(cachePrefix.commentsByTask, taskId), comments, {
          EX: cacheTTL.comment,
        })
        .catch(() => {});
    }
  }

  return taskIds.map((id) => commentsMap[id] || []);
};

const batchCommentsByUser = async (userIds, db) => {
  console.log(`\n[DataLoader] Batching comments for ${userIds.length} user(s)`);

  const cacheKeys = userIds.map((id) =>
    getCacheKey(cachePrefix.comment, cachePrefix.user, id)
  );

  let cachedComments;
  try {
    cachedComments = await redis.mgetJSON(cacheKeys);
  } catch (error) {
    cachedComments = userIds.map(() => null);
  }

  const missingIds = [];
  const commentsMap = {};

  userIds.forEach((id, index) => {
    if (cachedComments[index]) {
      console.log(
        `Cache HIT: ${getCacheKey(cachePrefix.comment, cachePrefix.user, id)}`
      );
      commentsMap[id] = cachedComments[index];
    } else {
      console.log(
        `Cache MISS: ${getCacheKey(cachePrefix.comment, cachePrefix.user, id)}`
      );
      missingIds.push(id);
    }
  });

  if (missingIds.length > 0) {
    const result = await db.query(
      `SELECT id, task_id, user_id, text, created_at 
       FROM comments 
       WHERE user_id = ANY($1) 
       ORDER BY created_at DESC`,
      [missingIds]
    );

    const commentsByUser = {};
    missingIds.forEach((id) => {
      commentsByUser[id] = [];
    });

    result.rows.forEach((comment) => {
      if (commentsByUser[comment.user_id]) {
        commentsByUser[comment.user_id].push(comment);
      }
    });

    for (const userId of missingIds) {
      const comments = commentsByUser[userId];
      commentsMap[userId] = comments;

      redis
        .setJSON(
          getCacheKey(cachePrefix.comment, cachePrefix.user, userId),
          comments,
          {
            EX: cacheTTL.comment,
          }
        )
        .catch(() => {});
    }
  }

  return userIds.map((id) => commentsMap[id] || []);
};

export const createLoaders = (db) => {
  return {
    // User loader
    userLoader: new DataLoader((ids) => batchUsers(ids, db), {
      cache: true,
      maxBatchSize: 100,
      batchScheduleFn: (cb) => setTimeout(cb, 0),
    }),
    taskLoader: new DataLoader((ids) => batchTasks(ids, db)),

    // Task loaders
    tasksByCreatorLoader: new DataLoader((ids) => batchTasksByCreator(ids, db)),
    tasksByAssigneeLoader: new DataLoader((ids) =>
      batchTasksByAssignee(ids, db)
    ),

    // Comment loaders
    commentsByTaskLoader: new DataLoader((ids) => batchCommentsByTask(ids, db)),
    commentsByUserLoader: new DataLoader((ids) => batchCommentsByUser(ids, db)),
  };
};

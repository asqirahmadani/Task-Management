import DataLoader from "dataloader";

const batchUsers = async (userIds, db) => {
  const result = await db.query(
    `SELECT id, name, email, created_at
         FROM users
         WHERE id = ANY($1)`,
    [userIds]
  );

  const userMap = {};

  result.rows.forEach((user) => {
    userMap[user.id] = user;
  });

  return userIds.map((id) => userMap[id] || null);
};

const batchTasks = async (taskIds, db) => {
  const result = await db.query(
    `SELECT id, title, description, status, priority, 
            assigned_to, created_by, created_at, updated_at 
     FROM tasks 
     WHERE id = ANY($1)`,
    [taskIds]
  );

  const taskMap = {};

  result.rows.forEach((task) => {
    taskMap[task.id] = task;
  });

  return taskIds.map((id) => taskMap[id] || null);
};

const batchTasksByCreator = async (userIds, db) => {
  const result = await db.query(
    `SELECT id, title, description, status, priority, 
            assigned_to, created_by, created_at, updated_at 
     FROM tasks 
     WHERE created_by = ANY($1)
     ORDER BY created_at DESC`,
    [userIds]
  );

  const tasksByCreator = {};

  userIds.forEach((id) => {
    tasksByCreator[id] = [];
  });

  result.rows.forEach((task) => {
    if (tasksByCreator[task.created_by]) {
      tasksByCreator[task.created_by].push(task);
    }
  });

  return userIds.map((id) => tasksByCreator[id]);
};

const batchTasksByAssignee = async (userIds, db) => {
  const result = await db.query(
    `SELECT id, title, description, status, priority, 
            assigned_to, created_by, created_at, updated_at 
     FROM tasks 
     WHERE assigned_to = ANY($1)
     ORDER BY created_at DESC`,
    [userIds]
  );

  const tasksByAssignee = {};

  userIds.forEach((id) => {
    tasksByAssignee[id] = [];
  });

  result.rows.forEach((task) => {
    if (tasksByAssignee[task.assigned_to]) {
      tasksByAssignee[task.assigned_to].push(task);
    }
  });

  return userIds.map((id) => tasksByAssignee[id]);
};

const batchCommentsByTask = async (taskIds, db) => {
  const result = await db.query(
    `SELECT id, task_id, user_id, text, created_at 
     FROM comments 
     WHERE task_id = ANY($1)
     ORDER BY created_at DESC`,
    [taskIds]
  );

  const commentsByTask = {};

  taskIds.forEach((id) => {
    commentsByTask[id] = [];
  });

  result.rows.forEach((comment) => {
    if (commentsByTask[comment.task_id]) {
      commentsByTask[comment.task_id].push(comment);
    }
  });

  return taskIds.map((id) => commentsByTask[id]);
};

const batchCommentsByUser = async (userIds, db) => {
  const result = await db.query(
    `SELECT id, task_id, user_id, text, created_at 
     FROM comments 
     WHERE user_id = ANY($1)
     ORDER BY created_at DESC`,
    [userIds]
  );

  const commentsByUser = {};

  userIds.forEach((id) => {
    commentsByUser[id] = [];
  });

  result.rows.forEach((comment) => {
    if (commentsByUser[comment.user_id]) {
      commentsByUser[comment.user_id].push(comment);
    }
  });

  return userIds.map((id) => commentsByUser[id]);
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

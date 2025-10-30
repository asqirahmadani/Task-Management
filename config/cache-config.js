import dotenv from "dotenv";

dotenv.config();

export const cacheTTL = {
  user: parseInt(process.env.CACHE_USER_TTL) || 3600,
  task: parseInt(process.env.CACHE_TASK_TTL) || 600,
  comment: parseInt(process.env.CACHE_COMMENT_TTL) || 300,
  list: parseInt(process.env.CACHE_LIST_TTL) || 300,
  stats: parseInt(process.env.CACHE_STATS_TTL) || 180,
  search: parseInt(process.env.CACHE_SEARCH_TTL) || 300,
  default: parseInt(process.env.CACHE_DEFAULT_TTL) || 3600,
};

export const cachePrefix = {
  user: "user",
  task: "task",
  comment: "comment",
  usersList: "users:all",
  tasksList: "tasks:all",
  commentsList: "comments:all",
  myTasks: "tasks:my",
  tasksByCreator: "tasks:creator",
  tasksByAssignee: "tasks:assignee",
  tasksByStatus: "tasks:status",
  tasksByPriority: "tasks:priority",
  commentsByTask: "comments:task",
  commentsByUser: "comments:byuser",
  stats: "stats",
  search: "search",
};

export const getCacheKey = (prefix, ...parts) => {
  return [prefix, ...parts].filter(Boolean).join(":");
};

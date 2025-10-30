import { requireAuth } from "../../utils/auth.js";
import {
  cacheAside,
  invalidateCachePattern,
  invalidateMultiple,
} from "../../utils/redis.js";
import {
  cacheTTL,
  cachePrefix,
  getCacheKey,
} from "../../config/cache-config.js";

export const taskResolvers = {
  Query: {
    getAllTasks: async (_, { filter, pagination }, context) => {
      try {
        requireAuth(context);

        const limit = pagination?.limit || 10;
        const offset = ((pagination?.page || 1) - 1) * limit;

        const cacheKey = getCacheKey(
          cachePrefix.tasksList,
          cachePrefix.search,
          JSON.stringify(filter),
          `page:${pagination?.page || 1}`,
          `limit${limit}`
        );

        return cacheAside(
          cacheKey,
          async () => {
            const conditions = [];
            const values = [];
            let paramCount = 1;

            if (filter?.status) {
              conditions.push(`status = $${paramCount}`);
              values.push(filter.status);
              paramCount++;
            }

            if (filter?.priority) {
              conditions.push(`priority = $${paramCount}`);
              values.push(filter.priority);
              paramCount++;
            }

            if (filter?.assigned_to) {
              conditions.push(`assigned_to = $${paramCount}`);
              values.push(filter.assigned_to);
              paramCount++;
            }

            if (filter?.created_by) {
              conditions.push(`created_by = $${paramCount}`);
              values.push(filter.created_by);
              paramCount++;
            }

            const whereClause =
              conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

            values.push(limit, offset);

            const result = await context.db.query(
              `SELECT id, title, description, status, priority, 
                      assigned_to, created_by, created_at, updated_at 
               FROM tasks 
               ${whereClause} 
               ORDER BY created_at DESC 
               LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
              values
            );

            return result.rows;
          },
          cacheTTL.list
        );
      } catch (error) {
        console.error("Error fetch all tasks: ", error);
        throw error;
      }
    },

    getTask: async (_, { id }, context) => {
      try {
        requireAuth(context);

        const cacheKey = getCacheKey(cachePrefix.task, id);

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT id, title, description, status, priority,
                    assigned_to, created_by, created_at, updated_at
             FROM tasks
             WHERE id = $1`,
              [id]
            );

            const task = result.rows[0];
            if (!task) {
              throw new Error("Task not found!");
            }

            return task;
          },
          cacheTTL.task
        );
      } catch (error) {
        console.error("Error fetch task: ", error);
        throw error;
      }
    },

    getTasksByStatus: async (_, { status, pagination }, context) => {
      try {
        requireAuth(context);

        const limit = pagination?.limit || 10;
        const offset = ((pagination?.page || 1) - 1) * limit;

        const cacheKey = getCacheKey(
          cachePrefix.tasksByStatus,
          status,
          `page:${pagination?.page || 1}`,
          `limit${limit}`
        );

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT id, title, description, status, priority,
                      assigned_to, created_by, created_at, updated_at
               FROM tasks
               WHERE status = $1
               ORDER BY created_at DESC
               LIMIT $2 OFFSET $3`,
              [status, limit, offset]
            );

            return result.rows;
          },
          cacheTTL.list
        );
      } catch (error) {
        console.error("Error fetch task by status: ", error);
        throw error;
      }
    },

    getTasksByPriority: async (_, { priority, pagination }, context) => {
      try {
        requireAuth(context);

        const limit = pagination?.limit || 10;
        const offset = ((pagination?.page || 1) - 1) * limit;

        const cacheKey = getCacheKey(
          cachePrefix.tasksByPriority,
          priority,
          `page:${pagination?.page || 1}`,
          `limit${limit}`
        );

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT id, title, description, status, priority,
                      assigned_to, created_by, created_at, updated_at
               FROM tasks
               WHERE priority = $1
               ORDER BY created_at DESC
               LIMIT $2 OFFSET $3`,
              [priority, limit, offset]
            );

            return result.rows;
          },
          cacheTTL.list
        );
      } catch (error) {
        console.error("Error fetch task by priority: ", error);
        throw error;
      }
    },

    getMyTasks: async (_, { pagination }, context) => {
      try {
        requireAuth(context);

        const limit = pagination?.limit || 10;
        const offset = ((pagination?.page || 1) - 1) * limit;

        const cacheKey = getCacheKey(
          cachePrefix.myTasks,
          context.user.id,
          `page:${pagination?.page || 1}`,
          `limit${limit}`
        );

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT id, title, description, status, priority,
                      assigned_to, created_by, created_at, updated_at
               FROM tasks
               WHERE assigned_to = $1
               ORDER BY created_at DESC
               LIMIT $2 OFFSET $3`,
              [context.user.id, limit, offset]
            );

            return result.rows;
          },
          cacheTTL.list
        );
      } catch (error) {
        console.error("Error fetch my task: ", error);
        throw error;
      }
    },

    getTasksCreatedByMe: async (_, { pagination }, context) => {
      try {
        requireAuth(context);

        const limit = pagination?.limit || 10;
        const offset = ((pagination?.page || 1) - 1) * limit;

        const cacheKey = getCacheKey(
          cachePrefix.tasksByCreator,
          context.user.id,
          `page:${pagination?.page || 1}`,
          `limit${limit}`
        );

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT id, title, description, status, priority,
                      assigned_to, created_by, created_at, updated_at
               FROM tasks
               WHERE created_by = $1
               ORDER BY created_at DESC
               LIMIT $2 OFFSET $3`,
              [context.user.id, limit, offset]
            );

            return result.rows;
          },
          cacheTTL.list
        );
      } catch (error) {
        console.error("Error fetch my created task: ", error);
        throw error;
      }
    },

    getTasksByUser: async (_, { userId, pagination }, context) => {
      try {
        requireAuth(context);

        const limit = pagination?.limit || 10;
        const offset = ((pagination?.page || 1) - 1) * limit;

        const cacheKey = getCacheKey(
          cachePrefix.myTasks,
          userId,
          `page:${pagination?.page || 1}`,
          `limit${limit}`
        );

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT id, title, description, status, priority,
                      assigned_to, created_by, created_at, updated_at
               FROM tasks
               WHERE assigned_to = $1
               ORDER BY created_at DESC
               LIMIT $2 OFFSET $3`,
              [userId, limit, offset]
            );

            return result.rows;
          },
          cacheTTL.list
        );
      } catch (error) {
        console.error("Error fetch task by user: ", error);
        throw error;
      }
    },
    getTaskStats: async (_, __, context) => {
      try {
        requireAuth(context);

        const userId = context.user.id;
        const cacheKey = getCacheKey(
          cachePrefix.tasksByAssignee,
          cachePrefix.stats,
          userId
        );

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
                COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
                COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
                COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled,
                COUNT(*) FILTER (WHERE priority = 'LOW') as low,
                COUNT(*) FILTER (WHERE priority = 'MEDIUM') as medium,
                COUNT(*) FILTER (WHERE priority = 'HIGH') as high,
                COUNT(*) FILTER (WHERE priority = 'URGENT') as urgent
              FROM tasks
              WHERE assigned_to = $1`,
              [userId]
            );

            const stats = result.rows[0];

            return {
              totalTasks: parseInt(stats.total),
              pendingTasks: parseInt(stats.pending),
              inProgressTasks: parseInt(stats.in_progress),
              completedTasks: parseInt(stats.completed),
              cancelledTasks: parseInt(stats.cancelled),
              tasksByPriority: {
                low: parseInt(stats.low),
                medium: parseInt(stats.medium),
                high: parseInt(stats.high),
                urgent: parseInt(stats.urgent),
              },
            };
          },
          cacheTTL.stats
        );
      } catch (error) {
        console.error("Error fetch task stats: ", error);
        throw error;
      }
    },

    getUserTaskStats: async (_, { userId }, context) => {
      try {
        requireAuth(context);

        if (context.user.id !== userId && !context.user.isAdmin) {
          throw new Error("Not authorized to view this user's stats");
        }

        const cacheKey = getCacheKey(
          cachePrefix.tasksByAssignee,
          cachePrefix.stats,
          userId
        );

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
                COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
                COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
                COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled,
                COUNT(*) FILTER (WHERE priority = 'LOW') as low,
                COUNT(*) FILTER (WHERE priority = 'MEDIUM') as medium,
                COUNT(*) FILTER (WHERE priority = 'HIGH') as high,
                COUNT(*) FILTER (WHERE priority = 'URGENT') as urgent
              FROM tasks
              WHERE assigned_to = $1`,
              [userId]
            );

            const stats = result.rows[0];

            return {
              totalTasks: parseInt(stats.total),
              pendingTasks: parseInt(stats.pending),
              inProgressTasks: parseInt(stats.in_progress),
              completedTasks: parseInt(stats.completed),
              cancelledTasks: parseInt(stats.cancelled),
              tasksByPriority: {
                low: parseInt(stats.low),
                medium: parseInt(stats.medium),
                high: parseInt(stats.high),
                urgent: parseInt(stats.urgent),
              },
            };
          },
          cacheTTL.stats
        );
      } catch (error) {
        console.error("Error fetch task stats by user: ", error);
        throw error;
      }
    },

    getGlobalTaskStats: async (_, __, context) => {
      try {
        requireAuth(context);

        // if (!context.user.isAdmin) {
        //   throw new Error("Admin access required!");
        // }

        const cacheKey = getCacheKey(cachePrefix.tasksList, cachePrefix.stats);

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
                COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
                COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
                COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled,
                COUNT(*) FILTER (WHERE priority = 'LOW') as low,
                COUNT(*) FILTER (WHERE priority = 'MEDIUM') as medium,
                COUNT(*) FILTER (WHERE priority = 'HIGH') as high,
                COUNT(*) FILTER (WHERE priority = 'URGENT') as urgent
              FROM tasks`
            );

            const stats = result.rows[0];

            return {
              totalTasks: parseInt(stats.total),
              pendingTasks: parseInt(stats.pending),
              inProgressTasks: parseInt(stats.in_progress),
              completedTasks: parseInt(stats.completed),
              cancelledTasks: parseInt(stats.cancelled),
              tasksByPriority: {
                low: parseInt(stats.low),
                medium: parseInt(stats.medium),
                high: parseInt(stats.high),
                urgent: parseInt(stats.urgent),
              },
            };
          },
          cacheTTL.stats
        );
      } catch (error) {
        console.error("Error fetch all tasks stats: ", error);
        throw error;
      }
    },
  },

  Task: {
    assignedUser: async (parent, _, context) => {
      if (!parent.assigned_to) return null;

      return context.loaders.userLoader.load(parent.assigned_to);
    },
    creator: async (parent, _, context) => {
      if (!parent.created_by) return null;

      return context.loaders.userLoader.load(parent.created_by);
    },
    comments: async (parent, _, context) => {
      return context.loaders.commentsByTaskLoader.load(parent.id);
    },
    commentCount: async (parent, _, context) => {
      const comments = await context.loaders.commentsByTaskLoader.load(
        parent.id
      );
      return comments.length;
    },
  },

  Mutation: {
    createTask: async (_, { input }, context) => {
      try {
        requireAuth(context);

        const { title, description, status, priority, assigned_to } = input;

        const user = await context.db.query(
          "SELECT id FROM users WHERE id = $1",
          [assigned_to]
        );

        if (user.rows.length === 0) {
          throw new Error("Invalid id, user not found!");
        }

        const result = await context.db.query(
          `INSERT INTO tasks (title, description, status, priority, assigned_to, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, title, description, status, priority, assigned_to, created_by, created_at, updated_at`,
          [
            title,
            description,
            status || "PENDING",
            priority || "MEDIUM",
            assigned_to,
            context.user.id,
          ]
        );

        // invalidate affected caches
        await invalidateCachePattern(getCacheKey(cachePrefix.tasksList, "*"));
        await invalidateCachePattern(
          getCacheKey(cachePrefix.myTasks, assigned_to, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByCreator, context.user.id)
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByCreator, context.user.id, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByAssignee, assigned_to)
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByStatus, status || "PENDING", "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByPriority, priority || "MEDIUM", "*")
        );
        await invalidateCachePattern(
          getCacheKey(
            cachePrefix.tasksByAssignee,
            cachePrefix.stats,
            assigned_to
          )
        );
        getCacheKey(cachePrefix.tasksList, cachePrefix.stats);

        return result.rows[0];
      } catch (error) {
        console.error("Error create task: ", error);
        throw error;
      }
    },

    updateTask: async (_, { id, input }, context) => {
      try {
        requireAuth(context);

        const oldTaskResult = await context.db.query(
          "SELECT status, priority, assigned_to, created_by FROM tasks WHERE id = $1",
          [id]
        );

        if (oldTaskResult.rows.length === 0) throw new Error("Task not found!");

        const oldTask = oldTaskResult.rows[0];

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (input.title) {
          updates.push(`title = $${paramCount}`);
          values.push(input.title);
          paramCount++;
        }

        if (input.description) {
          updates.push(`description = $${paramCount}`);
          values.push(input.description);
          paramCount++;
        }

        if (input.status) {
          updates.push(`status = $${paramCount}`);
          values.push(input.status);
          paramCount++;
        }

        if (input.priority) {
          updates.push(`priority = $${paramCount}`);
          values.push(input.priority);
          paramCount++;
        }

        if (input.assigned_to) {
          updates.push(`assigned_to = $${paramCount}`);
          values.push(input.assigned_to);
          paramCount++;
        }

        if (updates.length === 0) {
          throw new Error("No fields to update");
        }

        updates.push("updated_at = NOW()");

        values.push(id);

        const result = await context.db.query(
          `UPDATE tasks
           SET ${updates.join(", ")}
           WHERE id = $${paramCount}
           RETURNING id, title, description, status, priority, assigned_to, created_by, created_at, updated_at`,
          values
        );

        const keysToInvalidate = [getCacheKey(cachePrefix.task, id)];

        await invalidateMultiple(keysToInvalidate);
        await invalidateCachePattern(
          getCacheKey(cachePrefix.myTasks, oldTask.assigned_to, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByCreator, oldTask.created_by)
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByCreator, oldTask.created_by, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByAssignee, oldTask.assigned_to)
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.commentsByTask, id)
        );
        await invalidateCachePattern(
          getCacheKey(
            cachePrefix.tasksByAssignee,
            cachePrefix.stats,
            oldTask.assigned_to
          )
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksList, cachePrefix.stats)
        );

        if (input.assigned_to && input.assigned_to !== oldTask.assigned_to) {
          await invalidateCachePattern(
            getCacheKey(cachePrefix.myTasks, input.assigned_to, "*")
          );
          await invalidateCachePattern(
            getCacheKey(cachePrefix.tasksByAssignee, input.assigned_to)
          );
          await invalidateCachePattern(
            getCacheKey(
              cachePrefix.tasksByAssignee,
              cachePrefix.stats,
              input.assigned_to
            )
          );
        }

        if (input.status && input.status !== oldTask.status) {
          await invalidateCachePattern(
            getCacheKey(cachePrefix.tasksByStatus, input.status, "*")
          );
          await invalidateCachePattern(
            getCacheKey(cachePrefix.tasksByStatus, oldTask.status, "*")
          );
        }

        if (input.priority && input.priority !== oldTask.priority) {
          await invalidateCachePattern(
            getCacheKey(cachePrefix.tasksByPriority, input.priority, "*")
          );
          await invalidateCachePattern(
            getCacheKey(cachePrefix.tasksByPriority, oldTask.priority, "*")
          );
        }

        return result.rows[0];
      } catch (error) {
        console.error("Error update task: ", error);
        throw error;
      }
    },

    deleteTask: async (_, { id }, context) => {
      try {
        requireAuth(context);

        const taskResult = await context.db.query(
          `SELECT assigned_to, created_by
           FROM tasks
           WHERE id = $1`,
          [id]
        );

        if (taskResult.rows.length === 0) {
          return {
            success: false,
            message: "Task not found!",
          };
        }

        const task = taskResult.rows[0];

        if (
          task.assigned_to !== context.user.id &&
          task.created_by !== context.user.id
        ) {
          return {
            success: false,
            message: "Unauthorized to delete this task!",
          };
        }

        await context.db.query("DELETE FROM tasks WHERE id = $1", [id]);

        // invalidate cache
        await invalidateMultiple([getCacheKey(cachePrefix.task, id)]);
        await invalidateCachePattern(getCacheKey(cachePrefix.tasksList, "*"));
        await invalidateCachePattern(
          getCacheKey(cachePrefix.myTasks, task.assigned_to, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByCreator, task.created_by)
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByCreator, task.created_by, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByAssignee, task.assigned_to)
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByPriority, task.priority, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByStatus, task.status, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.commentsByTask, id)
        );
        await invalidateCachePattern(
          getCacheKey(
            cachePrefix.tasksByAssignee,
            cachePrefix.stats,
            task.assigned_to
          )
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksList, cachePrefix.stats)
        );

        return {
          success: true,
          message: "Task deleted successfully!",
        };
      } catch (error) {
        console.error("Error delete task: ", error);
        throw error;
      }
    },

    assignTask: async (_, { taskId, userId }, context) => {
      try {
        requireAuth(context);

        const oldTaskResult = await db.query(
          "SELECT status, priority ,assigned_to FROM tasks WHERE id = $1",
          [taskId]
        );

        if (oldTaskResult.rows.length === 0) {
          throw new Error("Task not found");
        }

        const oldTask = oldTaskResult.rows[0];

        const result = await context.db.query(
          `UPDATE tasks
           SET assigned_to = $1, updated_at = NOW()
           WHERE id = $2
           RETURNING id, title, description, status, priority, assigned_to, created_by, created_at, updated_at`,
          [userId, taskId]
        );

        // invalidate caches
        await invalidateMultiple([getCacheKey(cachePrefix.task, taskId)]);
        await invalidateCachePattern(getCacheKey(cachePrefix.tasksList, "*"));
        await invalidateCachePattern(
          getCacheKey(cachePrefix.myTasks, oldTask.assigned_to, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.myTasks, userId, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByAssignee, oldTask.assigned_to)
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByAssignee, userId)
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByPriority, oldTask.priority, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByStatus, oldTask.status, "*")
        );
        await invalidateCachePattern(
          getCacheKey(
            cachePrefix.tasksByAssignee,
            cachePrefix.stats,
            oldTask.assigned_to
          )
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByAssignee, cachePrefix.stats, userId)
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksList, cachePrefix.stats)
        );

        return result.rows[0];
      } catch (error) {
        console.error("Error assign task: ", error);
        throw error;
      }
    },

    changeTaskStatus: async (_, { taskId, status }, context) => {
      try {
        requireAuth(context);

        const taskResult = await db.query(
          "SELECT assigned_to, created_by FROM tasks WHERE id = $1",
          [taskId]
        );

        if (taskResult.rows.length === 0) {
          throw new Error("Task not found");
        }

        const task = taskResult.rows[0];

        const result = await context.db.query(
          `UPDATE tasks
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, title, description, status, priority, assigned_to, created_by, created_at, updated_at`,
          [status, taskId]
        );

        // invalidate cache
        await invalidateMultiple([getCacheKey(cachePrefix.task, taskId)]);
        await invalidateCachePattern(getCacheKey(cachePrefix.tasksList, "*"));
        await invalidateCachePattern(
          getCacheKey(cachePrefix.myTasks, task.assigned_to, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByCreator, task.created_by)
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByCreator, task.created_by, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByAssignee, task.assigned_to)
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByStatus, task.status, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByStatus, status, "*")
        );
        await invalidateCachePattern(
          getCacheKey(
            cachePrefix.tasksByAssignee,
            cachePrefix.stats,
            task.assigned_to
          )
        );
        await invalidateCachePattern(
          getCacheKey(
            cachePrefix.tasksByAssignee,
            cachePrefix.stats,
            task.created_by
          )
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksList, cachePrefix.stats)
        );

        return result.rows[0];
      } catch (error) {
        console.error("Error change task's status: ", error);
        throw error;
      }
    },
  },
};

import { requireAuth } from "../../utils/auth.js";

export const taskResolvers = {
  Query: {
    getAllTasks: async (_, { filter, pagination }, context) => {
      try {
        requireAuth(context);

        const limit = pagination?.limit || 10;
        const offset = ((pagination?.page || 1) - 1) * limit;

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
      } catch (error) {
        console.error("Error fetch all tasks: ", error);
        throw error;
      }
    },

    getTask: async (_, { id }, context) => {
      try {
        requireAuth(context);

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

        const result = await context.db.query(
          `SELECT id, title, description, status, priority,
                assigned_to, created_by, created_at, updated_at
         FROM tasks
         WHERE status = $1
         LIMIT $2 OFFSET $3`,
          [status, limit, offset]
        );

        return result.rows;
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

        const result = await context.db.query(
          `SELECT id, title, description, status, priority,
                assigned_to, created_by, created_at, updated_at
         FROM tasks
         WHERE priority = $1
         LIMIT $2 OFFSET $3`,
          [priority, limit, offset]
        );

        return result.rows;
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
      } catch (error) {
        console.error("Error fetch task by user: ", error);
        throw error;
      }
    },
    getTaskStats: async (_, __, context) => {
      try {
        requireAuth(context);

        const userId = context.user.id;

        const result = await context.db.query(
          `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
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

        const result = await context.db.query(
          `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
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

        const result = await context.db.query(
          `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
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
      const result = await context.db.query(
        "SELECT COUNT(*) as count FROM comments WHERE task_id = $1",
        [parent.id]
      );

      return parseInt(result.rows[0].count);
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

        return result.rows[0];
      } catch (error) {
        console.error("Error create task: ", error);
        throw error;
      }
    },

    updateTask: async (_, { id, input }, context) => {
      try {
        requireAuth(context);

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

        if (result.rows.length === 0) {
          throw new Error("Task not found!");
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

        const task = await context.db.query(
          `SELECT assigned_to, created_by
         FROM tasks
         WHERE id = $1`,
          [id]
        );

        if (
          task.rows[0].assigned_to !== context.user.id &&
          task.rows[0].created_by !== context.user.id
        ) {
          return {
            success: false,
            message: "Unauthorized to delete this task!",
          };
        }

        const result = await context.db.query(
          "DELETE FROM tasks WHERE id = $1 RETURNING id",
          [id]
        );

        if (result.rows.length === 0) {
          return {
            success: false,
            message: "Task not found!",
          };
        }

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

        const result = await context.db.query(
          `UPDATE tasks
         SET assigned_to = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, title, description, status, priority, assigned_to, created_by, created_at, updated_at`,
          [userId, taskId]
        );

        if (result.rows.length === 0) {
          throw new Error("Task not found!");
        }

        return result.rows[0];
      } catch (error) {
        console.error("Error assign task: ", error);
        throw error;
      }
    },

    changeTaskStatus: async (_, { taskId, status }, context) => {
      try {
        requireAuth(context);

        const result = await context.db.query(
          `UPDATE tasks
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, title, description, status, priority, assigned_to, created_by, created_at, updated_at`,
          [status, taskId]
        );

        if (result.rows.length === 0) {
          throw new Error("Task not found!");
        }

        return result.rows[0];
      } catch (error) {
        console.error("Error change task's status: ", error);
        throw error;
      }
    },
  },
};

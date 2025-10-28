import { requireAuth } from "../../utils/auth.js";

export const commentResolvers = {
  Query: {
    getAllComments: async (_, { pagination }, context) => {
      try {
        requireAuth(context);

        const limit = pagination?.limit || 10;
        const offset = ((pagination?.page || 1) - 1) * limit;

        const result = await context.db.query(
          `SELECT id, task_id, user_id, text, created_at
         FROM comments
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
          [limit, offset]
        );

        return result.rows;
      } catch (error) {
        console.error("Error fetch all comments: ", error);
        throw error;
      }
    },

    getComment: async (_, { id }, context) => {
      try {
        requireAuth(context);

        const result = await context.db.query(
          `SELECT id, task_id, user_id, text, created_at
         FROM comments
         WHERE id = $1`,
          [id]
        );

        if (result.rows.length === 0) {
          throw new Error("Commen not found!");
        }

        return result.rows[0];
      } catch (error) {
        console.error("Error fetch comment: ", error);
        throw error;
      }
    },

    getCommentsByTask: async (_, { taskId, pagination }, context) => {
      try {
        requireAuth(context);

        const limit = pagination?.limit || 10;
        const offset = ((pagination?.page || 1) - 1) * limit;

        const result = await context.db.query(
          `SELECT id, task_id, user_id, text, created_at
         FROM comments
         WHERE task_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
          [taskId, limit, offset]
        );

        if (result.rows.length === 0) {
          throw new Error("Comment not found!");
        }

        return result.rows;
      } catch (error) {
        console.error("Error fetch comment by task: ", error);
        throw error;
      }
    },

    getCommentsByUser: async (_, { userId, pagination }, context) => {
      try {
        requireAuth(context);

        const limit = pagination?.limit || 10;
        const offset = ((pagination?.page || 1) - 1) * limit;

        const result = await context.db.query(
          `SELECT id, task_id, user_id, text, created_at
         FROM comments
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
          [userId, limit, offset]
        );

        if (result.rows.length === 0) {
          throw new Error("Comment not found!");
        }

        return result.rows;
      } catch (error) {
        console.error("Error fetch comment by user: ", error);
        throw error;
      }
    },
  },

  Comment: {
    user: async (parent, _, context) => {
      return context.loaders.userLoader.load(parent.user_id);
    },
    task: async (parent, _, context) => {
      return context.loaders.taskLoader.load(parent.task_id);
    },
  },

  Mutation: {
    createComment: async (_, { input }, context) => {
      try {
        requireAuth(context);

        const { task_id, text } = input;

        const result = await context.db.query(
          `INSERT INTO comments (task_id, user_id, text)
         VALUES ($1, $2, $3)
         RETURNING id, task_id, user_id, text, created_at`,
          [task_id, context.user.id, text]
        );

        return result.rows[0];
      } catch (error) {
        console.error("Error create comment: ", error);
        throw error;
      }
    },

    updateComment: async (_, { id, input }, context) => {
      try {
        requireAuth(context);

        const { text } = input;

        const comment = await context.db.query(
          "SELECT user_id FROM comments WHERE id = $1",
          [id]
        );

        if (comment.rows.length === 0) {
          throw new Error("Comment not found!");
        }

        if (comment.rows[0].user_id !== context.user.id) {
          throw new Error("Unauthorized to update this comment!");
        }

        const result = await context.db.query(
          `UPDATE comments
         SET text = $1
         WHERE id = $2
         RETURNING id, task_id, user_id, text, created_at`,
          [text, id]
        );

        return result.rows[0];
      } catch (error) {
        console.error("Error update comment: ", error);
        throw error;
      }
    },

    deleteComment: async (_, { id }, context) => {
      try {
        requireAuth(context);

        const comment = await context.db.query(
          "SELECT user_id FROM comments WHERE id = $1",
          [id]
        );

        if (comment.rows.length === 0) {
          return {
            success: false,
            message: "Comment not found!",
          };
        }

        if (comment.rows[0].user_id !== context.user.id) {
          return {
            success: false,
            message: "Unauthorized to delete this comment!",
          };
        }

        await context.db.query("DELETE FROM comments WHERE id = $1", [id]);

        return {
          success: true,
          message: "Comment deleted successfully!",
        };
      } catch (error) {
        console.error("Error delete comment: ", error);
        throw error;
      }
    },
  },
};

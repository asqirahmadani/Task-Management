import { publishEvent, SUBSCRIPTION_EVENTS } from "../../config/pubsub.js";
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

export const commentResolvers = {
  Query: {
    getAllComments: async (_, { pagination }, context) => {
      try {
        requireAuth(context);

        const limit = pagination?.limit || 10;
        const offset = ((pagination?.page || 1) - 1) * limit;

        const cacheKey = getCacheKey(
          cachePrefix.commentsList,
          `page:${pagination?.page || 1}`,
          `limit:${limit}`
        );

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT id, task_id, user_id, text, created_at
               FROM comments
               ORDER BY created_at DESC 
               LIMIT $1 OFFSET $2`,
              [limit, offset]
            );

            return result.rows;
          },
          cacheTTL.list
        );
      } catch (error) {
        console.error("Error fetch all comments: ", error);
        throw error;
      }
    },

    getComment: async (_, { id }, context) => {
      try {
        requireAuth(context);

        const cacheKey = getCacheKey(cachePrefix.comment, id);

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT id, task_id, user_id, text, created_at
               FROM comments
               WHERE id = $1`,
              [id]
            );

            if (result.rows.length === 0) {
              throw new Error("Comment not found!");
            }

            return result.rows[0];
          },
          cacheTTL.comment
        );
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

        const cacheKey = getCacheKey(
          cachePrefix.commentsByTask,
          taskId,
          `page:${pagination?.page || 1}`,
          `limit:${limit}`
        );

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT id, task_id, user_id, text, created_at
               FROM comments
               WHERE task_id = $1
               ORDER BY created_at DESC
               LIMIT $2 OFFSET $3`,
              [taskId, limit, offset]
            );

            return result.rows;
          },
          cacheTTL.list
        );
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

        const cacheKey = getCacheKey(
          cachePrefix.commentsByUser,
          userId,
          `page:${pagination?.page || 1}`,
          `limit:${limit}`
        );

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT id, task_id, user_id, text, created_at
               FROM comments
               WHERE user_id = $1
               ORDER BY created_at DESC
               LIMIT $2 OFFSET $3`,
              [userId, limit, offset]
            );

            return result.rows;
          },
          cacheTTL.list
        );
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

        const newComment = result.rows[0];

        // invalidate cache
        await invalidateCachePattern(
          getCacheKey(cachePrefix.commentsList, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.commentsByTask, task_id, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.commentsByUser, context.user.id, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.comment, cachePrefix.user, context.user.id)
        );

        // Publish Event: Comment Added
        await publishEvent(SUBSCRIPTION_EVENTS.COMMENT_ADDED, {
          comment: newComment,
          addedBy: context.user,
        });

        const taskResult = await context.db.query(
          "SELECT title, created_by, assigned_to FROM tasks WHERE id = $1",
          [task_id]
        );

        if (taskResult.rows.length > 0) {
          const task = taskResult.rows[0];

          // Send notification
          if (task.created_by !== context.user.id) {
            await publishEvent(SUBSCRIPTION_EVENTS.NOTIFICATION_SENT, {
              notification: {
                id: `notif-${Date.now()}`,
                userId: task.created_by,
                type: "COMMENT_ADDED",
                title: "New Comment",
                message: `${context.user.name} commented on: ${task.title}`,
                relatedComment: newComment,
                createdAt: new Date().toISOString(),
                read: false,
              },
            });
          }

          if (
            task.assigned_to &&
            task.assigned_to !== context.user.id &&
            task.assigned_to !== task.created_by
          ) {
            await publishEvent(SUBSCRIPTION_EVENTS.NOTIFICATION_SENT, {
              notification: {
                id: `notif-${Date.now()}-2`,
                userId: task.assigned_to,
                type: "COMMENT_ADDED",
                title: "New Comment",
                message: `${context.user.name} commented on: ${task.title}`,
                relatedComment: newComment,
                createdAt: new Date().toISOString(),
                read: false,
              },
            });
          }
        }

        console.log(`Published: COMMENT_ADDED (task: ${task_id})`);

        return newComment;
      } catch (error) {
        console.error("Error create comment: ", error);
        throw error;
      }
    },

    updateComment: async (_, { id, input }, context) => {
      try {
        requireAuth(context);

        const { text } = input;

        const checkResult = await context.db.query(
          "SELECT task_id, user_id FROM comments WHERE id = $1",
          [id]
        );

        if (checkResult.rows.length === 0) {
          throw new Error("Comment not found!");
        }

        const comment = checkResult.rows[0];

        if (comment.user_id !== context.user.id) {
          throw new Error("Unauthorized to update this comment!");
        }

        const result = await context.db.query(
          `UPDATE comments
         SET text = $1
         WHERE id = $2
         RETURNING id, task_id, user_id, text, created_at`,
          [text, id]
        );

        const updatedComment = result.rows[0];

        // invalidate cache
        await invalidateMultiple([getCacheKey(cachePrefix.comment, id)]);
        await invalidateCachePattern(
          getCacheKey(cachePrefix.commentsList, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.commentsByTask, comment.task_id, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.commentsByUser, context.user.id, "*")
        );

        // Publish Event: Comment Updated
        await publishEvent(SUBSCRIPTION_EVENTS.COMMENT_UPDATED, {
          comment: updatedComment,
          updatedBy: context.user,
        });

        console.log(`Published: COMMENT_UPDATED (id: ${id})`);

        return updatedComment;
      } catch (error) {
        console.error("Error update comment: ", error);
        throw error;
      }
    },

    deleteComment: async (_, { id }, context) => {
      try {
        requireAuth(context);

        const checkResult = await db.query(
          "SELECT task_id, user_id FROM comments WHERE id = $1",
          [id]
        );

        if (checkResult.rows.length === 0) {
          return {
            success: false,
            message: "Comment not found",
          };
        }

        const comment = checkResult.rows[0];

        if (comment.user_id !== context.user.id) {
          throw new Error("Not authorized to delete this comment");
        }

        // Delete
        await db.query("DELETE FROM comments WHERE id = $1", [id]);

        // Invalidate affected caches
        await invalidateMultiple([getCacheKey(cachePrefix.comment, id)]);
        await invalidateCachePattern(
          getCacheKey(cachePrefix.commentsList, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.commentsByTask, comment.task_id, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.commentsByUser, comment.user_id, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.comment, cachePrefix.user, comment.user.id)
        );

        // Publish Event: Comment Deleted
        await publishEvent(SUBSCRIPTION_EVENTS.COMMENT_DELETED, {
          commentId: id,
          taskId: comment.task_id,
          deletedBy: context.user,
          deletedAt: new Date().toISOString(),
        });

        console.log(`Published: COMMENT_DELETED (id: ${id})`);

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

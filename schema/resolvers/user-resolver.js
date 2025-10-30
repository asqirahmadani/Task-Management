import { publishEvent, SUBSCRIPTION_EVENTS } from "../../config/pubsub.js";
import { requireAuth } from "../../utils/auth.js";
import bcrypt from "bcryptjs";
import {
  cacheAside,
  invalidateCache,
  invalidateCachePattern,
} from "../../utils/redis.js";
import {
  cacheTTL,
  cachePrefix,
  getCacheKey,
} from "../../config/cache-config.js";

export const userResolvers = {
  Query: {
    getUser: async (_, { id }, context) => {
      try {
        requireAuth(context);

        const cacheKey = getCacheKey(cachePrefix.user, id);

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              "SELECT id, name, email, created_at FROM users WHERE id = $1",
              [id]
            );

            const user = result.rows[0];
            if (!user) {
              throw new Error("User not found!");
            }

            return user;
          },
          cacheTTL.user
        );
      } catch (error) {
        console.error("Error fetch user: ", error);
        throw error;
      }
    },

    getAllUsers: async (_, { pagination }, context) => {
      try {
        requireAuth(context);

        const limit = pagination?.limit || 10;
        const offset = ((pagination?.page || 1) - 1) * limit;

        const cacheKey = getCacheKey(
          cachePrefix.usersList,
          `page:${pagination?.page || 1}`,
          `limit:${limit}`
        );

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT id, name, email, created_at
               FROM users
               ORDER BY created_at DESC
               LIMIT $1 OFFSET $2`,
              [limit, offset]
            );

            return result.rows;
          },
          cacheTTL.list
        );
      } catch (error) {
        console.error("Error fetch all users: ", error);
        throw error;
      }
    },

    searchUsers: async (_, { name, pagination }, context) => {
      try {
        requireAuth(context);

        const limit = pagination?.limit || 10;
        const offset = ((pagination?.page || 1) - 1) * limit;

        const cacheKey = getCacheKey(
          cachePrefix.usersList,
          cachePrefix.search,
          `page:${pagination?.page || 1}`,
          `limit:${limit}`
        );

        return cacheAside(
          cacheKey,
          async () => {
            const result = await context.db.query(
              `SELECT id, name, email, created_at
               FROM users
               WHERE name ILIKE $1
               LIMIT $2 OFFSET $3`,
              [`%${name}%`, limit, offset]
            );

            return result.rows;
          },
          cacheTTL.search
        );
      } catch (error) {
        console.error("Error search users: ", error);
        throw error;
      }
    },
  },

  User: {
    createdTasks: async (parent, _, context) => {
      return context.loaders.tasksByCreatorLoader.load(parent.id);
    },

    assignedTasks: async (parent, _, context) => {
      return context.loaders.tasksByAssigneeLoader.load(parent.id);
    },

    comments: async (parent, _, context) => {
      return context.loaders.commentsByUserLoader.load(parent.id);
    },
  },

  Mutation: {
    updateUserProfile: async (_, { input }, context) => {
      try {
        requireAuth(context);

        const { name, email } = input;
        const userId = context.user.id;

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name) {
          updates.push(`name = $${paramCount}`);
          values.push(name);
          paramCount++;
        }

        if (email) {
          updates.push(`email = $${paramCount}`);
          values.push(email);
          paramCount++;
        }

        values.push(userId);
        const result = await context.db.query(
          `UPDATE users
         SET ${updates.join(", ")}
         WHERE id = $${paramCount}
         RETURNING id, name, email, created_at`,
          values
        );

        const updatedUser = result.rows[0];

        // invalidate affected caches
        await invalidateCache(getCacheKey(cachePrefix.user, userId));
        await invalidateCachePattern(getCacheKey(cachePrefix.usersList, "*"));
        await invalidateCachePattern(
          getCacheKey(cachePrefix.usersList, cachePrefix.search, "*")
        );

        return updatedUser;
      } catch (error) {
        console.error("Error update user profile: ", error);
        throw error;
      }
    },

    changePassword: async (_, { input }, context) => {
      try {
        requireAuth(context);

        const { oldPassword, newPassword } = input;
        const userId = context.user.id;

        const userResult = await context.db.query(
          "SELECT password_hash FROM users WHERE id = $1",
          [userId]
        );

        const user = userResult.rows[0];

        const validPassword = await bcrypt.compare(
          oldPassword,
          user.password_hash
        );

        if (!validPassword) {
          throw new Error("Invalid old password, please try again!");
        }

        const newHashPassword = await bcrypt.hash(newPassword, 12);
        await context.db.query(
          "UPDATE users SET password_hash = $1 WHERE id = $2",
          [newHashPassword, userId]
        );

        return {
          success: true,
          message: "Password changed successfully!",
        };
      } catch (error) {
        console.error("Error change password: ", error);
        throw error;
      }
    },

    deleteUser: async (_, { id }, context) => {
      try {
        requireAuth(context);

        if (context.user.id !== id) {
          throw new Error("Not authorized to delete this user!");
        }

        const result = await context.db.query(
          "DELETE FROM users WHERE id = $1 RETURNING id",
          [id]
        );

        if (result.rows.length === 0) {
          return {
            success: false,
            message: "User not found!",
          };
        }

        // invalidate all related caches
        await invalidateCache(getCacheKey(cachePrefix.user, id));
        await invalidateCachePattern(getCacheKey(cachePrefix.usersList, "*"));
        await invalidateCachePattern(
          getCacheKey(cachePrefix.usersList, cachePrefix.search, "*")
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByCreator, id)
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.tasksByAssignee, id)
        );
        await invalidateCachePattern(
          getCacheKey(cachePrefix.commentsByUser, id)
        );

        return {
          success: true,
          message: "User deleted successfully!",
        };
      } catch (error) {
        console.error("Error delete user: ", error);
        throw error;
      }
    },

    setTypingIndicator: async (_, { taskId, isTyping }, context) => {
      requireAuth(context);

      // Publish Event: User Typing
      await publishEvent(SUBSCRIPTION_EVENTS.USER_TYPING, {
        user: {
          id: context.user.id,
          name: context.user.name,
        },
        taskId,
        isTyping,
      });

      console.log(
        `Published: USER_TYPING (user: ${context.user.name}, isTyping: ${isTyping})`
      );

      return true;
    },
  },
};

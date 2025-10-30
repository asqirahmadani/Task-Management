import { generateToken, requireAuth } from "../../utils/auth.js";
import { cacheAside } from "../../utils/redis.js";
import bcrypt from "bcryptjs";
import {
  getCacheKey,
  cachePrefix,
  cacheTTL,
} from "../../config/cache-config.js";

export const authResolvers = {
  Query: {
    me: async (_, __, context) => {
      requireAuth(context);

      const cacheKey = getCacheKey(cachePrefix.user, context.user.id);

      return cacheAside(
        cacheKey,
        async () => {
          const result = await context.db.query(
            "SELECT id, name, email, created_at FROM users WHERE id = $1",
            [context.user.id]
          );

          const user = result.rows[0];

          if (!user) {
            throw new Error("User not found!");
          }

          return user;
        },
        cacheTTL.user
      );
    },
  },

  Mutation: {
    register: async (_, { input }, context) => {
      const { name, email, password } = input;

      const existingRows = await context.db.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (existingRows.rows.length > 0) {
        throw new Error("Email already registered!");
      }

      const hashPassword = await bcrypt.hash(password, 12);

      const insertResult = await context.db.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, created_at`,
        [name, email, hashPassword]
      );

      const newUser = insertResult.rows[0];

      const token = generateToken({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      });

      return {
        token,
        user: newUser,
      };
    },

    login: async (_, { email, password }, context) => {
      const result = await context.db.query(
        "SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1",
        [email]
      );

      const user = result.rows[0];

      if (!user) {
        throw new Error("Invalid email or password!");
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        throw new Error("Invalid email or password!");
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        name: user.name,
      });

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.created_at,
        },
      };
    },
  },
};

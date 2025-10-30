import { startStandaloneServer } from "@apollo/server/standalone";
import { authMiddleware } from "./middleware/auth-middleware.js";
import { createLoaders } from "./utils/dataLoader.js";
import resolvers from "./schema/resolvers/index.js";
import typeDefs from "./schema/typeDefs/index.js";
import { ApolloServer } from "@apollo/server";
import pool from "./config/database.js";
import redis from "./config/redis.js";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,

  plugins: [
    {
      async requestDidStart(requestContext) {
        const startTime = Date.now();
        const operationName =
          requestContext.request.operationName || "Anonymous";

        console.log("\n" + "=".repeat(80));
        console.log(`GraphQL Request: ${operationName}`);
        console.log("=".repeat(80));

        return {
          async parsingDidStart() {
            console.log("Parsing query...");
          },

          async validationDidStart() {
            console.log("Validating query...");
          },

          async executionDidStart() {
            console.log("Executing query...\n");

            requestContext.contextValue.db.resetQueryTracking();
          },

          async willSendResponse(responseContext) {
            const duration = Date.now() - startTime;
            const stats = responseContext.contextValue.db.getQueryStats();

            console.log("\n" + "-".repeat(80));
            console.log("REQUEST SUMMARY");
            console.log("-".repeat(80));
            console.log(`Duration: ${duration}ms`);
            console.log(`Queries: ${stats.count}`);

            if (stats.count > 0) {
              console.log(
                `⚡ Avg/query: ${(duration / stats.count).toFixed(2)}ms`
              );
            }

            if (responseContext.errors?.length > 0) {
              console.log(`Errors: ${responseContext.errors.length}`);
              responseContext.errors.forEach((error, i) => {
                console.log(`   ${i + 1}. ${error.message}`);
              });
            }

            if (stats.count > 10) {
              console.log("\nHigh query count! Consider DataLoader.");
            }

            if (duration > 1000) {
              console.log("\nSlow request (>1s)");
            }

            console.log("=".repeat(80) + "\n");
          },
        };
      },
    },
  ],
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 3000 },

  context: async ({ req }) => {
    try {
      const auth = await authMiddleware(req);

      const loaders = createLoaders(pool);

      return {
        db: pool,
        redis,
        isAuth: auth.isAuth,
        user: auth.user,
        loaders,
      };
    } catch (error) {
      console.error("Context creation error:", error.message);

      return {
        db: pool,
        redis,
        isAuth: false,
        user: null,
        loaders: createLoaders(pool),
      };
    }
  },
});

console.log(`🚀 Server ready at: ${url}`);
console.log(`📊 PostgreSQL connected`);
console.log(`💾 Redis connected`);

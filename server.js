import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { startStandaloneServer } from "@apollo/server/standalone";
import { expressMiddleware } from "@as-integrations/express4";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServer } from "@apollo/server";
import { useServer } from "graphql-ws/use/ws";
import { WebSocketServer } from "ws";
import bodyParser from "body-parser";
import { createServer } from "http";
import express from "express";
import helmet from "helmet";
import cors from "cors";

import { authMiddleware } from "./middleware/auth-middleware.js";
import { rateLimitPlugin } from "./utils/rateLimiter.js";
import { createLoaders } from "./utils/dataLoader.js";
import resolvers from "./schema/resolvers/index.js";
import typeDefs from "./schema/typeDefs/index.js";
import pool from "./config/database.js";
import redis from "./config/redis.js";
import {
  depthLimitRule,
  complexityLimitRule,
} from "./middleware/security-middleware.js";

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const app = express();
const httpServer = createServer(app);

const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

const serverCleanUp = useServer(
  {
    schema,

    context: async (ctx) => {
      const token = ctx.connectionParams.Authorization || "";
      const auth = await authMiddleware({
        headers: { authorization: token },
      });
      console.log(auth);

      return {
        redis,
        db: pool,
        user: auth.user,
        isAuth: auth.isAuth,
        loaders: createLoaders(pool),
      };
    },

    onConnect: async (ctx) => {
      console.log("WebSocket client connected");
    },

    onDisconnect: async (ctx) => {
      console.log("WebSocket client disconnected");
    },

    onSubscribe: async (ctx, msg) => {
      const operationName = ctx.operationName || "Anonymous";
      console.log(`📡 Subscription: ${operationName}`);
    },

    onComplete: async (ctx, msg) => {
      console.log("Subscription completed");
    },

    onError: async (ctx, msg, errors) => {
      console.error("Subscription error:", errors);
    },
  },
  wsServer
);

const server = new ApolloServer({
  schema,

  validationRules: [depthLimitRule, complexityLimitRule],

  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),

    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanUp.dispose();
          },
        };
      },
    },

    {
      async requestDidStart(requestContext) {
        const startTime = Date.now();

        let operationName = requestContext.request.operationName;

        if (!operationName && requestContext.request.query) {
          const match = requestContext.request.query.match(
            /(?:query|mutation|subscription)\s+(\w+)/
          );
          operationName = match ? match[1] : "Anonymous";
        }

        operationName = operationName || "Anonymous";

        if (operationName === "IntrospectionQuery") {
          return {};
        }

        console.log("\n" + "=".repeat(80));
        console.log(`GraphQL Request: ${operationName}`);
        console.log("=".repeat(80));

        return {
          async executionDidStart() {
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
                `Avg/query: ${(duration / stats.count).toFixed(2)}ms`
              );
            }

            if (responseContext.errors?.length > 0) {
              console.log(`Errors: ${responseContext.errors.length}`);
              responseContext.errors.forEach((error, i) => {
                console.log(`   ${i + 1}. ${error.message}`);
              });
            }

            console.log("=".repeat(80) + "\n");
          },
        };
      },
    },

    rateLimitPlugin,
  ],
});

await server.start();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    // Allowed origins
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://yourdomain.com",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  maxAge: 86400, // 24 hours
};

app.use(
  "/graphql",
  cors(corsOptions),
  bodyParser.json(),
  expressMiddleware(server, {
    context: async ({ req }) => {
      const auth = await authMiddleware(req);

      return {
        redis,
        db: pool,
        user: auth.user,
        isAuth: auth.isAuth,
        loaders: createLoaders(pool),
      };
    },
  })
);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 SERVER STARTED");
  console.log("=".repeat(80));
  console.log(`📡 HTTP Server:      http://localhost:${PORT}/graphql`);
  console.log(`🔌 WebSocket Server: ws://localhost:${PORT}/graphql`);
  console.log(`📊 PostgreSQL:       Connected`);
  console.log(`💾 Redis:            Connected`);
  console.log("=".repeat(80) + "\n");
});

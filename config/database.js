import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
});

// ==========================================
// QUERY TRACKING SETUP
// ==========================================

pool.queries = [];
pool.queryCount = 0;

const originalQuery = pool.query.bind(pool);

const ENABLE_QUERY_LOGGING = process.env.ENABLE_QUERY_LOGGING === "true";

pool.query = function (...args) {
  pool.queryCount++;

  const queryText = typeof args[0] === "string" ? args[0] : args[0].text;

  const queryInfo = {
    number: pool.queryCount,
    text: queryText,
    timestamp: Date.now(),
  };

  pool.queries.push(queryInfo);

  if (ENABLE_QUERY_LOGGING) {
    console.log(
      `🔍 Query #${pool.queryCount}: ${queryText.substring(0, 60)}...`
    );
  }

  return originalQuery(...args);
};

pool.resetQueryTracking = () => {
  pool.queries = [];
  pool.queryCount = 0;
};

pool.getQueryStats = () => {
  return {
    count: pool.queryCount,
    queries: pool.queries,
  };
};

// ==========================================
// POOL EVENT HANDLERS
// ==========================================

const isDevelopment = process.env.NODE_ENV !== "production";

pool.on("error", (err, client) => {
  console.error("❌ Database pool error:", err.message);
  console.error("Error code:", err.code);
  console.error("Full error:", err);
});

if (isDevelopment) {
  pool.on("connect", () => {
    console.log("✅ Database connected");
  });
}

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️  ${signal} received, closing database pool...`);
  try {
    await pool.end();
    console.log("✅ Database pool closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error closing pool:", error.message);
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

export default pool;

import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const testSimplePool = async () => {
  console.log("🔍 Testing with minimal Pool config...\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log("Connecting...");

    const client = await pool.connect();
    console.log("✅ Connected!");

    const result = await client.query("SELECT NOW()");
    console.log("✅ Query successful!");
    console.log("Time:", result.rows[0].now);

    client.release();
  } catch (error) {
    console.error("❌ Failed:", error);
    console.error("Code:", error.code);
  } finally {
    await pool.end();
  }
};

testSimplePool();

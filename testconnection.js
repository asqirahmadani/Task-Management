import pool from "./config/database.js";

const testConnection = async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Connection successful!");
    console.log("⏰ Server time:", result.rows[0].now);
  } catch (error) {
    console.error("❌ Connection failed:", error);
  } finally {
    await pool.end();
  }
};

testConnection();

import { Pool } from 'pg';

// Create a new Pool instance. A Pool manages multiple database connections.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // We will set this environment variable next
  ssl: {
    rejectUnauthorized: false, // Often required for cloud databases like Neon
  },
});

// Export a helper function to query the database
export async function query(text, params) {
  try {
    const client = await pool.connect();
    const result = await client.query(text, params);
    client.release(); // Release the client back to the pool
    return result;
  } catch (err) {
    console.error('Database query error', err);
    throw err; // Re-throw the error so the API route can handle it
  }
}

export default pool;
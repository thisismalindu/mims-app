import { Pool } from 'pg';

// Support optional SSL for local development. Set DATABASE_SSL=true to enable SSL.
const useSsl = String(process.env.DATABASE_SSL || '').toLowerCase() === 'true';

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

if (useSsl) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

// Export a helper function to query the database
export async function query(text, params) {
  const start = Date.now();
  try {
    const client = await pool.connect();
    const result = await client.query(text, params);
    client.release(); // Release the client back to the pool
    const duration = Date.now() - start;
    // Lightweight logging for slow queries
    if (duration > 500) {
      console.warn(`Slow query (${duration}ms): ${text}`);
    }
    return result;
  } catch (err) {
    console.error('Database query error', err?.message || err);
    throw err; // Re-throw the error so API routes can handle it
  }
}

export default pool;
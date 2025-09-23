//serivicio-cron/lib/db.ts
import { Pool } from 'pg';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL env variable not defined');
}
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
export const query = (text, params) => pool.query(text, params);
export { pool };

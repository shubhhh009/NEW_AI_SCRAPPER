import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

client.connect().then(() => {
    console.log('Database connected successfully');
}).catch(err => {
    console.error('Failed to connect to database:', err);
    // Don't exit process here, let the server start but logging is crucial
    // In a real prod env you might want to exit, but for debugging this is better
});

export const db = drizzle(client, { schema });

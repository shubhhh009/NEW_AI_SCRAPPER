import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { Queue } from 'bullmq';
import { db } from './db';
import { tasks } from './db/schema';
import { eq } from 'drizzle-orm';
import './worker'; // Start worker

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const port = process.env.PORT || 3000;

let scraperQueue: Queue | null = null;

try {
    if (process.env.REDIS_HOST) {
        scraperQueue = new Queue('scraper-queue', {
            connection: {
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
            }
        });
    } else {
        console.log('No REDIS_HOST provided. Using direct processing mode.');
    }
} catch (error) {
    console.warn('Failed to initialize Redis queue. Will use direct processing.');
}

app.post('/api/tasks', async (req, res) => {
    try {
        const { url, question } = req.body;

        if (!url || !question) {
            return res.status(400).json({ error: 'URL and Question are required' });
        }

        // Create task in DB
        const [newTask] = await db.insert(tasks)
            .values({ url, question, status: 'queued' })
            .returning();

        // Add to queue or process directly if Redis is down
        try {
            if (scraperQueue) {
                await scraperQueue.add('scrape-job', {
                    taskId: newTask.id,
                    url,
                    question
                });
            } else {
                throw new Error('Redis queue not initialized');
            }
        } catch (queueError) {
            console.error('Redis Queue Error:', queueError);
            console.log('Falling back to direct processing...');

            // Import dynamically to avoid circular dependency issues if any, 
            // though here we just need the function.
            // Better to import at top, but for now let's use the one we have.
            // We need to import processTask from worker.ts
            const { processTask } = require('./worker');

            // Process synchronously for serverless (Vercel) to prevent freezing
            // We await here so the execution context stays alive
            await processTask(newTask.id, url, question);
        }

        res.json(newTask);
    } catch (error: any) {
        console.error('Error processing task submission:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.get('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const task = await db.query.tasks.findFirst({
            where: eq(tasks.id, parseInt(id))
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Export app for Vercel
export default app;

// Only listen if running directly (not imported)
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
        console.log(`Health check available at http://localhost:${port}/health`);
    });
}

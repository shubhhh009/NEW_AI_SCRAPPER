import { Worker } from 'bullmq';
import { db } from './db';
import { tasks } from './db/schema';
import { scrapeUrl } from './lib/scraper';
import { answerQuestion } from './lib/ai';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
};

export const processTask = async (taskId: number, url: string, question: string) => {
    console.log(`Processing task ${taskId}: ${url}`);

    try {
        // Update status to processing
        await db.update(tasks)
            .set({ status: 'processing' })
            .where(eq(tasks.id, taskId));

        // Scrape
        const content = await scrapeUrl(url);

        // Update content
        await db.update(tasks)
            .set({ scrapedContent: content })
            .where(eq(tasks.id, taskId));

        // AI
        const answer = await answerQuestion(content, question, url);

        // Update status to completed
        await db.update(tasks)
            .set({
                status: 'completed',
                answer: answer,
                updatedAt: new Date()
            })
            .where(eq(tasks.id, taskId));

        console.log(`Task ${taskId} completed.`);

    } catch (error: any) {
        console.error(`Task ${taskId} failed:`, error);
        await db.update(tasks)
            .set({
                status: 'error',
                error: error.message || 'Unknown error',
                updatedAt: new Date()
            })
            .where(eq(tasks.id, taskId));
        // We don't throw here in direct mode to avoid crashing the server, 
        // but for the worker it might be needed. 
        // For now, logging and DB update is enough.
    }
};

export let worker: Worker | null = null;

try {
    if (process.env.REDIS_HOST) {
        worker = new Worker('scraper-queue', async (job) => {
            const { taskId, url, question } = job.data;
            await processTask(taskId, url, question);
        }, {
            connection: {
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
            }
        });

        worker.on('completed', job => {
            console.log(`${job.id} has completed!`);
        });

        worker.on('failed', (job, err) => {
            console.log(`${job?.id} has failed with ${err.message}`);
        });
    } else {
        console.log('No REDIS_HOST provided. Worker will not consume from queue.');
    }
} catch (error) {
    console.warn('Failed to initialize Redis worker. Running in direct processing mode.');
}

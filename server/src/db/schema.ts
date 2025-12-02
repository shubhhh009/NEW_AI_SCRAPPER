import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const tasks = pgTable('tasks', {
    id: serial('id').primaryKey(),
    url: text('url').notNull(),
    question: text('question').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('queued'), // queued, processing, completed, error
    scrapedContent: text('scraped_content'),
    answer: text('answer'),
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

import chromium from '@sparticuz/chromium-min';
import { chromium as playwright, Route } from 'playwright-core';

export async function scrapeUrl(url: string): Promise<string> {
    let browser;

    try {
        const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

        if (isProduction) {
            browser = await playwright.launch({
                args: (chromium as any).args,
                executablePath: await (chromium as any).executablePath(
                    'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
                ),
                headless: (chromium as any).headless,
            });
        } else {
            // Local development
            browser = await playwright.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
                headless: true,
            });
        }

        const context = await browser.newContext();
        const page = await context.newPage();

        // Optimize performance by blocking resources
        await page.route('**/*.{png,jpg,jpeg,gif,svg,css,font,woff,woff2}', (route: Route) => route.abort());

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const data = await page.evaluate(() => {
            const title = document.title;
            const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
            const bodyText = document.body.innerText;
            const cleanBody = bodyText.replace(/\s+/g, ' ').trim();
            return `Title: ${title}\nDescription: ${metaDescription}\n\nContent:\n${cleanBody}`;
        });

        await browser.close();
        return data;
    } catch (error) {
        console.error('Error scraping URL:', error);
        if (browser) await browser.close();
        throw error;
    }
}

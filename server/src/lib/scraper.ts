import chromium from '@sparticuz/chromium-min';
import { chromium as playwright, Route } from 'playwright-core';

export async function scrapeUrl(url: string): Promise<string> {
    let browser;

    try {
        const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
        console.log(`[Scraper] Environment: ${isProduction ? 'Production' : 'Development'}`);

        if (isProduction) {
            browser = await playwright.launch({
                args: chromium.args,
                executablePath: await chromium.executablePath(
                    'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
                ),
                headless: true,
            });
        } else {
            console.log('[Scraper] Using local developmental launch');
            browser = await playwright.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
                headless: true,
            }).catch(async (e) => {
                console.log('[Scraper] Local launch failed, trying fallback...');
                return await playwright.launch({
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
                    headless: true,
                });
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

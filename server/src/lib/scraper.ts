import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import puppeteerCore from 'puppeteer-core';

export async function scrapeUrl(url: string): Promise<string> {
    let browser;

    try {
        // Check if running on Vercel/AWS Lambda
        const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

        if (isProduction) {
            // Configure for Vercel/Serverless
            browser = await puppeteerCore.launch({
                args: (chromium as any).args,
                defaultViewport: (chromium as any).defaultViewport,
                executablePath: await (chromium as any).executablePath(),
                headless: (chromium as any).headless,
            });
        } else {
            // Local development
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }

        const page = await browser.newPage();

        // Optimize performance by blocking resources
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Wait for DOM content only (faster than networkidle2)
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Extract structured content
        const data = await (page.evaluate as any)(() => {
            const title = document.title;
            const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
            const bodyText = document.body.innerText;

            // Clean up body text (remove excessive whitespace)
            const cleanBody = bodyText.replace(/\s+/g, ' ').trim();

            return `Title: ${title}\nDescription: ${metaDescription}\n\nContent:\n${cleanBody}`;
        });

        return data as string;
    } catch (error) {
        console.error('Error scraping URL:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

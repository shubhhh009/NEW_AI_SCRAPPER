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

        // Wait for network to be idle (better for SPAs)
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

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

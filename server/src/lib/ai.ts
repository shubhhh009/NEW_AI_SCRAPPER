import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';

dotenv.config();

// Using Groq for free, fast AI inference
// Get your free API key from: https://console.groq.com/keys

export async function answerQuestion(context: string, question: string, url?: string): Promise<string> {
    // Truncate context to avoid token limits (rough estimate)
    const truncatedContext = context.slice(0, 10000);

    // Try Groq API (free tier with generous limits)
    if (process.env.GROQ_API_KEY) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant', // Fast and free model
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant. Answer the user\'s question based on the provided context. If the context is empty, use your general knowledge about the URL provided.'
                        },
                        {
                            role: 'user',
                            content: `URL: ${url || 'Not provided'}\n\nContext:\n${truncatedContext}\n\nQuestion: ${question}\n\nAnswer:`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 500,
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || "No answer generated.";
        } catch (error: any) {
            console.error('Groq Error:', error);
            console.log('Groq API failed, falling back to simple extraction');
        }
    }

    // Fallback: Return a simple text-based answer when AI fails
    console.log('No AI API available, using simple text extraction');
    const contextPreview = truncatedContext.slice(0, 800);
    return `Here's the scraped content:\n\n${contextPreview}...\n\n---\n\nQuestion: ${question}\n\nTo get AI-powered answers, add a GROQ_API_KEY to your .env file.\nGet a free API key at: https://console.groq.com/keys`;
}

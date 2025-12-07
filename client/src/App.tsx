import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, CheckCircle, XCircle, Clock, Sparkles, Zap, ArrowRight, Globe, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface Task {
  id: number;
  url: string;
  question: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  answer?: string;
  error?: string;
}

function App() {
  const [url, setUrl] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTask(null);
    setTaskId(null);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    try {
      const response = await axios.post(`${apiUrl}/api/tasks`, {
        url,
        question,
      });
      setTaskId(response.data.id);
      setTask(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to submit task');
      if (!err.response) {
        setError('Network Error: Cannot connect to server. Is it running?');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!taskId || task?.status === 'completed' || task?.status === 'error') return;

    const poll = async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      try {
        const response = await axios.get(`${apiUrl}/api/tasks/${taskId}`);
        // Only update if status changed to avoid unnecessary re-renders/checks
        if (response.data.status !== task?.status) {
          setTask(response.data);
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    };

    // Initial poll immediately
    poll();

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [taskId, task?.status]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0A] to-[#0A0A0A] pointer-events-none"></div>

      <div className="max-w-3xl w-full relative z-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in-up">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-gray-800 bg-gray-900/50 backdrop-blur-sm text-xs font-medium text-gray-400">
            <Sparkles className="w-3 h-3 mr-2 text-blue-500" />
            Powered by Groq Llama 3.1
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Web Intelligence, <span className="text-gray-500">Simplified.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Turn any website into actionable insights with a single query.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="p-1 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 opacity-20"></div>

          <div className="p-8 md:p-10 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="url" className="text-sm font-medium text-gray-300 flex items-center">
                  <Globe className="w-4 h-4 mr-2 text-gray-500" />
                  Target URL
                </label>
                <input
                  type="url"
                  id="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="question" className="text-sm font-medium text-gray-300 flex items-center">
                  <Search className="w-4 h-4 mr-2 text-gray-500" />
                  Query
                </label>
                <input
                  type="text"
                  id="question"
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                  placeholder="What insights do you need?"
                />
              </div>

              <button
                type="submit"
                disabled={loading || (!!taskId && task?.status !== 'completed' && task?.status !== 'error')}
                className="w-full bg-white text-black font-semibold py-3 px-4 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111111] focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                ) : (
                  <Zap className="h-5 w-5 mr-2" />
                )}
                {loading ? 'Processing...' : 'Generate Insights'}
              </button>
            </form>

            {error && (
              <div className="p-4 bg-red-900/10 border border-red-900/20 rounded-lg flex items-center text-red-400 text-sm animate-fade-in">
                <XCircle className="h-4 w-4 mr-3 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {task && (
          <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="bg-[#111111] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
                <h2 className="text-sm font-semibold text-gray-200 flex items-center">
                  <ArrowRight className="w-4 h-4 mr-2 text-gray-500" />
                  Output
                </h2>
                <div className={cn(
                  "flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                  task.status === 'queued' && "bg-yellow-900/10 text-yellow-500 border-yellow-900/20",
                  task.status === 'processing' && "bg-blue-900/10 text-blue-500 border-blue-900/20",
                  task.status === 'completed' && "bg-green-900/10 text-green-500 border-green-900/20",
                  task.status === 'error' && "bg-red-900/10 text-red-500 border-red-900/20"
                )}>
                  {task.status === 'queued' && <Clock className="h-3 w-3 mr-1.5" />}
                  {task.status === 'processing' && <Loader2 className="animate-spin h-3 w-3 mr-1.5" />}
                  {task.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1.5" />}
                  {task.status === 'error' && <XCircle className="h-3 w-3 mr-1.5" />}
                  <span className="uppercase tracking-wider text-[10px]">{task.status}</span>
                </div>
              </div>

              <div className="p-6 md:p-8">
                {task.status === 'completed' && task.answer && (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{task.answer}</p>
                  </div>
                )}

                {task.status === 'error' && task.error && (
                  <div className="text-red-400 text-sm font-mono bg-red-900/5 p-4 rounded border border-red-900/10">
                    Error: {task.error}
                  </div>
                )}

                {(task.status === 'queued' || task.status === 'processing') && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="relative">
                      <div className="w-12 h-12 border-2 border-gray-800 rounded-full"></div>
                      <div className="absolute inset-0 w-12 h-12 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-500 text-sm font-medium animate-pulse">Analyzing content...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

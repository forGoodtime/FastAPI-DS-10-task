'use client';

import { useState, FormEvent } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/shorten';
const STATS_URL = 'http://localhost:8000/api/stats';

export default function Home() {
  const [longUrl, setLongUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [clicks, setClicks] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShortUrl('');
    setCopied(false);
    setClicks(null);
    try {
      const response = await axios.post(API_URL, {
        long_url: longUrl,
        custom_code: customCode || undefined,
      });
      setShortUrl(response.data.short_url);

      // Получаем статистику сразу после создания
      const code = response.data.short_code;
      const stats = await axios.get(`${STATS_URL}/${code}`);
      setClicks(stats.data.clicks);
    } catch (err: any) {
      setError(
        err.response?.data?.detail?.[0]?.msg ||
        err.response?.data?.detail ||
        'Неверный URL или ошибка сервера.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shortUrl) return;
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-lg p-8 space-y-6 bg-gray-800 rounded-xl shadow-2xl">
        <h1 className="text-3xl font-bold text-center text-cyan-400">Сокращатель Ссылок</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="longUrl" className="block mb-2 text-sm font-medium text-gray-400">
              Введите длинный URL
            </label>
            <input
              id="longUrl"
              type="url"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              placeholder="https://example.com/very/long/url/to/shorten"
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="customCode" className="block mb-2 text-sm font-medium text-gray-400">
              Кастомный короткий код (необязательно)
            </label>
            <input
              id="customCode"
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              placeholder="Например: mylink"
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 disabled:bg-cyan-800 transition-colors"
          >
            {loading ? 'Сокращаем...' : 'Сократить'}
          </button>
        </form>

        {error && (
          <div className="p-3 text-center text-red-400 bg-red-900/50 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {shortUrl && (
          <div className="p-4 space-y-3 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-400">Ваша короткая ссылка:</p>
            <div className="flex items-center gap-4">
              <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="flex-grow text-lg text-cyan-400 hover:underline break-all">
                {shortUrl}
              </a>
              <button
                onClick={handleCopy}
                className="px-4 py-2 font-semibold text-sm bg-gray-600 rounded-lg hover:bg-gray-500 transition-colors"
              >
                {copied ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>
            <div className="text-sm text-gray-300">Переходов: {clicks ?? 0}</div>
          </div>
        )}
      </div>
    </main>
  );
}
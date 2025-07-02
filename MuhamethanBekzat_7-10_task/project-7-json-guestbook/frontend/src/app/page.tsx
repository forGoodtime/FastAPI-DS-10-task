'use client';

import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';

interface Entry {
  id: string;
  name: string;
  message: string;
  timestamp: string; // Дата придет как строка в формате ISO
}

const API_URL = 'http://localhost:8000/api/entries';

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const fetchEntries = async () => {
    try {
      const response = await axios.get(`${API_URL}?page=${page}&limit=${limit}`);
      // Сортируем записи так, чтобы новые были сверху
      const sortedEntries = response.data.sort((a: Entry, b: Entry) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setEntries(sortedEntries);
    } catch (err) {
      setError('Не удалось загрузить записи.');
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [page]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      setError('Имя и сообщение не могут быть пустыми.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(API_URL, { name, message });
      // Очищаем поля и перезагружаем записи
      setName('');
      setMessage('');
      fetchEntries();
    } catch (err) {
      setError('Ошибка при отправке сообщения.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      setEntries(entries.filter(entry => entry.id !== id));
    } catch {
      setError('Ошибка при удалении записи.');
    }
  };

  return (
    <main className="bg-gray-100 min-h-screen p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">Гостевая Книга</h1>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-semibold mb-4">Оставить запись</h2>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-700 mb-1">Ваше имя</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Аноним"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="message" className="block text-gray-700 mb-1">Сообщение</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              placeholder="Всем привет!"
            ></textarea>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">
            {loading ? 'Отправка...' : 'Отправить'}
          </button>
        </form>

        <div className="space-y-4">
          {entries.map(entry => (
            <div key={entry.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-start gap-2">
              <div>
                <p className="text-gray-800">{entry.message}</p>
                <div className="text-right text-sm text-gray-500 mt-2">
                  <strong>- {entry.name}</strong> в {new Date(entry.timestamp).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                className="text-red-500 hover:text-red-700 font-bold px-2"
                title="Удалить"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50">Назад</button>
          <span>Страница {page}</span>
          <button onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-gray-300 rounded">Вперед</button>
        </div>
      </div>
    </main>
  );
}
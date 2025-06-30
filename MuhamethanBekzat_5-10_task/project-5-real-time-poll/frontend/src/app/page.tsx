'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

// Типы для данных голосования
interface PollOption {
  label: string;
  votes: number;
}
interface PollData {
  question: string;
  options: Record<string, PollOption>;
}

const API_URL = 'http://localhost:8000/api';

export default function Home() {
  const [pollData, setPollData] = useState<PollData | null>(null);
  const [voted, setVoted] = useState<string | null>(null); // Храним ключ опции, за которую проголосовали

  // Функция для получения данных с сервера
  const fetchPollData = async () => {
    try {
      const response = await axios.get(`${API_URL}/poll`);
      setPollData(response.data);
    } catch (error) {
      console.error("Failed to fetch poll data:", error);
    }
  };

  // Основной эффект для поллинга
  useEffect(() => {
    fetchPollData(); // Получаем данные при первой загрузке
    const intervalId = setInterval(fetchPollData, 3000); // Опрашиваем сервер каждые 3 секунды

    // Очищаем интервал при размонтировании компонента, чтобы избежать утечек памяти
    return () => clearInterval(intervalId);
  }, []);

  const handleVote = async (optionKey: string) => {
      if (voted) return; // Позволяем голосовать только один раз (простая проверка)
      try {
        const response = await axios.post(`${API_URL}/poll/vote/${optionKey}`);
        setPollData(response.data); // Сразу обновляем данные, не дожидаясь следующего опроса
        setVoted(optionKey); // Отмечаем, что пользователь проголосовал
      } catch (error) {
        console.error("Failed to cast vote:", error);
      }
    };

  const totalVotes = pollData ? Object.values(pollData.options).reduce((sum, option) => sum + option.votes, 0) : 0;

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-xl shadow-lg">
        {pollData ? (
          <>
            <h1 className="text-3xl font-bold text-center text-gray-800">{pollData.question}</h1>
            <div className="space-y-4">
              {Object.entries(pollData.options).map(([key, option]) => {
                const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-700">{option.label}</span>
                      <span className="text-sm font-medium text-gray-500">{option.votes} голосов ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-8">
                      <div
                        className="bg-blue-500 h-8 rounded-full transition-all duration-500 ease-in-out text-white flex items-center px-2"
                        style={{ width: `${percentage}%` }}
                      >
                      </div>
                    </div>
                    <button
                      onClick={() => handleVote(key)}
                      disabled={!!voted}
                      className={`w-full mt-2 py-2 text-white font-semibold rounded-lg transition-colors ${
                        voted ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
                      } ${voted === key ? '!bg-blue-700' : ''}`}
                    >
                      {voted === key ? 'Ваш голос' : 'Голосовать'}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="text-center text-gray-600 font-bold pt-4 border-t">
              Всего голосов: {totalVotes}
            </div>
          </>
        ) : (
          <p className="text-center text-gray-500">Загрузка данных голосования...</p>
        )}
      </div>
    </main>
  );
}
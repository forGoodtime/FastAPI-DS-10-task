'use client';

import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import Image from 'next/image';

interface WeatherData {
  city_name: string;
  temperature: number;
  description: string;
  icon: string;
}

const API_URL = 'http://localhost:8000/api/weather';

export default function Home() {
  const [city, setCity] = useState('Almaty'); // Город по умолчанию
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true); // true, чтобы загрузка началась сразу
  const [error, setError] = useState('');

  const fetchWeather = async (cityName: string) => {
    setLoading(true);
    setError('');
    setWeather(null);
    try {
      const response = await axios.get(`<span class="math-inline">\{API\_URL\}/</span>{cityName}`);
      setWeather(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Не удалось загрузить данные о погоде.');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем погоду для города по умолчанию при первом рендере
  useEffect(() => {
    fetchWeather('Almaty');
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (city.trim()) {
      fetchWeather(city.trim());
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-200 to-purple-300 p-4">
      <div className="w-full max-w-sm bg-white/50 backdrop-blur-md p-6 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">Погода</h1>
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Введите город"
            className="flex-grow p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white font-bold p-2 rounded-lg disabled:bg-blue-300">
            {loading ? '...' : '➔'}
          </button>
        </form>

        {loading && <p className="text-center text-gray-700">Загрузка...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        {weather && (
          <div className="flex flex-col items-center text-center text-gray-900">
            <h2 className="text-3xl font-semibold">{weather.city_name}</h2>
            <div className="flex items-center">
              <p className="text-6xl font-light">{Math.round(weather.temperature)}°C</p>
              <Image
                src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                alt={weather.description}
                width={100}
                height={100}
              />
            </div>
            <p className="text-lg capitalize">{weather.description}</p>
          </div>
        )}
      </div>
    </main>
  );
}
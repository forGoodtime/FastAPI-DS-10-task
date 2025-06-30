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

interface ForecastItem {
  date: string;
  temp: number;
  description: string;
  icon: string;
}

const API_URL = 'http://localhost:8000/api/weather';
const FORECAST_URL = 'http://localhost:8000/api/forecast';

export default function Home() {
  const [city, setCity] = useState('Almaty'); // Город по умолчанию
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
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

  // Функция для загрузки прогноза
  const fetchForecast = async (cityName: string) => {
    try {
      const response = await axios.get(`${FORECAST_URL}/${cityName}`);
      setForecast(response.data.forecast.slice(0, 5)); // Показываем только 5 записей (5 дней)
    } catch {
      setForecast([]);
    }
  };

  // Загружаем погоду для города по умолчанию при первом рендере
  useEffect(() => {
    // Сначала пробуем получить координаты пользователя
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            setLoading(true);
            setError('');
            setWeather(null);
            const response = await axios.get(
              `http://localhost:8000/api/weather/coords?lat=${latitude}&lon=${longitude}`
            );
            setWeather(response.data);
            setCity(response.data.city_name || '');
          } catch (err: any) {
            setError('Не удалось получить погоду по геолокации.');
            // Если ошибка — загружаем погоду по умолчанию
            fetchWeather('Almaty');
          } finally {
            setLoading(false);
          }
        },
        () => {
          // Если пользователь не дал доступ — загружаем погоду по умолчанию
          fetchWeather('Almaty');
        }
      );
    } else {
      fetchWeather('Almaty');
    }
  }, []);

  // Загружаем прогноз при смене города или после получения погоды
  useEffect(() => {
    if (city) {
      fetchForecast(city);
    }
  }, [city]);

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

        {/* Прогноз на 5 дней */}
        {forecast.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xl font-bold mb-2 text-center">Прогноз на 5 дней</h3>
            <div className="grid grid-cols-1 gap-2">
              {forecast.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
                  <span className="font-semibold">{item.date.split(' ')[0]}</span>
                  <span className="flex items-center gap-2">
                    <Image
                      src={`https://openweathermap.org/img/wn/${item.icon}.png`}
                      alt={item.description}
                      width={40}
                      height={40}
                    />
                    <span>{Math.round(item.temp)}°C</span>
                  </span>
                  <span className="capitalize text-sm">{item.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
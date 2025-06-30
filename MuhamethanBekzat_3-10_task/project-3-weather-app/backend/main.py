import os
import httpx # Библиотека для асинхронных HTTP запросов
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv # Для загрузки переменных из .env файла

# Загружаем переменные окружения из .env файла
load_dotenv()

app = FastAPI()

# --- Настройка CORS ---
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Получение API ключа и базового URL ---
API_KEY = os.getenv("OPENWEATHER_API_KEY")
WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_BASE_URL = "https://api.openweathermap.org/data/2.5/forecast"

# Прогноз на 5 дней по городу
@app.get("/api/forecast/{city}")
async def get_forecast(city: str):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API key is not configured")

    params = {
        "q": city,
        "appid": API_KEY,
        "units": "metric",
        "lang": "ru"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(FORECAST_BASE_URL, params=params)

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Город не найден")
    if response.status_code != 200:
        error_detail = response.json().get("message", "Ошибка получения прогноза")
        raise HTTPException(status_code=response.status_code, detail=error_detail)

    data = response.json()
    # Оставляем только нужные поля: дата, температура, описание
    forecast = [
        {
            "date": item["dt_txt"],
            "temp": item["main"]["temp"],
            "description": item["weather"][0]["description"],
            "icon": item["weather"][0]["icon"]
        }
        for item in data["list"]
    ]
    return {"city": city, "forecast": forecast}

# Погода по координатам
@app.get("/api/weather/coords")
async def get_weather_by_coords(
    lat: float = Query(..., description="Широта"),
    lon: float = Query(..., description="Долгота")
):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API key is not configured")

    params = {
        "lat": lat,
        "lon": lon,
        "appid": API_KEY,
        "units": "metric",
        "lang": "ru"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(WEATHER_BASE_URL, params=params)

    if response.status_code != 200:
        error_detail = response.json().get("message", "Ошибка получения погоды")
        raise HTTPException(status_code=response.status_code, detail=error_detail)

    data = response.json()
    return {
        "city_name": data.get("name"),
        "temperature": data["main"]["temp"],
        "description": data["weather"][0]["description"],
        "icon": data["weather"][0]["icon"]
    }
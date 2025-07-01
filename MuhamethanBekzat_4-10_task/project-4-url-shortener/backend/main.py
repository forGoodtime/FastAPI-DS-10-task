import secrets
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime, timedelta

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

LIFETIME_DAYS = 7

# --- "База данных" в памяти (словарь Python) ---
url_db = {}

# --- Pydantic модель ---
class URLCreate(BaseModel):
    long_url: HttpUrl
    custom_code: Optional[str] = None

# --- Эндпоинт для создания короткой ссылки ---
@app.post("/api/shorten")
def create_short_url(url_data: URLCreate, request: Request):
    long_url = str(url_data.long_url)
    short_code = url_data.custom_code or secrets.token_urlsafe(6)

    if short_code in url_db:
        raise HTTPException(status_code=400, detail="Short code already exists")

    url_db[short_code] = {
        "long_url": long_url,
        "clicks": 0,
        "created_at": datetime.utcnow().isoformat()
    }

    base_url = str(request.base_url)
    short_url = f"{base_url}{short_code}"

    return {"short_url": short_url, "short_code": short_code, "clicks": 0}

# --- Эндпоинт для редиректа и подсчёта кликов ---
@app.get("/{short_code}")
def redirect_to_long_url(short_code: str):
    url_info = url_db.get(short_code)

    if not url_info:
        raise HTTPException(status_code=404, detail="Short URL not found")

    created_at = datetime.fromisoformat(url_info["created_at"])
    if datetime.utcnow() - created_at > timedelta(days=LIFETIME_DAYS):
        raise HTTPException(status_code=410, detail="Short URL has expired")

    url_info["clicks"] += 1

    return RedirectResponse(url=url_info["long_url"])

# --- Эндпоинт для получения статистики ---
@app.get("/api/stats/{short_code}")
def get_url_stats(short_code: str, request: Request):
    url_info = url_db.get(short_code)

    if not url_info:
        raise HTTPException(status_code=404, detail="Short URL not found")

    return {
        "short_url": f"{request.base_url}{short_code}",
        "long_url": url_info["long_url"],
        "clicks": url_info["clicks"],
        "created_at": url_info["created_at"]
    }
import secrets
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

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

# --- "База данных" в памяти (словарь Python) ---
# Ключ - короткий код, значение - длинный URL
url_db = {}

# --- Pydantic модели ---
class URLCreate(BaseModel):
    long_url: HttpUrl # Pydantic проверит, что это валидный URL

# --- Эндпоинты API ---

@app.post("/api/shorten")
def create_short_url(url_data: URLCreate, request: Request):
    """Создает короткий код для длинного URL."""
    long_url = str(url_data.long_url)

    # Генерируем случайный безопасный код
    # secrets.token_urlsafe(n) генерирует строку из n байт
    short_code = secrets.token_urlsafe(6)

    # Убедимся, что код уникален (для простого примера можно пропустить)
    while short_code in url_db:
        short_code = secrets.token_urlsafe(6)

    url_db[short_code] = long_url

    # Формируем полный короткий URL для ответа
    base_url = str(request.base_url)
    short_url = f"{base_url}{short_code}"

    return {"short_url": short_url}

@app.get("/{short_code}")
def redirect_to_long_url(short_code: str):
    """Ищет длинный URL по короткому коду и перенаправляет на него."""
    long_url = url_db.get(short_code)

    if not long_url:
        raise HTTPException(status_code=404, detail="Short URL not found")

    # Выполняем HTTP 307 Temporary Redirect
    return RedirectResponse(url=long_url)
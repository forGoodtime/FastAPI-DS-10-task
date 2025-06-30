from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict

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

# --- "База данных" в памяти ---
poll_data = {
    "question": "Ваш любимый фреймворк для бэкенда?",
    "options": {
        "fastapi": {"label": "FastAPI", "votes": 0},
        "django": {"label": "Django", "votes": 0},
        "flask": {"label": "Flask", "votes": 0},
        "nodejs": {"label": "Node.js (Express)", "votes": 0}
    }
}

# --- Pydantic модели ---
class PollResponse(BaseModel):
    question: str
    options: Dict[str, Dict[str, int | str]]

# --- Эндпоинты API ---

@app.get("/api/poll", response_model=PollResponse)
async def get_poll_data():
    """Возвращает текущее состояние голосования."""
    return poll_data

@app.post("/api/poll/vote/{option_key}", response_model=PollResponse)
async def cast_vote(option_key: str):
    """Принимает голос за один из вариантов."""
    if option_key not in poll_data["options"]:
        raise HTTPException(status_code=404, detail="Option not found")

    poll_data["options"][option_key]["votes"] += 1
    return poll_data
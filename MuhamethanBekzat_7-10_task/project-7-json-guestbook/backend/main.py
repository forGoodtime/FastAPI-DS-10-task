import json
import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import aiofiles

app = FastAPI()

# --- CORS ---
origins = ["http://localhost:3000"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DB_FILE = "data/guestbook.json"

# --- Pydantic модели ---
class GuestbookEntry(BaseModel):
    id: str
    name: str
    message: str
    timestamp: datetime

class EntryCreate(BaseModel):
    name: str
    message: str

# --- Вспомогательные функции для работы с файлом ---
async def read_db() -> List[GuestbookEntry]:
    async with aiofiles.open(DB_FILE, mode='r', encoding='utf-8') as f:
        content = await f.read()
        if not content:
            return []
        data = json.loads(content)
        return [GuestbookEntry(**item) for item in data]

async def write_db(data: List[GuestbookEntry]):
    # Преобразуем объекты Pydantic в словари для сериализации в JSON
    export_data = [item.model_dump(mode='json') for item in data]
    async with aiofiles.open(DB_FILE, mode='w', encoding='utf-8') as f:
        await f.write(json.dumps(export_data, indent=4, ensure_ascii=False))

# --- Эндпоинты API ---
@app.get("/api/entries", response_model=List[GuestbookEntry])
async def get_all_entries():
    """Возвращает все записи из гостевой книги."""
    return await read_db()

@app.post("/api/entries", response_model=GuestbookEntry, status_code=201)
async def create_entry(entry_data: EntryCreate):
    """Добавляет новую запись в гостевую книгу."""
    entries = await read_db()

    new_entry = GuestbookEntry(
        id=str(uuid.uuid4()),
        name=entry_data.name,
        message=entry_data.message,
        timestamp=datetime.now(timezone.utc)
    )

    entries.append(new_entry)
    await write_db(entries)

    return new_entry
import os
import uuid
import aiofiles
from fastapi import FastAPI, UploadFile, File, HTTPException, Path
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import List

app = FastAPI()

MAX_SIZE_MB = 5
MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

# --- CORS ---
origins = ["http://localhost:3000"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Путь для сохранения изображений ---
IMAGE_DIR = "static/images/"
os.makedirs(IMAGE_DIR, exist_ok=True)

# --- Раздача статических файлов ---
# Это позволяет получать доступ к файлам по URL, например, http://localhost:8000/static/images/filename.jpg
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    # Проверка типа файла
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not an image.")

    # Проверка размера файла
    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail=f"Файл слишком большой (максимум {MAX_SIZE_MB} МБ).")

    # Проверка наличия имени файла
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename.")

    # Создаем уникальное имя файла, чтобы избежать перезаписи
    file_extension: str = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(IMAGE_DIR, unique_filename)

    # Асинхронно сохраняем файл
    try:
        from aiofiles.threadpool.binary import AsyncBufferedIOBase  # type: ignore
        async with aiofiles.open(file_path, mode='wb') as out_file:  # type: ignore
            out_file: AsyncBufferedIOBase
            await out_file.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {e}")

    # Возвращаем URL, по которому доступен файл
    file_url = f"/static/images/{unique_filename}"
    return {"url": file_url}

@app.delete("/api/images/{filename}")
async def delete_image(filename: str = Path(...)):
    """Удаляет изображение по имени файла."""
    file_path = os.path.join(IMAGE_DIR, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Файл не найден")
    try:
        os.remove(file_path)
        return {"detail": "Файл успешно удалён"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при удалении файла: {e}")

@app.get("/api/images", response_model=List[str])
async def get_images():
    """Возвращает список URL всех загруженных изображений."""
    try:
        images = os.listdir(IMAGE_DIR)
        # Фильтруем, чтобы случайно не отдать не-файлы
        image_urls = [f"/static/images/{img}" for img in images if os.path.isfile(os.path.join(IMAGE_DIR, img))]
        return image_urls
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading image directory: {e}")
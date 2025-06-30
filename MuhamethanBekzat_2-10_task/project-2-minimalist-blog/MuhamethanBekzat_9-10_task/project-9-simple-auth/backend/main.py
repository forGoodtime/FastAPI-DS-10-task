from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Annotated

app = FastAPI()

# --- CORS ---
origins = ["http://localhost:3000"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Фейковые данные ---
FAKE_USER = {"username": "user", "password": "password"}
SECRET_TOKEN = "a_very_secret_and_unguessable_token_12345"

# --- Модель ответа для токена ---
class Token(BaseModel):
    access_token: str
    token_type: str

# --- Зависимость для проверки токена ---
async def token_verifier(authorization: Annotated[str, Header()]):
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
        )
    token = authorization.split(" ")[1]
    if token != SECRET_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

# --- Эндпоинты API ---

@app.post("/api/login", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """Проверяет логин/пароль и возвращает токен."""
    if form_data.username == FAKE_USER["username"] and form_data.password == FAKE_USER["password"]:
        return {"access_token": SECRET_TOKEN, "token_type": "bearer"}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

@app.get("/api/secret-data")
async def get_secret_data(token: Annotated[None, Depends(token_verifier)]):
    """Этот эндпоинт защищен. Доступ возможен только с валидным токеном."""
    return {"message": f"Привет, {FAKE_USER['username']}! Секретное сообщение: 42."}
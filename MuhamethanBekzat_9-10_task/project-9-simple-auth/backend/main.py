from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Annotated
import uuid
from datetime import datetime, timedelta

app = FastAPI()

# --- CORS ---
origins = ["http://localhost:3000"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Фейковые данные ---
FAKE_USER = {"username": "user", "password": "password", "role": "admin"}
TOKENS = {}  # token: {"username": ..., "role": ..., "created": ...}
TOKEN_LIFETIME = timedelta(hours=1)

# --- Модель ответа для токена ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

# --- Зависимость для проверки токена и возврата user_info ---
async def token_verifier(authorization: Annotated[str, Header()]):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme")
    token = authorization.split(" ")[1]
    user_info = TOKENS.get(token)
    if not user_info:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    # Проверка времени жизни токена
    if datetime.utcnow() - user_info["created"] > TOKEN_LIFETIME:
        del TOKENS[token]
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    return user_info

# --- Эндпоинты API ---

@app.post("/api/login", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """Проверяет логин/пароль и возвращает токен."""
    if form_data.username == FAKE_USER["username"] and form_data.password == FAKE_USER["password"]:
        token = str(uuid.uuid4())
        TOKENS[token] = {
            "username": FAKE_USER["username"],
            "role": FAKE_USER["role"],
            "created": datetime.utcnow()
        }
        return {"access_token": token, "token_type": "bearer", "role": FAKE_USER["role"]}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

@app.post("/api/logout")
async def logout(authorization: Annotated[str, Header()]):
    """Выход из системы (аннулирование токена)."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme")
    token = authorization.split(" ")[1]
    TOKENS.pop(token, None)
    return {"detail": "Logged out"}

@app.get("/api/secret-data")
async def get_secret_data(user_info: Annotated[dict, Depends(token_verifier)]):
    """Этот эндпоинт защищен. Доступ возможен только с валидным токеном."""
    return {"message": f"Привет, {user_info['username']}! Секретное сообщение: 42."}

@app.get("/api/admin-data")
async def get_admin_data(user_info: Annotated[dict, Depends(token_verifier)]):
    """Эндпоинт доступен только для администраторов."""
    if user_info["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return {"message": "Только для админа!"}
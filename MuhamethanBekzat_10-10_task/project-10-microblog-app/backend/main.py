import json
import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, status, Header, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Annotated
import aiofiles
from sqlalchemy import create_engine, Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session

app = FastAPI()

# --- CORS ---
origins = ["http://localhost:3000"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DB_FILE = "data/posts.json"

# --- Фейковые данные пользователей ---
# В реальном приложении пароли должны быть хэшированы
FAKE_USERS_DB = {
    "user1": {"id": "1", "username": "user1", "password": "password1"},
    "user2": {"id": "2", "username": "user2", "password": "password2"},
}

# --- Pydantic модели ---
class Post(BaseModel):
    id: str
    text: str
    timestamp: datetime
    owner_id: str
    owner_username: str
    likes: int = 0
    liked_by_me: bool = False  # новое поле

class PostCreate(BaseModel):
    text: str

class User(BaseModel):
    id: str
    username: str

# --- SQLAlchemy модели ---
DATABASE_URL = "sqlite:///./data/app.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class UserDB(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    posts = relationship("PostDB", back_populates="owner")

class PostDB(Base):
    __tablename__ = "posts"
    id = Column(String, primary_key=True, index=True)
    text = Column(String)
    timestamp = Column(DateTime)
    owner_id = Column(String, ForeignKey("users.id"))
    owner = relationship("UserDB", back_populates="posts")

class LikeDB(Base):
    __tablename__ = "likes"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    post_id = Column(String, ForeignKey("posts.id"))
    __table_args__ = (UniqueConstraint('user_id', 'post_id', name='_user_post_uc'),)

# Создание таблиц
Base.metadata.create_all(bind=engine)

# --- Вспомогательные функции для работы с файлом ---
async def read_posts() -> List[Post]:
    async with aiofiles.open(DB_FILE, mode='r', encoding='utf-8') as f:
        content = await f.read()
        return [Post(**item) for item in json.loads(content)] if content else []

async def write_posts(posts: List[Post]):
    export_data = [post.model_dump(mode='json') for post in posts]
    async with aiofiles.open(DB_FILE, mode='w', encoding='utf-8') as f:
        await f.write(json.dumps(export_data, indent=4, ensure_ascii=False))

# --- Аутентификация ---
async def get_current_user(authorization: Annotated[str, Header()]) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid scheme")

    token = authorization.split(" ")[1] # токен - это просто username
    user_data = FAKE_USERS_DB.get(token)

    if not user_data:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return User(**{"id": user_data["id"], "username": user_data["username"]})

@app.post("/api/login")
async def login(form_data: Dict[str, str]):
    username = form_data.get("username")
    password = form_data.get("password")
    user = FAKE_USERS_DB.get(username)
    if not user or user["password"] != password:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password")

    # В качестве токена просто возвращаем имя пользователя
    return {"access_token": user["username"], "token_type": "bearer", "user": {"id": user["id"], "username": user["username"]}}

# --- Зависимость для получения сессии БД ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Эндпоинты для постов через БД ---
from fastapi import Depends

@app.get("/api/posts", response_model=List[Post])
def list_posts(
    db: Session = Depends(get_db),
    current_user: Annotated[User, Depends(get_current_user)] = Depends()
):
    posts = db.query(PostDB).order_by(PostDB.timestamp.desc()).all()
    result = []
    for post in posts:
        likes_count = db.query(LikeDB).filter_by(post_id=post.id).count()
        liked_by_me = db.query(LikeDB).filter_by(post_id=post.id, user_id=current_user.id).first() is not None
        result.append(Post(
            id=post.id,
            text=post.text,
            timestamp=post.timestamp,
            owner_id=post.owner_id,
            owner_username=post.owner.username if post.owner else "",
            likes=likes_count,
            liked_by_me=liked_by_me
        ))
    return result

@app.post("/api/posts", response_model=Post, status_code=201)
def create_post(
    post_data: PostCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    # Убедимся, что пользователь есть в БД (создадим, если нет)
    user = db.query(UserDB).filter(UserDB.id == current_user.id).first()
    if not user:
        user = UserDB(id=current_user.id, username=current_user.username)
        db.add(user)
        db.commit()
        db.refresh(user)

    new_post = PostDB(
        id=str(uuid.uuid4()),
        text=post_data.text,
        timestamp=datetime.now(timezone.utc),
        owner_id=user.id
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return Post(
        id=new_post.id,
        text=new_post.text,
        timestamp=new_post.timestamp,
        owner_id=new_post.owner_id,
        owner_username=user.username
    )

@app.delete("/api/posts/{post_id}", status_code=204)
def delete_post(
    post_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    post = db.query(PostDB).filter(PostDB.id == post_id).first()
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    if post.owner_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to delete this post")
    db.delete(post)
    db.commit()
    return

@app.post("/api/posts/{post_id}/like", status_code=201)
def like_post(
    post_id: str = Path(...),
    current_user: Annotated[User, Depends(get_current_user)] = Depends(),
    db: Session = Depends(get_db)
):
    post = db.query(PostDB).filter(PostDB.id == post_id).first()
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    # Проверяем, есть ли уже лайк
    like = db.query(LikeDB).filter_by(user_id=current_user.id, post_id=post_id).first()
    if like:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Already liked")
    new_like = LikeDB(user_id=current_user.id, post_id=post_id)
    db.add(new_like)
    db.commit()
    return {"detail": "Liked"}

@app.delete("/api/posts/{post_id}/like", status_code=204)
def unlike_post(
    post_id: str = Path(...),
    current_user: Annotated[User, Depends(get_current_user)] = Depends(),
    db: Session = Depends(get_db)
):
    like = db.query(LikeDB).filter_by(user_id=current_user.id, post_id=post_id).first()
    if not like:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Like not found")
    db.delete(like)
    db.commit()
    return

@app.get("/api/users/{username}/posts", response_model=List[Post])
def get_user_posts(
    username: str,
    db: Session = Depends(get_db),
    current_user: Annotated[User, Depends(get_current_user)] = Depends()
):
    user = db.query(UserDB).filter(UserDB.username == username).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    posts = db.query(PostDB).filter(PostDB.owner_id == user.id).order_by(PostDB.timestamp.desc()).all()
    result = []
    for post in posts:
        likes_count = db.query(LikeDB).filter_by(post_id=post.id).count()
        liked_by_me = db.query(LikeDB).filter_by(post_id=post.id, user_id=current_user.id).first() is not None
        result.append(Post(
            id=post.id,
            text=post.text,
            timestamp=post.timestamp,
            owner_id=post.owner_id,
            owner_username=user.username,
            likes=likes_count,
            liked_by_me=liked_by_me
        ))
    return result
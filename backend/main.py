from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import asyncpg
import hashlib
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional

# ----------------------------
# App Setup
# ----------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = "postgresql://postgres:admin123@localhost/translearn"

# JWT Config
SECRET_KEY = "supersecretkey"  # change to env variable in prod
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ----------------------------
# Database
# ----------------------------
async def get_db_connection():
    return await asyncpg.connect(DATABASE_URL)

# ----------------------------
# Models
# ----------------------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    country: str = "Kenya"
    language: str = "english"
    role: str = "student"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ResourceCreate(BaseModel):
    title: str
    description: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    language: str = "english"
    file_url: str
    file_type: str
    price: float = 0.00
    tags: Optional[dict] = None

class ResourceOut(BaseModel):
    id: int
    teacher_id: int
    title: str
    description: Optional[str]
    subject: Optional[str]
    grade_level: Optional[str]
    language: str
    file_url: str
    file_type: str
    price: float
    tags: Optional[dict]
    download_count: int
    is_active: bool
    created_at: datetime

# ----------------------------
# Helpers
# ----------------------------
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role", "student")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        return {"email": email, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ----------------------------
# User Routes
# ----------------------------
@app.post("/users/register")
async def register_user(user: UserRegister):
    conn = await get_db_connection()
    try:
        password_hash = hash_password(user.password)
        await conn.execute(
            """
            INSERT INTO users (email, full_name, password_hash, role, phone, country, language)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            user.email, user.full_name, password_hash,
            user.role, user.phone, user.country, user.language
        )
        return {"message": "User registered successfully"}
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        await conn.close()

@app.post("/users/login", response_model=Token)
async def login_user(user: UserLogin):
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("SELECT * FROM users WHERE email = $1", user.email)
        if not row or not verify_password(user.password, row['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_access_token(
            data={"sub": user.email, "role": row["role"]},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {"access_token": token, "token_type": "bearer"}
    finally:
        await conn.close()

@app.get("/users/me")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            SELECT id, email, full_name, role, phone, country, language, balance, subscription_plan
            FROM users WHERE email = $1
        """, current_user["email"])
        return dict(row)
    finally:
        await conn.close()

# ----------------------------
# Resource Routes
# ----------------------------
@app.post("/resources", response_model=ResourceOut)
async def create_resource(resource: ResourceCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can upload resources")

    conn = await get_db_connection()
    try:
        teacher_id = await conn.fetchval("SELECT id FROM users WHERE email = $1", current_user["email"])
        row = await conn.fetchrow(
            """
            INSERT INTO resources (teacher_id, title, description, subject, grade_level, language,
                                   file_url, file_type, price, tags)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING *
            """,
            teacher_id, resource.title, resource.description, resource.subject,
            resource.grade_level, resource.language, resource.file_url, resource.file_type,
            resource.price, resource.tags
        )
        return dict(row)
    finally:
        await conn.close()

@app.get("/resources", response_model=List[ResourceOut])
async def list_resources(subject: Optional[str] = None, grade_level: Optional[str] = None, language: Optional[str] = None):
    conn = await get_db_connection()
    try:
        query = "SELECT * FROM resources WHERE is_active = TRUE"
        params = []
        if subject:
            query += " AND subject = $1"
            params.append(subject)
        if grade_level:
            query += " AND grade_level = $2" if params else " AND grade_level = $1"
            params.append(grade_level)
        if language:
            query += f" AND language = ${len(params)+1}"
            params.append(language)

        rows = await conn.fetch(query, *params)
        return [dict(r) for r in rows]
    finally:
        await conn.close()

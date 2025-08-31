import asyncpg
import os
from typing import Optional

async def get_db_connection():
    """Get a database connection using Railway PostgreSQL credentials"""
    try:
        conn = await asyncpg.connect(
            host=os.getenv('DATABASE_HOST'),
            port=os.getenv('DATABASE_PORT', '5432'),
            database=os.getenv('DATABASE_NAME'),
            user=os.getenv('DATABASE_USER'),
            password=os.getenv('DATABASE_PASSWORD'),
            ssl='require' if os.getenv('RAILWAY_ENVIRONMENT') == 'production' else None
        )
        return conn
    except Exception as e:
        print(f"Database connection failed: {e}")
        raise

async def init_db():
    """Initialize database tables"""
    conn = await get_db_connection()
    try:
        # This will be handled by Railway's PostgreSQL setup
        # Tables are created via schema.sql
        pass
    finally:
        await conn.close()
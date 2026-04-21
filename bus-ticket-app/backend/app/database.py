from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
import os
import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/busticket")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def wait_for_db(max_retries=10, delay=2):
    retries = 0
    while retries < max_retries:
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("Database connection successful.")
            return
        except Exception as e:
            retries += 1
            logger.warning(f"Database connection failed, retrying... ({retries}/{max_retries})")
            await asyncio.sleep(delay)
    raise Exception("Could not connect to the database after multiple retries.")

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

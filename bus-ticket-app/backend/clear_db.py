import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.database import Base, DATABASE_URL
from sqlalchemy import text

engine = create_async_engine(DATABASE_URL, echo=False)

async def clear_db():
    async with engine.begin() as conn:
        print("Dropping all tables...")
        # Drop with cascade logic or just metadata
        await conn.run_sync(Base.metadata.drop_all)
        print("Database cleared.")

if __name__ == "__main__":
    asyncio.run(clear_db())

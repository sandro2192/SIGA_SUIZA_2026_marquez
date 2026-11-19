from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import MetaData
from ..config import settings

# Metadata específica para Identity (separada del Core)
metadata = MetaData()
Base = declarative_base(metadata=metadata)

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={
        "ssl": False,    # red privada de Railway: no se necesita SSL
        "timeout": 10,   # falla rápido si no puede conectar
    },
)

# Session local para Identity
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_identity_db():
    """Dependencia de base de datos para Identity"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

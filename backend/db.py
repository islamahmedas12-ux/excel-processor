"""
Database engine + session factory for Postgres.
All stores use this module to obtain a session.
"""

import os
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from excel_processor.errors import DatabaseConnectionError

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise DatabaseConnectionError(
        "DATABASE_URL environment variable is not set. "
        "Set the DATABASE_URL environment variable with your PostgreSQL connection string."
    )

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_recycle=300,   # recycle a connection every 5 min instead of pinging on every checkout
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
Base = declarative_base()


@contextmanager
def session_scope():
    """Yield a transactional session; commit on success, rollback on error."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db() -> None:
    """Create all tables. Safe to call repeatedly."""
    from . import models  # noqa: F401 — register tables with metadata
    Base.metadata.create_all(engine)

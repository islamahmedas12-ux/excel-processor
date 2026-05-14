"""
scripts/migrate_add_api_config.py
One-off migration: add api_config JSONB column to files table.

Safe to re-run — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
"""

import sys
import os

# Add project root to path so we can import db / models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from backend.db import engine, Base
from backend.models import File  # noqa: F401 — needed to register the model


def main():
    print("Running: add api_config column to files table")

    with engine.connect() as conn:
        # PostgreSQL syntax: ADD COLUMN IF NOT EXISTS
        conn.execute(text(
            "ALTER TABLE files ADD COLUMN IF NOT EXISTS api_config JSONB"
        ))
        conn.commit()
        print("Column 'api_config' added (or already exists).")

        # Also create index for api_config queries (optional but useful)
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_files_api_config ON files ((api_config IS NOT NULL))"
        ))
        conn.commit()
        print("Index on api_config created (or already exists).")

    print("Migration complete.")


if __name__ == '__main__':
    main()
"""
scripts/migrate_add_api_config.py
Combined migration: add api_config column to files table AND create api_keys table.

Safe to re-run — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from backend.db import engine, Base
from backend.models import File, ApiKey  # noqa: F401 — register models


def main():
    print("Running combined migration: api_config column + api_keys table")

    with engine.connect() as conn:
        # Add api_config column to files table
        conn.execute(text(
            "ALTER TABLE files ADD COLUMN IF NOT EXISTS api_config JSONB"
        ))
        conn.commit()
        print("Column 'api_config' added to files (or already exists).")

        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_files_api_config ON files ((api_config IS NOT NULL))"
        ))
        conn.commit()
        print("Index on api_config created (or already exists).")

        # Create api_keys table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS api_keys (
                id           VARCHAR NOT NULL,
                owner_email  VARCHAR NOT NULL,
                name         VARCHAR NOT NULL,
                key_prefix   VARCHAR UNIQUE NOT NULL,
                key_hash     VARCHAR NOT NULL,
                last_used_at TIMESTAMP WITH TIME ZONE,
                created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                revoked_at   TIMESTAMP WITH TIME ZONE,
                PRIMARY KEY (id)
            )
        """))
        conn.commit()
        print("Table 'api_keys' created (or already exists).")

        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_api_keys_key_prefix ON api_keys (key_prefix)"
        ))
        conn.commit()
        print("Index on key_prefix created (or already exists).")

        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_api_keys_owner_email ON api_keys (owner_email)"
        ))
        conn.commit()
        print("Index on owner_email created (or already exists).")

    print("Migration complete.")


if __name__ == '__main__':
    main()
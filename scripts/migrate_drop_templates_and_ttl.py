"""
scripts/migrate_drop_templates_and_ttl.py

Removes two retired concepts:
  1. The Template feature  -> DROP TABLE templates
  2. The file 24h TTL      -> DROP COLUMN files.expires_at

DESTRUCTIVE: dropping `templates` permanently deletes all template metadata.
Template file blobs in the MinIO 'templates' bucket are NOT touched by this
script (delete that bucket separately if you want the space back).

Safe to re-run — uses IF EXISTS. Result/Job TTLs are intentionally left intact.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from backend.db import engine


def main():
    print("Running migration: drop templates table + files.expires_at column")

    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS templates"))
        conn.commit()
        print("Table 'templates' dropped (or already absent).")

        conn.execute(text("DROP INDEX IF EXISTS ix_files_api_config"))
        # Recreate the api_config index after the column change is irrelevant;
        # it does not depend on expires_at, so just drop expires_at next.
        conn.execute(text("ALTER TABLE files DROP COLUMN IF EXISTS expires_at"))
        conn.commit()
        print("Column 'files.expires_at' dropped (or already absent).")

        # Re-ensure the api_config partial index still exists (harmless re-run).
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_files_api_config "
            "ON files ((api_config IS NOT NULL))"
        ))
        conn.commit()
        print("Index ix_files_api_config ensured.")

    print("Migration complete.")


if __name__ == '__main__':
    main()

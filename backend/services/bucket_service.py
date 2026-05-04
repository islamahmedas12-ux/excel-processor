"""
Supabase Storage Service
========================
Handles file upload/download from Supabase bucket
"""

import os
import uuid
import requests
from io import BytesIO
from typing import Optional, BinaryIO
from supabase import create_client, Client


class BucketService:
    """Service for managing files in Supabase Storage"""

    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.bucket_name = os.getenv("SUPABASE_BUCKET", "excel-files")

        if not self.url or not self.key:
            raise EnvironmentError(
                "SUPABASE_URL and SUPABASE_KEY must be set in environment variables"
            )

        self.client: Client = create_client(self.url, self.key)

    def upload_file(self, file_content: bytes, original_filename: str) -> dict:
        """
        Upload file to Supabase bucket

        Args:
            file_content: File bytes
            original_filename: Original filename

        Returns:
            dict with file_id and file_url
        """
        file_extension = original_filename.split('.')[-1] if '.' in original_filename else 'xlsx'
        unique_filename = f"{uuid.uuid4()}.{file_extension}"

        bucket = self.client.storage.get_bucket(self.bucket_name)

        bucket.upload(
            file=file_content,
            path=unique_filename,
            options={"contentType": f"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
        )

        public_url = self.client.storage.from_(self.bucket_name).get_public_url(unique_filename)

        return {
            "file_id": unique_filename,
            "filename": unique_filename,
            "original_filename": original_filename,
            "url": public_url,
            "bucket": self.bucket_name
        }

    def download_file(self, file_id: str) -> bytes:
        """
        Download file from Supabase bucket

        Args:
            file_id: File ID (UUID filename)

        Returns:
            File bytes
        """
        bucket = self.client.storage.get_bucket(self.bucket_name)
        response = bucket.download(file_id)
        return response

    def delete_file(self, file_id: str) -> bool:
        """
        Delete file from Supabase bucket

        Args:
            file_id: File ID (UUID filename)

        Returns:
            True if deleted successfully
        """
        bucket = self.client.storage.get_bucket(self.bucket_name)
        bucket.remove(file_id)
        return True

    def file_exists(self, file_id: str) -> bool:
        """
        Check if file exists in bucket

        Args:
            file_id: File ID (UUID filename)

        Returns:
            True if file exists
        """
        try:
            self.download_file(file_id)
            return True
        except Exception:
            return False


def get_bucket_service() -> BucketService:
    """Get BucketService instance"""
    return BucketService()
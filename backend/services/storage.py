"""
S3-compatible object storage abstraction (MinIO in dev/prod, AWS S3 if ever needed).

All file content (avatars, proofs, templates, job results) lives in object storage.
Metadata stays in Postgres.

Buckets are auto-created on first access.
"""

import os
from io import BytesIO
from typing import Iterable, Optional

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

S3_ENDPOINT_URL = os.getenv('S3_ENDPOINT_URL', 'http://localhost:9000')
S3_ACCESS_KEY   = os.getenv('S3_ACCESS_KEY', 'excel')
S3_SECRET_KEY   = os.getenv('S3_SECRET_KEY', '')
S3_REGION       = os.getenv('S3_REGION', 'us-east-1')

BUCKET_AVATARS  = 'avatars'
BUCKET_PROOFS   = 'proofs'
BUCKET_RESULTS  = 'job-results'
BUCKET_FILES    = 'files'

ALL_BUCKETS = (BUCKET_AVATARS, BUCKET_PROOFS, BUCKET_RESULTS, BUCKET_FILES)


def _client():
    return boto3.client(
        's3',
        endpoint_url          = S3_ENDPOINT_URL,
        aws_access_key_id     = S3_ACCESS_KEY,
        aws_secret_access_key = S3_SECRET_KEY,
        region_name           = S3_REGION,
        config                = Config(signature_version='s3v4'),
    )


_buckets_ready = False


def ensure_buckets() -> None:
    """Idempotently create the four buckets. Safe to call repeatedly."""
    global _buckets_ready
    if _buckets_ready:
        return
    c = _client()
    for b in ALL_BUCKETS:
        try:
            c.head_bucket(Bucket=b)
        except ClientError as e:
            code = e.response.get('Error', {}).get('Code', '')
            if code in ('404', 'NoSuchBucket', 'NotFound'):
                c.create_bucket(Bucket=b)
            else:
                raise
    _buckets_ready = True


# ── CRUD ──────────────────────────────────────────────────────────────────────

def put(bucket: str, key: str, content: bytes, content_type: str | None = None) -> None:
    ensure_buckets()
    extra = {'ContentType': content_type} if content_type else {}
    _client().put_object(Bucket=bucket, Key=key, Body=content, **extra)


def get(bucket: str, key: str) -> Optional[bytes]:
    ensure_buckets()
    try:
        resp = _client().get_object(Bucket=bucket, Key=key)
        return resp['Body'].read()
    except ClientError as e:
        if e.response.get('Error', {}).get('Code') in ('NoSuchKey', '404'):
            return None
        raise


def stream(bucket: str, key: str, chunk_size: int = 64 * 1024) -> Optional[Iterable[bytes]]:
    """Yield bytes chunks for streaming large files. None if key missing."""
    ensure_buckets()
    try:
        resp = _client().get_object(Bucket=bucket, Key=key)
    except ClientError as e:
        if e.response.get('Error', {}).get('Code') in ('NoSuchKey', '404'):
            return None
        raise
    body = resp['Body']

    def _gen():
        try:
            while True:
                chunk = body.read(chunk_size)
                if not chunk:
                    break
                yield chunk
        finally:
            body.close()

    return _gen()


def exists(bucket: str, key: str) -> bool:
    ensure_buckets()
    try:
        _client().head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as e:
        if e.response.get('Error', {}).get('Code') in ('NoSuchKey', '404'):
            return False
        raise


def delete(bucket: str, key: str) -> None:
    ensure_buckets()
    try:
        _client().delete_object(Bucket=bucket, Key=key)
    except ClientError as e:
        if e.response.get('Error', {}).get('Code') in ('NoSuchKey', '404'):
            return
        raise

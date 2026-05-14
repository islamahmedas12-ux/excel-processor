"""SQLAlchemy ORM models — one per store."""

from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB

from .db import Base


def _utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = 'users'
    email                  = Column(String, primary_key=True)        # lowercase key
    display_email          = Column(String, nullable=False)          # original casing
    username               = Column(String, nullable=False)
    password_hash          = Column(String, nullable=False)
    role                   = Column(String, nullable=False, default='user')
    active                 = Column(Boolean, nullable=False, default=True)
    plan                   = Column(String, nullable=False, default='free')
    plan_expires_at        = Column(DateTime(timezone=True))
    email_verified         = Column(Boolean, nullable=False, default=False)
    verification_token     = Column(String)
    verification_token_exp = Column(DateTime(timezone=True))
    reset_token            = Column(String)
    reset_token_exp        = Column(DateTime(timezone=True))
    bio                    = Column(Text, nullable=False, default='')
    created_at             = Column(DateTime(timezone=True), nullable=False, default=_utc_now)


class Plan(Base):
    __tablename__ = 'plans'
    id   = Column(String, primary_key=True)
    data = Column(JSONB, nullable=False)


class Subscription(Base):
    __tablename__ = 'subscriptions'
    id           = Column(String, primary_key=True)
    email        = Column(String, nullable=False)
    username     = Column(String, nullable=False)
    plan         = Column(String, nullable=False)
    months       = Column(Integer, nullable=False)
    proof_file   = Column(String, nullable=False)
    status       = Column(String, nullable=False, default='pending')
    notes        = Column(Text, nullable=False, default='')
    created_at   = Column(DateTime(timezone=True), nullable=False, default=_utc_now)
    processed_at = Column(DateTime(timezone=True))


class VerificationToken(Base):
    __tablename__ = 'verification_tokens'
    id            = Column(String, primary_key=True)
    access_code   = Column(String, unique=True, nullable=False, index=True)
    owner_email   = Column(String, nullable=False, index=True)
    resource_type = Column(String, nullable=False)
    resource_id   = Column(String, nullable=False, index=True)
    filename      = Column(String, nullable=False)
    size_bytes    = Column(Integer, nullable=False, default=0)
    is_active     = Column(Boolean, nullable=False, default=True)
    created_at    = Column(DateTime(timezone=True), nullable=False, default=_utc_now)


class Job(Base):
    __tablename__ = 'jobs'
    id          = Column(String, primary_key=True)
    owner_email = Column(String, nullable=False, index=True)
    job_type    = Column(String, nullable=False)
    status      = Column(String, nullable=False, default='pending')
    params      = Column(JSONB)
    error       = Column(Text)
    result_ext  = Column(String)
    created_at  = Column(DateTime(timezone=True), nullable=False, default=_utc_now)
    updated_at  = Column(DateTime(timezone=True), nullable=False, default=_utc_now)


class Template(Base):
    __tablename__ = 'templates'
    id          = Column(String, primary_key=True)
    owner_email = Column(String, nullable=False, index=True)
    name        = Column(String, nullable=False)
    description = Column(Text, nullable=False, default='')
    filename    = Column(String, nullable=False)
    size_bytes  = Column(Integer, nullable=False, default=0)
    sha256      = Column(String, nullable=False)
    created_at  = Column(DateTime(timezone=True), nullable=False, default=_utc_now)
    updated_at  = Column(DateTime(timezone=True), nullable=False, default=_utc_now)


class File(Base):
    __tablename__ = 'files'
    id          = Column(String, primary_key=True)
    owner_email = Column(String, nullable=False, index=True)
    name        = Column(String, nullable=False)
    size_bytes  = Column(Integer, nullable=False, default=0)
    category_id = Column(String)
    api_config  = Column(JSONB)
    created_at  = Column(DateTime(timezone=True), nullable=False, default=_utc_now)
    expires_at  = Column(DateTime(timezone=True))


class Result(Base):
    __tablename__ = 'results'
    id             = Column(String, primary_key=True)
    owner_email    = Column(String, nullable=False, index=True)
    kind           = Column(String, nullable=False)  # 'xlsx' or 'pdf'
    source_file_id = Column(String, nullable=False)
    source_file_name = Column(String, nullable=False)
    name           = Column(String, nullable=False)
    size_bytes     = Column(Integer, nullable=False, default=0)
    created_at     = Column(DateTime(timezone=True), nullable=False, default=_utc_now)
    updated_at     = Column(DateTime(timezone=True), nullable=False, default=_utc_now)
    expires_at     = Column(DateTime(timezone=True))

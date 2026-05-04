"""
Pydantic Schemas for API Requests
=================================
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any


class CellInput(BaseModel):
    """Single cell input for execute endpoint"""
    cell: str = Field(..., description="Cell coordinates (e.g., C11)")
    value: Any = Field(..., description="Value to set")


class ExecuteRequest(BaseModel):
    """Request for execute endpoint"""
    inputs: List[CellInput] = Field(..., description="Cells to update with values")
    outputs: List[str] = Field(..., description="Cells to read after execution")
    sheet_name: Optional[str] = None


class ExecuteResponse(BaseModel):
    """Response from execute endpoint"""
    success: bool
    results: Dict[str, Any]
    file_id: str
    sheet: str


class WriteRequest(BaseModel):
    """Request for write endpoint"""
    updates: List[CellInput] = Field(..., description="Cells to update")
    sheet_name: Optional[str] = None
    preserve_format: bool = True


class ReadRequest(BaseModel):
    """Request for read endpoint"""
    cells: Optional[List[str]] = None
    sheet_name: Optional[str] = None


class FileInfo(BaseModel):
    """File information response"""
    file_id: str
    original_filename: str
    url: str
    bucket: str
    created_at: Optional[str] = None
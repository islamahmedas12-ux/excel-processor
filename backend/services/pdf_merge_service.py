"""
PDF merge + optional cover page generation.
Uses pypdf for merging and fpdf2 for the cover page.
"""
from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Optional


# ── Cover page ───────────────────────────────────────────────────────────────

def _build_cover(
    title: str,
    subtitle: str = '',
    date: str = '',
    brand: str = 'Excel Processor',
) -> bytes:
    """Return a single-page PDF cover as bytes (A4, portrait)."""
    from fpdf import FPDF

    pdf = FPDF(orientation='P', unit='mm', format='A4')
    pdf.set_auto_page_break(False)
    pdf.add_page()

    W, H = 210, 297  # A4 mm

    # Dark header band
    pdf.set_fill_color(30, 41, 59)       # slate-800
    pdf.rect(0, 0, W, 80, style='F')

    # Accent line under header
    pdf.set_fill_color(79, 70, 229)      # indigo-600
    pdf.rect(0, 80, W, 4, style='F')

    # Brand name top-right inside header
    pdf.set_text_color(148, 163, 184)    # slate-400
    pdf.set_font('Helvetica', size=9)
    pdf.set_xy(0, 8)
    pdf.cell(W - 12, 8, brand, align='R')

    # Title — centred in header band
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Helvetica', 'B', size=26)
    pdf.set_xy(20, 26)
    pdf.multi_cell(W - 40, 10, title, align='C')

    # Subtitle
    if subtitle:
        pdf.set_font('Helvetica', size=13)
        pdf.set_text_color(203, 213, 225)   # slate-300
        pdf.set_xy(20, 64)
        pdf.cell(W - 40, 8, subtitle, align='C')

    # Date
    display_date = date or datetime.now(timezone.utc).strftime('%Y-%m-%d')
    pdf.set_font('Helvetica', size=9)
    pdf.set_text_color(100, 116, 139)        # slate-500
    pdf.set_xy(20, H - 18)
    pdf.cell(W - 40, 8, display_date, align='C')

    # Bottom accent line
    pdf.set_fill_color(79, 70, 229)
    pdf.rect(0, H - 6, W, 6, style='F')

    return bytes(pdf.output())


# ── Merge ────────────────────────────────────────────────────────────────────

def merge_pdfs(
    pdf_contents: list[bytes],
    cover_title: Optional[str] = None,
    cover_subtitle: str = '',
    cover_date: str = '',
) -> bytes:
    """
    Merge a list of PDF byte strings, optionally prepending a cover page.
    Returns the merged PDF as bytes.
    """
    from pypdf import PdfWriter

    writer = PdfWriter()

    if cover_title:
        cover_bytes = _build_cover(cover_title, cover_subtitle, cover_date)
        import pypdf
        cover_reader = pypdf.PdfReader(io.BytesIO(cover_bytes))
        for page in cover_reader.pages:
            writer.add_page(page)

    for pdf_bytes in pdf_contents:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        for page in reader.pages:
            writer.add_page(page)

    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()

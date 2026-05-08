"""
XLSX cell patching via direct ZIP + string manipulation.

The key property: the sheet XML is modified with regex string replacement,
never parsed and re-serialised by ElementTree. This means namespace
declarations, the <drawing> reference, every attribute, whitespace — all
stay byte-for-byte identical. Only the <v> / <is> content of the targeted
cells changes. All other ZIP entries (xl/media/, xl/drawings/, _rels/ …)
are copied verbatim so images and charts are guaranteed to survive.
"""

import re
import zipfile
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple
from xml.etree import ElementTree as ET   # used ONLY for read-only parsing, never serialisation

NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
NS_R    = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'


# ── helpers ────────────────────────────────────────────────────────────────

def _xml_esc(s: str) -> str:
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def _parse_ref(ref: str) -> Tuple[str, int]:
    m = re.match(r'^([A-Z]+)(\d+)$', ref.upper())
    if not m:
        raise ValueError(f'Invalid cell reference: {ref!r}')
    return m.group(1), int(m.group(2))


def _cell_tag(ref: str, value: Any) -> str:
    """Build a complete <c …> element string for a new (not-yet-existing) cell."""
    if value is None:
        return f'<c r="{ref}"/>'
    if isinstance(value, bool):
        return f'<c r="{ref}" t="b"><v>{"1" if value else "0"}</v></c>'
    if isinstance(value, (int, float)):
        return f'<c r="{ref}"><v>{value}</v></c>'
    return f'<c r="{ref}" t="inlineStr"><is><t>{_xml_esc(str(value))}</t></is></c>'


# ── per-cell patch (string-only, no ET serialisation) ──────────────────────

def _patch_existing_cell(xml: str, ref: str, value: Any) -> Tuple[str, bool]:
    """
    Find <c r="REF"…>…</c> and replace its content + t attribute.
    Returns (new_xml, True) if found, (xml, False) if the cell is absent.
    """
    # New content / type
    if value is None:
        new_t, new_inner = None, ''
    elif isinstance(value, bool):
        new_t, new_inner = 'b', '<v>1</v>' if value else '<v>0</v>'
    elif isinstance(value, (int, float)):
        new_t, new_inner = None, f'<v>{value}</v>'     # no t= for numbers
    else:
        new_t = 'inlineStr'
        new_inner = f'<is><t>{_xml_esc(str(value))}</t></is>'

    def _replace(m: re.Match) -> str:
        open_tag = m.group(1)
        # strip any existing t="…" from the opening tag
        open_tag = re.sub(r'\s+t="[^"]*"', '', open_tag)
        if new_t:
            open_tag = open_tag.rstrip('>') + f' t="{new_t}">'
        return f'{open_tag}{new_inner}</c>'

    # <c \b ensures we don't accidentally match <col> etc.
    pattern = re.compile(
        r'(<c\b[^>]*\br="' + re.escape(ref) + r'"[^>]*>).*?(</c>)',
        re.DOTALL,
    )
    new_xml, n = pattern.subn(_replace, xml, count=1)
    return new_xml, n > 0


def _inject_cell_in_row(xml: str, row_num: int, ref: str, value: Any) -> Tuple[str, bool]:
    """Append a new <c> element inside an existing <row r="N">…</row>."""
    cell = _cell_tag(ref, value)
    pattern = re.compile(
        r'(<row\b[^>]*\br="' + str(row_num) + r'"[^>]*>)(.*?)(</row>)',
        re.DOTALL,
    )
    new_xml, n = pattern.subn(lambda m: m.group(1) + m.group(2) + cell + m.group(3), xml, count=1)
    return new_xml, n > 0


def _inject_row_with_cell(xml: str, row_num: int, ref: str, value: Any) -> str:
    """Insert a brand-new <row> (with one cell) before </sheetData>."""
    row_xml = f'<row r="{row_num}">{_cell_tag(ref, value)}</row>'
    return xml.replace('</sheetData>', row_xml + '</sheetData>', 1)


def _patch_sheet_xml(sheet_bytes: bytes, updates: Dict[str, Any]) -> bytes:
    """Return sheet XML with updated cell values; everything else is untouched."""
    xml = sheet_bytes.decode('utf-8')

    # First pass: update cells that already exist
    missing: Dict[str, Any] = {}
    for ref, value in updates.items():
        ref = ref.upper()
        xml, found = _patch_existing_cell(xml, ref, value)
        if not found:
            missing[ref] = value

    # Second pass: add cells that were absent, grouped by row
    by_row: Dict[int, Dict[str, Any]] = {}
    for ref, value in missing.items():
        _, row_num = _parse_ref(ref)
        by_row.setdefault(row_num, {})[ref] = value

    for row_num, cells in sorted(by_row.items()):
        for ref, value in cells.items():
            xml, row_found = _inject_cell_in_row(xml, row_num, ref, value)
            if not row_found:
                xml = _inject_row_with_cell(xml, row_num, ref, value)

    return xml.encode('utf-8')


# ── sheet state patching (for PDF sheet selection) ──────────────────────────

def _patch_sheet_state(sheet_bytes: bytes, visible: bool) -> bytes:
    """Set sheetState attribute on the <sheet> element (used in workbook.xml)."""
    xml = sheet_bytes.decode('utf-8')
    if visible:
        xml = re.sub(r'\s+state="[^"]*"', '', xml)
    else:
        xml = re.sub(r'\s+state="[^"]*"', '', xml)   # remove existing first
        xml = xml  # hidden is done via workbook.xml, not the sheet file itself
    return xml.encode('utf-8')


# ── workbook-level sheet visibility (for PDF sheet selection) ───────────────

def filter_sheets(file_content: bytes, visible_sheets: List[str]) -> bytes:
    """
    Return an XLSX where only `visible_sheets` are visible (others hidden).
    Uses direct ZIP + string manipulation — never openpyxl-saves — so images survive.
    """
    buf_in = BytesIO(file_content)
    with zipfile.ZipFile(buf_in, 'r') as zin:
        # Patch workbook.xml: set state="hidden" on sheets not in visible_sheets
        wb_bytes = zin.read('xl/workbook.xml')
        wb_xml   = wb_bytes.decode('utf-8')

        def _patch_sheet_elem(m: re.Match) -> str:
            tag = m.group(0)
            name_m = re.search(r'\bname="([^"]*)"', tag)
            if not name_m:
                return tag
            name = name_m.group(1)
            # strip existing state= attribute
            tag = re.sub(r'\s+state="[^"]*"', '', tag)
            if name not in visible_sheets:
                tag = tag.rstrip('/>') + ' state="hidden"/>'
            return tag

        wb_xml = re.sub(r'<sheet\b[^/]*/>', _patch_sheet_elem, wb_xml)

        # Ensure at least one sheet is visible
        if not re.search(r'<sheet\b(?!.*\bstate=)', wb_xml):
            # All sheets got hidden — remove state from the first one
            wb_xml = re.sub(
                r'(<sheet\b[^/]*?)\s+state="hidden"',
                r'\1',
                wb_xml,
                count=1,
            )

        buf_out = BytesIO()
        with zipfile.ZipFile(buf_out, 'w', zipfile.ZIP_DEFLATED) as zout:
            for info in zin.infolist():
                if info.filename == 'xl/workbook.xml':
                    zout.writestr(info, wb_xml.encode('utf-8'))
                else:
                    zout.writestr(info, zin.read(info.filename))

        buf_out.seek(0)
        return buf_out.read()


# ── sheet name listing ──────────────────────────────────────────────────────

def get_sheet_names(file_content: bytes) -> List[str]:
    with zipfile.ZipFile(BytesIO(file_content), 'r') as zin:
        wb_root = ET.fromstring(zin.read('xl/workbook.xml'))
        sheets  = wb_root.find(f'{{{NS_MAIN}}}sheets')
        return [s.get('name', '') for s in (sheets or [])]


# ── ZIP-safe write entry point ──────────────────────────────────────────────

def _get_sheet_path(zin: zipfile.ZipFile, sheet_name: Optional[str]) -> str:
    wb_root = ET.fromstring(zin.read('xl/workbook.xml'))
    sheets  = wb_root.find(f'{{{NS_MAIN}}}sheets')
    if sheets is None:
        raise ValueError('No <sheets> in workbook.xml')

    sheet_el = (
        sheets[0] if sheet_name is None
        else next((s for s in sheets if s.get('name') == sheet_name), None)
    )
    if sheet_el is None:
        raise ValueError(f'Sheet {sheet_name!r} not found')

    r_id = sheet_el.get(f'{{{NS_R}}}id')
    rels  = ET.fromstring(zin.read('xl/_rels/workbook.xml.rels'))
    for rel in rels:
        if rel.get('Id') == r_id:
            t = rel.get('Target', '')
            return f'xl/{t}' if not t.startswith('/') else t.lstrip('/')
    raise ValueError(f'Relationship {r_id!r} not found')


def write_cells(
    file_content: bytes,
    updates: Dict[str, Any],
    sheet_name: Optional[str] = None,
) -> bytes:
    """
    Write cell values into an XLSX, preserving every other byte in the archive.
    Images, charts, drawings, styles — all copied verbatim from the original.
    """
    buf_in = BytesIO(file_content)
    with zipfile.ZipFile(buf_in, 'r') as zin:
        sheet_path    = _get_sheet_path(zin, sheet_name)
        patched_sheet = _patch_sheet_xml(zin.read(sheet_path), updates)

        buf_out = BytesIO()
        with zipfile.ZipFile(buf_out, 'w', zipfile.ZIP_DEFLATED) as zout:
            for info in zin.infolist():
                data = patched_sheet if info.filename == sheet_path else zin.read(info.filename)
                zout.writestr(info, data)

        buf_out.seek(0)
        return buf_out.read()

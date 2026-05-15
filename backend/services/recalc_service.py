"""
Recalc Service (thin client)
============================
Formula recalculation is delegated entirely to the standalone `calc-service`
microservice, which runs the real LibreOffice Calc engine. This module does
NOT compute any formula itself — it only ships the workbook to calc-service
and returns the recalculated bytes.

calc-service forces LibreOffice to recalculate on load (via a pre-seeded
profile) so the returned .xlsx has computed cached values that openpyxl can
read with data_only=True.
"""

import os

import requests

from excel_processor.errors import FileSaveError

CALC_SERVICE_URL = os.getenv("CALC_SERVICE_URL", "http://calc-service:8100")
RECALC_TIMEOUT = int(os.getenv("CALC_CLIENT_TIMEOUT", "180"))


def recalc_xlsx(xlsx_bytes: bytes, filename: str) -> bytes:
    """POST the workbook to calc-service and return the recalculated bytes."""
    try:
        resp = requests.post(
            f"{CALC_SERVICE_URL}/recalc",
            params={"filename": filename},
            data=xlsx_bytes,
            headers={"Content-Type": "application/octet-stream"},
            timeout=RECALC_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise FileSaveError(f"calc-service unreachable: {exc}")

    if resp.status_code != 200:
        detail = resp.text[:500]
        raise FileSaveError(
            f"calc-service returned {resp.status_code}: {detail}"
        )

    return resp.content


class RecalcService:
    def recalc(self, xlsx_bytes: bytes, filename: str) -> bytes:
        return recalc_xlsx(xlsx_bytes, filename)


def get_recalc_service() -> "RecalcService":
    return RecalcService()

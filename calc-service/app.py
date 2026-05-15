"""
Calc Service
============
A standalone microservice whose only job is to recalculate the formulas in an
.xlsx file using the real LibreOffice Calc engine and return the workbook with
computed cached values persisted.

The main application never computes a formula itself — it POSTs the workbook
here and reads back the result. LibreOffice is forced to recalculate on load
via a pre-seeded user profile (lo-profile/user/registrymodifications.xcu sets
OOXMLRecalcMode = Always).
"""

import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

from flask import Flask, request, Response, jsonify

app = Flask(__name__)

# Template LibreOffice profile baked into the image. It is copied per-request
# so concurrent soffice invocations never share a profile (which would error
# with "another instance is accessing this profile").
PROFILE_TEMPLATE = Path("/opt/lo-profile")
TMPBASE = Path("/tmp/calc")
SOFFICE = shutil.which("soffice") or "/usr/bin/soffice"
CONVERT_TIMEOUT = int(os.getenv("CALC_TIMEOUT", "120"))

TMPBASE.mkdir(parents=True, exist_ok=True)


def _recalculate(xlsx_bytes: bytes, filename: str) -> bytes:
    """Run LibreOffice headless to recalc all formulas and persist values."""
    work = TMPBASE / uuid.uuid4().hex
    profile = work / "profile"
    in_dir = work / "in"
    out_dir = work / "out"
    for d in (in_dir, out_dir):
        d.mkdir(parents=True, exist_ok=True)

    try:
        # Per-request copy of the recalc-forcing profile.
        shutil.copytree(PROFILE_TEMPLATE, profile)

        safe_name = os.path.basename(filename) or "input.xlsx"
        if not safe_name.lower().endswith(".xlsx"):
            safe_name += ".xlsx"
        # Input and output live in SEPARATE directories so LibreOffice never
        # tries to overwrite its own source file (which silently produces no
        # output and leaves formulas unrecalculated).
        input_path = in_dir / safe_name
        input_path.write_bytes(xlsx_bytes)

        proc = subprocess.run(
            [
                SOFFICE,
                "--headless",
                "--norestore",
                "--nologo",
                f"-env:UserInstallation=file://{profile}",
                "--convert-to", "xlsx:Calc MS Excel 2007 XML",
                "--outdir", str(out_dir),
                str(input_path),
            ],
            capture_output=True,
            text=True,
            timeout=CONVERT_TIMEOUT,
        )

        out_path = out_dir / (Path(safe_name).stem + ".xlsx")
        if not out_path.exists():
            produced = list(out_dir.glob("*.xlsx"))
            if produced:
                out_path = produced[0]
            else:
                raise RuntimeError(
                    f"LibreOffice produced no output. rc={proc.returncode} "
                    f"stdout={proc.stdout!r} stderr={proc.stderr!r}"
                )

        return out_path.read_bytes()
    finally:
        shutil.rmtree(work, ignore_errors=True)


@app.get("/health")
def health():
    return jsonify({"status": "healthy", "service": "calc-service"})


@app.post("/recalc")
def recalc():
    """
    Accepts the raw .xlsx bytes in the request body (or multipart field
    `file`), returns the recalculated .xlsx bytes.
    """
    filename = request.args.get("filename", "input.xlsx")

    # Multipart upload only when the client explicitly sends multipart/form-data.
    # Otherwise treat the raw request body as the .xlsx bytes (this is how the
    # backend client calls us). Reading request.files on a non-multipart body
    # would consume the stream and leave get_data() empty.
    ctype = request.content_type or ""
    if ctype.startswith("multipart/form-data") and request.files.get("file"):
        up = request.files["file"]
        filename = up.filename or filename
        data = up.read()
    else:
        data = request.get_data(cache=False, as_text=False)

    if not data:
        return jsonify({"error": "empty body — send xlsx bytes"}), 400

    try:
        result = _recalculate(data, filename)
    except subprocess.TimeoutExpired:
        return jsonify({"error": "recalculation timed out"}), 504
    except Exception as exc:  # noqa: BLE001 — boundary, report cleanly
        return jsonify({"error": f"recalculation failed: {exc}"}), 500

    return Response(
        result,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8100)

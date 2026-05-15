FROM python:3.11-slim

# LibreOffice Calc (headless) is the real formula engine. No Java needed for
# Calc recalculation; skip the JRE to keep the image lean.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libreoffice-core libreoffice-calc \
        fonts-dejavu-core fonts-liberation \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Recalc-forcing LibreOffice profile template (OOXMLRecalcMode = Always).
COPY lo-profile/ /opt/lo-profile/
COPY app.py .

# Pre-warm: run one headless conversion at build time so the LibreOffice
# profile is fully bootstrapped and the first real request is fast.
RUN mkdir -p /tmp/warm \
    && printf 'PK' > /tmp/warm/probe.txt \
    && (soffice --headless --norestore --nologo \
        -env:UserInstallation=file:///tmp/warm/profile \
        --convert-to xlsx --outdir /tmp/warm /tmp/warm/probe.txt || true) \
    && rm -rf /tmp/warm

EXPOSE 8100

# soffice is CPU-bound and single-threaded per process; a small worker pool
# with a generous timeout handles concurrent recalcs safely.
CMD ["gunicorn", "--bind", "0.0.0.0:8100", "--workers", "3", \
     "--timeout", "180", "app:app"]

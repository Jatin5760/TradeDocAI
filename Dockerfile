FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=utf-8 \
    NODE_ENV=production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    fontconfig \
    perl \
    wget \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# ============================================================
# TinyTeX (pdflatex) — slim alternative to texlive
# ============================================================
RUN wget -qO- "https://yihui.org/tinytex/install-bin-unix.sh" | sh

ENV PATH="/root/.TinyTeX/bin/x86_64-linux:${PATH}"

# ============================================================
# Required LaTeX packages
# ============================================================
RUN tlmgr update --self && tlmgr install \
    geometry \
    fancyhdr \
    enumitem \
    lm \
    tools \
    parskip \
    helvetic \
    microtype

RUN pdflatex --version

FROM node:20-bookworm-slim AS ui-build
WORKDIR /ui-app
COPY ui-app/package*.json ./
RUN npm ci
COPY ui-app/ ./
RUN npm run build

FROM base AS runtime

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agents/ ./agents/
COPY templates/ ./templates/
COPY server.py .
COPY --from=ui-build /ui-app/out ./ui-app/out
COPY --from=ui-build /ui-app/public/schemas ./ui-app/public/schemas
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /app/output_confirmations/temp /app/pdf_temp

ENV PORT=5055 \
    APP_ENV=production \
    MONGO_DB_NAME=tradedocai \
    PDF_RETENTION_HOURS=24

EXPOSE 5055

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import json, urllib.request; r=urllib.request.urlopen('http://127.0.0.1:5055/health/live', timeout=3); raise SystemExit(0 if r.status == 200 else 1)"

ENTRYPOINT ["/entrypoint.sh"]

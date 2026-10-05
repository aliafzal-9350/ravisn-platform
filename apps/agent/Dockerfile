# Multi-stage Dockerfile with Python 3.11-slim and FFmpeg for Enterprise Voice & Audio Processing
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt constraints.txt ./
# constraints.txt pins the exact versions the test suite passed with.
RUN pip install --no-cache-dir --user -r requirements.txt -c constraints.txt

# Final runtime image
FROM python:3.11-slim

WORKDIR /app

# Install runtime FFmpeg and PostgreSQL libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed python packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

COPY . .

EXPOSE 8000

# Starts sanitized uvicorn backend
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

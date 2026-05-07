# Multi-stage build: Node frontend + Python backend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

# Install system deps for bcrypt
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libc6-dev bash curl && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY --from=frontend /app/backend/static/ backend/static/

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

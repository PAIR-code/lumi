FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Enable uv cache for faster builds
ENV UV_CACHE_DIR=/root/.cache/uv

# Copy only dependency files first for better layer caching
COPY pyproject.toml .
COPY .python-version* ./
# Copy lock file if it exists
COPY uv.lock* ./

# Install dependencies using uv
# Use --no-install-project to only install dependencies, not the project itself
RUN uv sync --frozen --no-install-project --no-dev || uv sync --no-install-project --no-dev

# Copy backend code
COPY backend ./backend

# Set working directory to backend for running the app
WORKDIR /app/backend

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Run the application
# Use uv run to ensure we're using the correct environment
CMD ["uv", "run", "--no-project", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]

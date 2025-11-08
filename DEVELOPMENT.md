# Development Guide

This project uses **uv** for fast Python package management and modern
development workflows.

## Quick Start

```bash
# 1. Run the setup script (installs uv, dependencies, pre-commit)
./setup_precommit.sh

# 2. Start developing!
cd backend && uv run uvicorn main:app --reload
```

## Prerequisites

- Python 3.11+
- Node.js 18+ and npm (for frontend)
- Docker and Docker Compose

## Installation

### Automatic Setup

```bash
./setup_precommit.sh
```

This installs:

- ✅ uv (if not present)
- ✅ All Python dependencies
- ✅ Pre-commit hooks
- ✅ Development tools

### Manual Setup

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync --all-extras

# Install pre-commit
uv tool install pre-commit
pre-commit install
```

## Common Commands

### Backend (Python)

```bash
# Install dependencies
uv sync

# Run backend server
cd backend
uv run uvicorn main:app --reload

# Run tests
uv run pytest

# Format code
uv run ruff format backend/

# Lint code
uv run ruff check --fix backend/

# Type check
uv run mypy backend/

# Run Python script
uv run python backend/scripts/import_papers_local.py
```

### Frontend (TypeScript)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm start

# Build for production
npm run build:prod

# Run linter
npm run lint

# Run tests
npm test
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose build
docker-compose up

# Run specific service
docker-compose up backend
docker-compose up frontend

# Stop services
docker-compose down
```

## Managing Dependencies

### Add Dependencies

```bash
# Add production dependency
uv add fastapi

# Add with specific version
uv add "fastapi>=0.115.0"

# Add dev dependency
uv add --dev pytest

# Add from requirements file (migration)
uv add -r requirements.txt
```

### Update Dependencies

```bash
# Update all dependencies
uv sync --upgrade

# Update specific package
uv add --upgrade fastapi

# Reinstall from lock file
uv sync
```

### Remove Dependencies

```bash
uv remove package-name
```

## Project Structure

```text
lumi-litellm/
├── backend/              # Python FastAPI backend
│   ├── api/             # API endpoints
│   ├── import_pipeline/ # Document processing
│   ├── llm_models/      # LLM integration
│   ├── models/          # Data models
│   ├── services/        # Business logic
│   └── main.py          # Entry point
├── frontend/            # TypeScript/Lit frontend
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── shared/
│   └── package.json
├── pyproject.toml       # Python dependencies & config
└── docker-compose.yml   # Docker orchestration
```

## Development Workflow

### 1. Make Changes

Edit files in `backend/` or `frontend/`

### 2. Format & Lint (Automatic)

Pre-commit hooks run automatically on `git commit`:

```bash
git add .
git commit -m "Your changes"
```

### 3. Manual Checks

```bash
# Run all pre-commit hooks
pre-commit run --all-files

# Or run specific checks
uv run ruff format backend/
uv run mypy backend/
cd frontend && npm run lint
```

### 4. Test

```bash
# Backend tests
uv run pytest

# Frontend tests
cd frontend && npm test
```

## Code Quality Tools

### Python (Backend)

- **Ruff**: Fast linting and formatting (replaces Black, isort, flake8)
- **mypy**: Static type checking
- **pytest**: Testing framework

### TypeScript (Frontend)

- **ESLint**: Linting
- **Prettier**: Code formatting
- **Web Test Runner**: Testing

### Docker Tools

- **hadolint**: Dockerfile linting

## Environment Variables

Copy example files and configure:

```bash
# Backend
cp .env.example .env

# Frontend
cp frontend/firebase_config.example.ts frontend/firebase_config.ts
```

## Troubleshooting

### uv not found

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Reload shell
source ~/.zshrc  # or ~/.bashrc
```

### Dependencies not syncing

```bash
# Remove and recreate environment
rm -rf .venv
uv sync --all-extras
```

### Pre-commit hooks failing

```bash
# Install/update hooks
pre-commit install
pre-commit autoupdate

# Run manually to see errors
pre-commit run --all-files
```

### Frontend issues

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Docker issues

```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up
```

## Why uv?

- ⚡ **10-100x faster** than pip
- 🔒 **Reliable**: Consistent dependency resolution
- 🦀 **Modern**: Built in Rust, uses Python standards
- 🎯 **Simple**: Automatic virtual environment management
- ✅ **Compatible**: Works with `pyproject.toml`

## Additional Resources

- [uv Documentation](https://docs.astral.sh/uv/)
- [Pre-commit Quick Start](.pre-commit-quickstart.md)
- [Pre-commit Full Guide](PRECOMMIT_SETUP.md)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Lit Documentation](https://lit.dev/)

## Getting Help

1. Check the troubleshooting section above
2. Review the [Pre-commit Setup Guide](PRECOMMIT_SETUP.md)
3. Check project documentation in `README.md`
4. Review error messages carefully - they usually point to the solution

---

Happy coding! 🚀

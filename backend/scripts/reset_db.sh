#!/bin/bash
# Reset database and storage for fresh paper imports

echo "🧹 Resetting Lumi backend..."

# Stop backend if running
echo "Stopping backend..."
pkill -f "python main.py" 2>/dev/null || true
sleep 2

# Check if SurrealDB is running and stop it
echo "Stopping SurrealDB..."
pkill -f "surreal" 2>/dev/null || true
docker stop surrealdb 2>/dev/null || true
sleep 2

# Reset storage
echo "Clearing local storage..."
rm -rf local_image_bucket/*
mkdir -p local_image_bucket

echo "✅ Reset complete!"
echo ""
echo "To start fresh:"
echo "  1. Start SurrealDB:"
echo "     docker run -d --name surrealdb -p 8000:8000 surrealdb/surrealdb:latest start --log trace --user root --pass root memory"
echo ""
echo "  2. Start backend:"
echo "     cd backend && uv run python main.py"

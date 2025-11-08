#!/bin/bash

# Pre-commit setup script for lumi-litellm
# This script installs uv, sets up the environment, and configures pre-commit hooks

set -e

echo "🚀 Setting up lumi-litellm development environment..."
echo ""

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "📦 uv is not installed. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh

    # Source the shell config to get uv in PATH
    if [ -f "$HOME/.bashrc" ]; then
        source "$HOME/.bashrc"
    elif [ -f "$HOME/.zshrc" ]; then
        source "$HOME/.zshrc"
    fi

    # Check again
    if ! command -v uv &> /dev/null; then
        echo "❌ Error: uv installation failed. Please install manually:"
        echo "   curl -LsSf https://astral.sh/uv/install.sh | sh"
        exit 1
    fi
fi

echo "✓ uv found: $(uv --version)"
echo ""

# Sync dependencies
echo "📦 Installing project dependencies with uv..."
uv sync --all-extras

echo "✓ Dependencies installed successfully!"
echo ""

# Install pre-commit using uv tool
echo "🔧 Installing pre-commit..."
uv tool install pre-commit

# Verify installation
if ! command -v pre-commit &> /dev/null; then
    echo "❌ Error: pre-commit installation failed"
    exit 1
fi

echo "✓ pre-commit installed: $(pre-commit --version)"
echo ""

# Install the hooks
echo "🔗 Installing pre-commit hooks..."
pre-commit install

echo "✓ Pre-commit hooks installed successfully!"
echo ""

# Optional: Run on all files
read -p "Would you like to run pre-commit on all files now? This may take a few minutes. (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔍 Running pre-commit on all files..."
    echo "Note: This may auto-fix some files. Review changes before committing."
    echo ""
    pre-commit run --all-files || true
    echo ""
    echo "✓ Pre-commit check complete!"
    echo ""
    echo "⚠️  If there were any failures, please fix them before committing."
else
    echo ""
    echo "ℹ️  Skipped running on all files."
    echo "   You can run it manually later with: pre-commit run --all-files"
fi

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "📚 Key commands:"
echo "   • Install deps:        uv sync"
echo "   • Add dependency:      uv add <package>"
echo "   • Add dev dependency:  uv add --dev <package>"
echo "   • Run pre-commit:      pre-commit run --all-files"
echo "   • Update pre-commit:   pre-commit autoupdate"
echo ""
echo "   • Run backend:         cd backend && uvicorn main:app --reload"
echo "   • Run frontend:        cd frontend && npm start"
echo ""
echo "📖 Documentation:"
echo "   • Quick start:  .pre-commit-quickstart.md"
echo "   • Full guide:   PRECOMMIT_SETUP.md"
echo ""
echo "Happy coding! 🎉"

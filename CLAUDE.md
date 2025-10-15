# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lumi is an AI-powered web application that helps users read and understand arXiv research papers. It uses Google's Gemini AI to provide smart annotations, interactive highlights with Q&A, and figure explanations.

**Live Demo**: https://lumi.withgoogle.com
**Note**: Only processes arXiv papers under Creative Commons license

## Development Commands

### Frontend (in `frontend/` directory)

```bash
# Initial setup
npm install
cp index.example.html index.html
cp firebase_config.example.ts firebase_config.ts

# Development
npm run start              # Build and serve on http://localhost:4201
npm run serve             # Serve only (after build)
npm run build             # Development build
npm run build:prod        # Production build

# Testing and quality
npm run test              # Run tests with Web Test Runner
npm run test:watch        # Run tests in watch mode
npm run lint              # ESLint

# Storybook
npm run storybook         # Start Storybook on http://localhost:6006
npm run build-storybook   # Build Storybook

# Deployment
npm run deploy:prod       # Deploy to Google App Engine
```

### Backend Functions (in `functions/` directory)

```bash
# Initial setup
cd functions
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp models/api_config.example.py models/api_config.py

# Development
firebase emulators:start                                    # Start emulators
firebase emulators:start --import .local_emulator_data      # With saved data

# Testing
python3 -m unittest discover -p "*_test.py"                # Unit tests
FUNCTION_RUN_MODE=testing firebase emulators:exec 'python3 -m unittest discover -p "main_integration.py"'  # Integration test

# Deployment
firebase deploy --only functions
```

### Utility Scripts

```bash
# Local paper import for testing
python3 scripts/import_papers_local.py

# Firebase data management (in functions/ directory)
python3 script_firebase_import.py --csv_file <path> [--delay <seconds>]     # Import papers from CSV
python3 script_firebase_list.py --loading_status <status>                   # List papers by status
python3 script_firebase_check_status.py --paper_ids_file <path>             # Check paper statuses
python3 script_firebase_update_status.py --paper_ids_file <path> --status <status>  # Update statuses
python3 script_firebase_update_collections.py [--overwrite_paper_ids]      # Update collection metadata
```

## Architecture

### Tech Stack
- **Frontend**: TypeScript, Lit Web Components, MobX, Material Design, Webpack
- **Backend**: Python Firebase Cloud Functions, Gemini AI
- **Infrastructure**: Firebase (Firestore, Auth, Storage), Google Cloud Platform

### Key Directories

```
frontend/src/
├── components/         # Lit web components
├── services/          # Business logic services
├── shared/            # Shared types and utilities
├── core/              # Core application logic
└── stories/           # Storybook stories

functions/
├── models/            # AI model integrations (Gemini)
├── import_pipeline/   # Document processing pipeline
├── answers/           # Q&A functionality
└── shared/            # Shared utilities and types
```

### Firebase Configuration
- **Emulator Suite**: All services run locally via `firebase emulators:start`
- **Firestore**: Document storage with security rules
- **Cloud Functions**: Python-based backend processing
- **Storage**: PDF and image file storage
- **Data Connect**: PostgreSQL integration (in `dataconnect/`)

### Document Processing Pipeline
1. ArXiv paper import and LaTeX processing
2. PDF text extraction and tokenization
3. Image extraction and computer vision analysis
4. AI-generated annotations at multiple granularities
5. Interactive highlighting and Q&A capabilities

### Testing Patterns
- **Frontend**: Web Test Runner with Playwright for browser testing
- **Backend**: Python unittest framework with parameterized tests
- **Integration**: Firebase emulator testing with `FUNCTION_RUN_MODE=testing`
- **Component Testing**: Storybook for isolated component development and visual testing

### State Management
- **MobX stores** in `frontend/src/services/` handle application state
- **Firebase Firestore** provides persistent document storage
- **Context providers** (`@lit/context`) for dependency injection across components
- **Router5** manages client-side routing and navigation state

### AI Integration
- **Gemini AI** for document analysis and Q&A
- **Computer vision** for figure explanations
- **Natural language processing** for text analysis
- **Multi-granularity summaries** (sentence, paragraph, section levels)

## Configuration Files

- `firebase.json` - Firebase project and emulator configuration
- `frontend/webpack.config.ts` - Webpack build configuration
- `frontend/tsconfig.json` - TypeScript compiler options
- `functions/requirements.txt` - Python dependencies
- `dataconnect/dataconnect.yaml` - Data Connect schema

## Development Notes

- **API Keys**: Configure Gemini AI key in `functions/models/api_config.py`
- **Firebase Config**: Set up in `frontend/firebase_config.ts`
- **Local Development**: Always use Firebase emulators for full-stack development
- **Storybook**: Used for component development and testing in isolation
- **Mobile Support**: Responsive design tested on both desktop and mobile
- **Paper Processing**: Limited to Creative Commons licensed arXiv papers
- **Custom CSS Loader**: Uses `lit-css-loader.js` for SCSS processing in Lit components
- **Hot Reloading**: Webpack dev server provides fast development feedback

## Deployment

- **Frontend**: Google App Engine via `npm run deploy:prod`
- **Functions**: Firebase via `firebase deploy --only functions`
- **Emulator Data**: Exported/imported via `.local_emulator_data`
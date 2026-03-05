# GestionSkills (Frontend)

## Overview
GestionSkills is an Angular frontend for managing professional skills (CRUD + search + badges/scoreboard). It is designed to work with a backend REST API (default: `http://localhost:8086/skills`).

## Features
- Create, update, delete skills
- Search + pagination/sorting
- Skill levels (BEGINNER → EXPERT) and years of experience
- Badge display and scoreboard (when supported by the backend)
- PDF download endpoint support (when supported by the backend)

## Tech Stack
- Angular 18
- TypeScript
- RxJS
- (Optional) Node/Express SSR (`@angular/ssr`)

## Architecture
- `src/app/skills/models`: domain types (`Skill`, `SkillLevel`)
- `src/app/skills/services`: API client (`SkillsService`) targeting `http://localhost:8086/skills`
- `src/app/skills/ui`: pages/components (list, form, details, proofs…)
- Routing: feature modules per domain area

## Getting Started
### Prerequisites
- Node.js (LTS recommended) + npm
- A backend API running locally (or update the base URL in `src/app/skills/services/skills.service.ts`)

### Install
```bash
npm ci
```

### Run (dev)
```bash
npm start
```
Then open `http://localhost:4200`.

### Build
```bash
npm run build
```

## Configuration
- Backend base URL: `src/app/skills/services/skills.service.ts` (`baseUrl`)

## Contributors
- Add your name(s) here (e.g., GitHub profiles, roles)

## Academic Context
- Course/semester: (fill in)
- Institution: (fill in)
- Objectives: (fill in)

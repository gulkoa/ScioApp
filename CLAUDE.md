# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScioApp is an online testing/quiz application built for Science Olympiad. It supports multiple question types (Multiple Choice, Cryptography, Field answer), timed tests, scoring with rankings, and a cryptogram practice mode (MADTON). Deployed on Heroku.

## Commands

- **Run server (dev):** `npm run dev` (uses nodemon, port 5000)
- **Run server (prod):** `npm start`
- **Run client dev server:** `cd client && npm run serve` (port 8080, proxies `/api` to localhost:5000)
- **Build client for production:** `cd client && npm run build` (outputs to `server/public/`)
- **Lint client:** `cd client && npm run lint`
- **Run tests:** `npx jest` (root-level, jest configured in root package.json)

## Architecture

### Monorepo with two packages

- **`/server`** — Express.js backend (Node, no TypeScript)
- **`/client`** — Vue 2 SPA (Vue CLI, Babel, ESLint)

Root `package.json` manages server dependencies and scripts. Client has its own `package.json`.

### Server (`server/`)

- **`index.js`** — Entry point. Sets up Express, MongoDB connection, JWT middleware, and route mounting. Serves the built Vue SPA in production mode from `server/public/`.
- **`routes/api/question.js`** — Core API. Handles question CRUD, feed loading, library loading, solution submission/checking, test management, ranking, MADTON cryptogram generation, and encryption. Contains the `checkSolution()` function that validates answers for all question types.
- **`routes/api/user.js`** — Permission checking endpoints and Auth0 role management.
- **`events.json`** — Static event/topic configuration (Cybersecurity, Codebusters, WiFi lab, etc.).

### Database

MongoDB (Atlas) with multiple databases:
- `questions` db → `questions0` collection (questions),
- `submissions` db → `submissions0` collection
- `users` db → `users` collection, `ranking` collection
- `tests` db → `tests` collection, `submissions` collection

### Client (`client/`)

- **Vue 2** with no Vue Router — routing is done manually in `App.vue` via `window.location.pathname` parsing.
- **`src/auth.js`** — Custom Auth0 SPA SDK wrapper, exposed as `$auth` Vue plugin.
- **`src/ServerTalker.js`** — Static class wrapping all API calls (axios). Every authenticated request passes `userID` + Bearer token.
- **`src/App.vue`** — Root component with path-based component switching (Feed, Library, Question, QuestionEditor, Test, TestEditor, Ranking, Profile, MADTON).
- **Question types** live in `src/components/questions/` (MultipleChoice, Cryptography, Field) with corresponding constructors in `src/components/questionConstructors/`.
- **`vue.config.js`** — Builds to `../server/public`, proxies `/api` to port 5000 in dev.

### Authentication

Auth0 with JWT. GET requests bypass JWT check (`checkJwt.unless({ method: ['GET'] })`). Write operations require specific permissions (e.g., `add:db`, `read:db`) enforced via `express-jwt-authz`.

### Client Routes (path-based, no vue-router)

- `/` → Feed (random question from selected topics)
- `/question/:id` → Single question view
- `/question/editor` → Question creation
- `/question/library` → Browse all questions
- `/test/:id` → Take a test
- `/test/editor` → Test creation
- `/test/library` → Browse tests
- `/ranking` → Leaderboard
- `/profile` → User profile
- `/MADTON` → Cryptogram practice mode

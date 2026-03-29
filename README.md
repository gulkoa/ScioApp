# ScioApp

A web-based testing and quiz platform built for [Science Olympiad](https://scioly.org). Supports multiple question types, timed tests with scoring and rankings, and a cryptogram practice mode (MADTON).

## Features

- **Multiple question types** — Multiple Choice, Cryptography, and Field (free-response)
- **Question feed** — randomized practice questions filtered by event and topic
- **Timed tests** — create and take timed assessments with automatic scoring
- **Rankings** — leaderboard tracking across users
- **Question & test library** — browse, search, and manage all content
- **MADTON** — dedicated cryptogram/codebusters practice mode
- **Auth0 authentication** — secure login with role-based permissions

### Supported Science Olympiad Events

Cybersecurity, Codebusters, WiFi Lab, Detector Building, Ornithology, and more.

---

## Tech Stack

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Frontend | Vue 2, Axios, TinyMCE            |
| Backend  | Node.js, Express                  |
| Database | MongoDB Atlas                     |
| Auth     | Auth0 (SPA SDK + JWT)             |
| Hosting  | Heroku                            |

---

## Prerequisites

- **Node.js** (v16 or later recommended)
- **npm**
- A **MongoDB Atlas** account (free tier works)
- An **Auth0** account (free tier works)

---

## 1. MongoDB Atlas Setup

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account
2. Create a new **Shared Cluster** (the free M0 tier is fine)
3. Under **Database Access**, create a database user with a username and password — save these, you'll need them for the `.env` file
4. Under **Network Access**, add your IP address (or `0.0.0.0/0` for development)
5. Click **Connect** on your cluster, choose **Connect your application**, and note the connection string — it will look like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/...
   ```
   You only need the **username** and **password** — the connection string is already configured in the app

The app will automatically create these databases and collections on first use:
- `questions` db → `questions0` collection
- `submissions` db → `submissions0` collection
- `users` db → `users` collection, `ranking` collection
- `tests` db → `tests` collection, `submissions` collection

---

## 2. Auth0 Setup

### Create an Auth0 account and tenant

1. Go to [auth0.com](https://auth0.com) and sign up for a free account
2. A tenant is created automatically during signup (e.g. `dev-xxxxx.us.auth0.com`)

### Create an API

1. Go to **Applications > APIs** in the Auth0 dashboard
2. Click **Create API**
3. Set:
   - **Name:** `ScioApp API` (or whatever you like)
   - **Identifier (Audience):** `https://scioapp.gulko.net/api` (or your own URL — this is a logical identifier, not a real endpoint)
   - **Signing Algorithm:** RS256
4. Under the **Permissions** tab, add these permissions:

   | Permission        | Description                      |
   | ----------------- | -------------------------------- |
   | `read:db`         | Read questions and data          |
   | `add:db`          | Add new questions                |
   | `propose:db`      | Propose questions for review     |
   | `read:reports`    | Read submission reports          |
   | `manage:db`       | Full database management         |
   | `manage:ec`       | Manage event configuration       |
   | `manage:c`        | Manage content                   |
   | `manage:coaches`  | Manage coach accounts            |

### Create a Single Page Application

1. Go to **Applications > Applications**
2. Click **Create Application**
3. Set:
   - **Name:** `ScioApp Client`
   - **Type:** Single Page Application
4. In the **Settings** tab, note down:
   - **Domain** (e.g. `dev-xxxxx.us.auth0.com`)
   - **Client ID** (e.g. `wIImCZrd...`)
5. Under **Application URIs**, set:
   - **Allowed Callback URLs:** `http://localhost:8080, https://your-production-url.com`
   - **Allowed Logout URLs:** `http://localhost:8080, https://your-production-url.com`
   - **Allowed Web Origins:** `http://localhost:8080, https://your-production-url.com`
6. Save changes

### Create a Machine-to-Machine Application (for role management)

1. Go to **Applications > Applications**
2. Click **Create Application**
3. Set:
   - **Name:** `ScioApp Management`
   - **Type:** Machine to Machine
4. When prompted to authorize an API, select the **Auth0 Authorization Extension API** (if you have the Authorization Extension installed) or the **Auth0 Management API**
5. In the **Settings** tab, note down:
   - **Client ID** (this is your `AUTH0_MGMT_CLIENT_ID`)
   - **Client Secret** (this is your `AUTH0_MGMT_CLIENT_SECRET`)

### Assign permissions to users

1. Go to **User Management > Roles**
2. Create roles (e.g. `Admin`, `Coach`, `Student`) and assign the API permissions from above
3. Assign roles to users under **User Management > Users**

---

## 3. Environment Variables

### Server `.env` (project root)

Create a `.env` file in the project root:

```env
# MongoDB
MONGODB_USERNAME=your_mongodb_username
MONGODB_PASSWORD=your_mongodb_password

# Auth0
AUTH0_DOMAIN=dev-xxxxx.us.auth0.com
AUTH0_AUDIENCE=https://scioapp.gulko.net/api
AUTH0_MGMT_CLIENT_ID=your_m2m_client_id
AUTH0_MGMT_CLIENT_SECRET=your_m2m_client_secret
AUTH0_AUTHZ_AUDIENCE=urn:auth0-authz-api

# Server
PORT=5000
NODE_ENV=development
```

### Client `.env.local` (`client/` directory)

Create a `.env.local` file inside the `client/` folder:

```env
VUE_APP_AUTH0_DOMAIN=dev-xxxxx.us.auth0.com
VUE_APP_AUTH0_CLIENT_ID=your_spa_client_id
VUE_APP_AUTH0_AUDIENCE=https://scioapp.gulko.net/api
```

> Vue CLI automatically loads `VUE_APP_*` variables from `.env.local` at build time.

> **Never commit `.env` or `.env.local` files.** They are already in `.gitignore`.

---

## 4. Install & Run

### Install dependencies

```bash
# Server dependencies (from project root)
npm install

# Client dependencies
cd client
npm install
cd ..
```

### Run in development mode

Open **two terminals**:

**Terminal 1 — Backend** (runs on port 5000):

```bash
npm run dev
```

**Terminal 2 — Frontend** (runs on port 8080, proxies API calls to port 5000):

```bash
cd client
npm run serve
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

### Build for production

```bash
cd client
npm run build
cd ..
npm start
```

This builds the Vue SPA into `server/public/` and starts the Express server, which serves both the API and the static frontend.

---

## Project Structure

```
ScioApp-heroku/
├── server/
│   ├── index.js              # Express entry point, MongoDB connection, JWT setup
│   ├── events.json           # Event/topic configuration
│   ├── public/               # Built client assets (generated by npm run build)
│   └── routes/api/
│       ├── question.js       # Question CRUD, feed, tests, ranking, MADTON
│       └── user.js           # Permission checks, Auth0 role management
├── client/
│   ├── vue.config.js         # Build output dir + dev proxy config
│   ├── .env.local            # Client Auth0 config (not committed)
│   └── src/
│       ├── App.vue           # Root component with path-based routing
│       ├── auth.js           # Auth0 SPA SDK wrapper (Vue plugin)
│       ├── ServerTalker.js   # Static API client (axios)
│       └── components/
│           ├── Feed.vue
│           ├── Library.vue
│           ├── Question.vue
│           ├── QuestionEditor.vue
│           ├── Test.vue
│           ├── TestEditor.vue
│           ├── TestLibrary.vue
│           ├── Ranking.vue
│           ├── Profile.vue
│           ├── MADTON.vue
│           ├── questions/          # Question type renderers
│           └── questionConstructors/ # Question type constructors
├── .env                      # Server env vars (not committed)
├── .gitignore
├── package.json              # Server deps & root scripts
└── build.sh                  # Heroku build script
```

---

## Scripts

| Command                      | Description                              |
| ---------------------------- | ---------------------------------------- |
| `npm run dev`                | Start server with nodemon (hot reload)   |
| `npm start`                  | Start server in production mode          |
| `cd client && npm run serve` | Start Vue dev server on port 8080        |
| `cd client && npm run build` | Build client into `server/public/`       |
| `cd client && npm run lint`  | Lint client code                         |
| `npx jest`                   | Run tests                                |

---

## Deployment (Heroku)

1. Make sure all env vars are set as Heroku config vars:

   ```bash
   heroku config:set MONGODB_USERNAME=...
   heroku config:set MONGODB_PASSWORD=...
   heroku config:set AUTH0_DOMAIN=...
   heroku config:set AUTH0_AUDIENCE=...
   heroku config:set AUTH0_MGMT_CLIENT_ID=...
   heroku config:set AUTH0_MGMT_CLIENT_SECRET=...
   heroku config:set AUTH0_AUTHZ_AUDIENCE=urn:auth0-authz-api
   heroku config:set NODE_ENV=production
   ```

   For the client-side Auth0 vars, also set:

   ```bash
   heroku config:set VUE_APP_AUTH0_DOMAIN=...
   heroku config:set VUE_APP_AUTH0_CLIENT_ID=...
   heroku config:set VUE_APP_AUTH0_AUDIENCE=...
   ```

2. Update your Auth0 application's **Allowed Callback URLs**, **Allowed Logout URLs**, and **Allowed Web Origins** to include your Heroku app URL

3. Deploy:

   ```bash
   git push heroku master
   ```

   The included `build.sh` handles installing dependencies and building the client.

---

## License

ISC

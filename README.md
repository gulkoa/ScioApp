# ScioApp

A web-based testing and quiz platform built for [Science Olympiad](https://scioly.org). Supports multiple question types, timed tests with scoring and rankings, and a cryptogram practice mode (MADTON).

## Features

- **Multiple question types** — Multiple Choice, Cryptography, and Field (free-response)
- **Question feed** — randomized practice questions filtered by event and topic
- **Timed tests** — create and take timed assessments with automatic scoring
- **Rankings** — leaderboard tracking across users
- **Question & test library** — browse, search, and manage all content
- **MADTON** — dedicated cryptogram/codebusters practice mode
- **Email/password auth** — custom JWT-based authentication with email verification
- **Admin panel** — manage users, roles, and permissions from the web UI

### Supported Science Olympiad Events

Cybersecurity, Codebusters, WiFi Lab, Detector Building, Ornithology, and more.

---

## Tech Stack

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Frontend | Vue 2, Axios, TinyMCE            |
| Backend  | Node.js, Express, JWT             |
| Database | MongoDB Atlas                     |
| Auth     | Custom (bcrypt + jsonwebtoken)    |
| Email    | Resend                            |
| Hosting  | Render                            |

---

## Prerequisites

- **Node.js** (v16 or later recommended)
- **npm**
- A **MongoDB Atlas** account (free tier works)
- A **Resend** account for email verification (free tier: 3,000 emails/month)

---

## 1. MongoDB Atlas Setup

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account
2. Create a new **Shared Cluster** (the free M0 tier is fine)
3. Under **Database Access**, create a database user — save the username and password
4. Under **Network Access**, add your IP (or `0.0.0.0/0` for development)

The app creates its databases and collections automatically on first use.

---

## 2. Resend Setup (email verification)

1. Go to [resend.com](https://resend.com) and create a free account
2. Get your **API key** from the dashboard
3. Optionally verify your domain to send from a custom address (otherwise emails come from `noreply@resend.dev`)

---

## 3. Environment Variables

Create a `.env` file in the project root:

```env
# MongoDB
MONGODB_USERNAME=your_mongodb_username
MONGODB_PASSWORD=your_mongodb_password

# JWT secret — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_random_secret_here

# Resend (email verification)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=ScioApp <noreply@yourdomain.com>

# App URL (used in verification email links)
APP_URL=http://localhost:8080

# Server
PORT=5000
NODE_ENV=development
```

> Never commit the `.env` file — it's already in `.gitignore`.

---

## 4. Install & Run

```bash
# Install server deps
npm install

# Install client deps
cd client && npm install && cd ..
```

Open **two terminals**:

**Terminal 1 — Backend** (port 5000):
```bash
npm run dev
```

**Terminal 2 — Frontend** (port 8080, proxies API to 5000):
```bash
cd client && npm run serve
```

Open [http://localhost:8080](http://localhost:8080).

---

## 5. Create the First Admin User

1. Register an account through the web UI
2. Verify your email
3. In MongoDB Atlas, go to the `users` database > `users` collection
4. Find your user document and set `"role": "admin"`
5. Log out and back in — you'll see the Admin link in the header

From there you can manage all other users from the Admin panel.

---

## Project Structure

```
ScioApp-heroku/
├── server/
│   ├── index.js                 # Express setup, MongoDB, route mounting
│   ├── events.json              # Event/topic config
│   ├── middleware/auth.js       # JWT verify, permission & admin middleware
│   ├── public/                  # Built client (generated)
│   └── routes/api/
│       ├── auth.js              # Register, login, verify, admin user mgmt
│       └── question.js          # Questions, tests, ranking, MADTON
├── client/
│   ├── vue.config.js
│   └── src/
│       ├── App.vue              # Root component, path-based routing
│       ├── auth.js              # JWT auth store (Vue plugin)
│       ├── ServerTalker.js      # API client
│       └── components/
│           ├── Login.vue        # Login page
│           ├── Register.vue     # Registration page
│           ├── Verify.vue       # Email verification page
│           ├── Admin.vue        # User/role management panel
│           ├── Feed.vue, Library.vue, Question.vue, ...
│           └── questions/       # Question type renderers
├── .env.example                 # Template for environment variables
├── package.json
└── build.sh                     # Render build script
```

---

## Roles & Permissions

| Role    | Description                          |
| ------- | ------------------------------------ |
| student | Default. Can read and answer questions |
| coach   | Can add questions and tests          |
| admin   | Full access + admin panel            |

Permissions: `read:db`, `add:db`, `propose:db`, `read:reports`, `manage:db`, `manage:ec`, `manage:c`, `manage:coaches`

Admins bypass all permission checks. Permissions can be assigned individually per user from the admin panel.

---

## Deployment (Render)

Set these environment variables in your Render service:

```
MONGODB_USERNAME=...
MONGODB_PASSWORD=...
JWT_SECRET=...
RESEND_API_KEY=...
EMAIL_FROM=ScioApp <noreply@yourdomain.com>
APP_URL=https://your-app.onrender.com
NODE_ENV=production
```

- **Build command:** `./build.sh`
- **Start command:** `cd server && node index.js`

---

## License

ISC

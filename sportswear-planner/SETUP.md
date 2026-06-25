# Sportswear Planner — Setup & Deploy Guide

## Prerequisites
- Node.js 18+
- A [Neon](https://neon.tech) account (free tier works)
- A [Vercel](https://vercel.com) account
- A Slack workspace where you have admin rights

---

## 1. Install dependencies

```bash
cd sportswear-planner
npm install
```

---

## 2. Neon Postgres setup

1. Go to [console.neon.tech](https://console.neon.tech) → **New Project**
2. Copy the **Connection string** (looks like `postgresql://user:password@host/dbname?sslmode=require`)
3. Paste it into `.env` as both `DATABASE_URL` and `DIRECT_URL`

```bash
cp .env.example .env
# Edit .env with your values
```

4. Push the schema and seed data:

```bash
npm run db:push
npm run db:seed
```

---

## 3. Slack App setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → From scratch
2. Name it **Sportswear Planner**, select your workspace
3. Go to **OAuth & Permissions** → **Bot Token Scopes**, add:
   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `users:read`
4. Click **Install to Workspace** → copy the **Bot User OAuth Token** (`xoxb-...`)
5. Go to **Basic Information** → copy the **Signing Secret**
6. Go to **Event Subscriptions** → **Enable Events**
   - Request URL: `https://your-app.vercel.app/api/slack/webhook`
   - Subscribe to bot events: `message.channels`
7. Invite the bot to `#product-development`: `/invite @sportswear-planner`

---

## 4. Local development

```bash
# Generate Prisma client
npm run db:generate

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)
Default login: `admin@sportswear.com` / `admin123`

---

## 5. Deploy to Vercel

### Option A — Vercel CLI

```bash
npx vercel --prod
```

### Option B — GitHub + Vercel Dashboard

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo
3. Add all env vars from `.env` in the Vercel dashboard under **Settings → Environment Variables**:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` ← set to your Vercel URL, e.g. `https://sportswear-planner.vercel.app`
   - `SLACK_BOT_TOKEN`
   - `SLACK_SIGNING_SECRET`
   - `SLACK_CHANNEL_NAME`
4. Deploy

---

## 6. Post-deploy

- Update Slack Event Subscriptions → Request URL to your Vercel URL + `/api/slack/webhook`
- Click **Sync Slack** in the top bar to import your first batch of messages
- Run the seed if needed: `npx vercel env pull && npm run db:seed`

---

## Project structure

```
src/
├── app/
│   ├── (auth)/login + register       # Auth pages
│   ├── (dashboard)/
│   │   ├── dashboard/                # Overview + product cards + progress bars
│   │   ├── kanban/                   # Drag-and-drop Kanban board
│   │   ├── roadmap/                  # Gantt-style timeline
│   │   └── tasks/                    # Task table + Slack feed panel
│   └── api/
│       ├── auth/[...nextauth]/       # NextAuth handler
│       ├── auth/register/            # User registration
│       ├── products/                 # Product CRUD
│       ├── tasks/                    # Task CRUD
│       └── slack/
│           ├── sync/                 # Pull messages from Slack
│           └── webhook/              # Receive Slack events
├── components/
│   ├── dashboard/                    # ProductGrid, KanbanBoard, RoadmapView, TasksAndSlack
│   └── layout/                      # Sidebar, TopBar
└── lib/
    ├── auth.ts                       # NextAuth config
    ├── db.ts                         # Prisma + Neon client
    └── slack.ts                      # Slack SDK helpers + two-way sync logic
```

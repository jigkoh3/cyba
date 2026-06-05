# CYBA

![CI](https://github.com/jigkoh3/cyba/actions/workflows/ci.yml/badge.svg)

**Staging:** https://cyba.vercel.app *(Vercel project to be linked — see setup notes)*

CYBA is a full-stack web application built with Next.js 15 (App Router), React 19, TypeScript, Prisma, and PostgreSQL. It follows a monolith architecture deployed on Vercel with a Neon-managed database.

## Local Setup

### Prerequisites

- Node.js 20 LTS or newer (CI runs on Node 24)
- npm 10+
- A PostgreSQL database (local or [Neon](https://neon.tech) free tier)

### Install

```bash
npm install
```

### Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and set `DATABASE_URL` to your PostgreSQL connection string.

### Run database migrations

```bash
npm run db:migrate
```

### Start the development server

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Verify the health check

```bash
curl http://localhost:3000/api/health
# {"status":"ok","timestamp":"..."}
```

### Run tests

```bash
npm test
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon format: `postgresql://...?sslmode=require`) |
| `NODE_ENV` | No | Runtime environment (`development` / `production`) |
| `NEXTAUTH_SECRET` | When auth enabled | Random secret for NextAuth.js session signing |
| `NEXTAUTH_URL` | When auth enabled | Canonical URL of the app (e.g. `https://cyba.vercel.app`) |

See `.env.example` for placeholder values.

## Project Structure

```
app/              Next.js App Router (pages, layouts, API routes)
app/api/health/   Health-check endpoint → GET /api/health
prisma/           Prisma schema and migrations
public/           Static assets
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm test` | Run unit tests (Vitest) |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Apply pending migrations (dev) |
| `npm run db:push` | Push schema changes without migration (prototyping) |

## Tech Stack

- **Language:** TypeScript
- **Framework:** Next.js 15 (App Router)
- **UI:** React 19
- **ORM:** Prisma
- **Database:** PostgreSQL (Neon)
- **Hosting:** Vercel

See [ADR-001](/CYBA/issues/CYBA-10#document-adr-001) for the full rationale behind these choices.

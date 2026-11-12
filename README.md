# Amlak

**Property and maintenance management platform** for owners, workers and guests. Owners manage their places and assets, workers handle maintenance tickets, and guests are booked in and out on a calendar. The interface works in Arabic and English.

Built as the Holberton School portfolio project by a team of four.

## Features

- **Places and assets** – owners manage properties and the assets inside them, with role-based access for owners and assigned workers.
- **Maintenance tickets** – report issues with photos, approve, reject or reassign them, and close them with "after" photos.
- **Preventive maintenance** – schedule periodic asset maintenance; tickets are created automatically from the schedule.
- **Reminders and alerts** – background jobs email reminders and overdue alerts, written in each recipient's language.
- **Bookings** – manage guest bookings on a calendar and check guests in and out.
- **Accounts** – registration, email verification, worker invitations, profile pictures, and password reset by email.
- **API documentation** – Swagger docs generated from the same Zod schemas that validate requests.

## Tech stack

| Layer | Technology |
|---|---|
| API | TypeScript, Bun, Express, Zod, OpenAPI / Swagger |
| Database | PostgreSQL, Prisma |
| Auth | JWT access tokens with refresh sessions, role-based access control, rate limiting |
| Files and email | AWS S3 (photo uploads), Resend (transactional email) |
| Web | React, TanStack Router, Tailwind CSS, shadcn/ui, Lingui (Arabic / English) |
| Tooling | Bun workspaces monorepo, Biome, Docker Compose |

## Project structure

```
apps/
  api/        REST API (Express + Prisma)
  web/        Web app (React + Vite)
packages/
  shared/     Zod schemas and types shared by the API and the web app
compose.yaml  PostgreSQL + API + web
```

## Running locally

Requires [Bun](https://bun.sh) and Docker.

```bash
bun install
cp .env.example .env     # set JWT_SECRET, S3_BUCKET, S3_REGION (and RESEND_API_KEY for real emails)
docker compose up --build
```

The API listens on port 3001. For development without Docker, see `apps/api/.env.example` and run `bun run dev` inside `apps/api` and `apps/web`.

## Team

| Member | Main contribution |
|---|---|
| [Abdulrahman Wadani](https://github.com/Abdulrahman-Wadani) | Backend REST API: database design, authentication, places, assets, maintenance tickets, scheduling, bookings, email, Docker setup |
| [wahabxvii](https://github.com/wahabxvii) | Web app |
| [CyberSpace0](https://github.com/CyberSpace0) | Web app, API contributions |
| MN7 | Web app features (places, assets, maintenance), early Docker files, project timeline |

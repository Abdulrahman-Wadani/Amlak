# Amlak

**Property and maintenance management platform** for property owners, their workers and an admin. Owners manage their places and assets, workers report and fix maintenance issues, and stays are booked, checked in and checked out on a calendar. The interface works in Arabic and English.

Built as the Holberton School portfolio project by a team of three.

## Features

- **Places and assets** – owners manage properties and the assets inside them, with role-based access for owners and assigned workers.
- **Dashboard** – the health of every place at a glance: assets by status, open and overdue tickets, today's check-ins and check-outs, and the maintenance budget.
- **Maintenance tickets** – report issues with photos, approve, reject or reassign them, and close them with "after" photos.
- **Preventive maintenance** – schedule periodic asset maintenance; tickets are created automatically from the schedule.
- **Reminders and alerts** – background jobs email reminders and overdue alerts, written in each recipient's language.
- **Bookings** – manage stays on a calendar without double booking, and check guests in and out.
- **Expenses and reports** – log expenses with receipt photos, and see income, expenses and profit per place and per currency.
- **Notifications** – an in-app inbox in each user's language, and announcements from the admin by role or to chosen users.
- **Administration** – the admin manages every account, answers support requests, and publishes site pages in Arabic and English.
- **Accounts** – registration, email verification, worker invitations, profile pictures, and password reset by email.
- **API documentation** – Swagger docs generated from the same Zod schemas that validate requests.

## Tech stack

| Layer | Technology |
|---|---|
| API | TypeScript, Bun, Express, Zod, OpenAPI / Swagger |
| Database | PostgreSQL, Prisma |
| Auth | JWT access tokens with refresh sessions, role-based access control, limits on verification and reset emails |
| Files and email | AWS S3 (photo uploads), sharp (image checks and resizing), Resend (transactional email) |
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
cp .env.example .env
# In .env, set JWT_SECRET, and add S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID and
# S3_SECRET_ACCESS_KEY. RESEND_API_KEY is optional: without it, emails are printed
# in the API logs.
docker compose up --build

# Once, on a new database: create the roles and the first admin
docker compose exec -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD='Choose@1Strong' \
  -e ADMIN_PHONE=+966500000000 api bunx prisma db seed
```

The web app runs on http://localhost:5173 and the API on http://localhost:3001, with its docs at http://localhost:3001/api/docs. For development without Docker, see `apps/api/.env.example` and run `bun run dev` inside `apps/api` and `apps/web`.

## Team

| Member | Main contribution |
|---|---|
| [Abdulrahman Wadani](https://github.com/Abdulrahman-Wadani) | Backend REST API: database design, authentication, places, assets, maintenance tickets, scheduling, bookings, expenses, reports, notifications, admin features, email, S3 uploads, Docker setup |
| [wahabxvii](https://github.com/wahabxvii) | Web app |
| [Azzam Al Duyuli](https://github.com/CyberSpace0) | Web app features (places, assets, maintenance, profile), API contributions, early Docker files, project timeline |

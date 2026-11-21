# Amlak — Stage 4: MVP Development and Execution

Amlak's MVP was built in two sprints (11 Oct – 20 Nov 2026) and is live at [amlak.software](https://amlak.software); a third sprint (22 Nov – 5 Dec) covers final integration, QA and the demo.

## Deliverables

| Deliverable | Link | Notes |
| --- | --- | --- |
| Sprint planning | [Jira board](https://abdulrahmanqmb.atlassian.net/jira/software/projects/SCRUM/boards/1) · [Backlog](https://abdulrahmanqmb.atlassian.net/jira/software/projects/SCRUM/boards/1/backlog) | Epics, stories and tasks with owners, labels and sprints; plan summarised below |
| Sprint reviews | [Sprint 0 issues](https://abdulrahmanqmb.atlassian.net/issues/?jql=project%3DSCRUM%20AND%20sprint%3D2) · [Sprint 1 issues](https://abdulrahmanqmb.atlassian.net/issues/?jql=project%3DSCRUM%20AND%20sprint%3D1) | Review notes in the Sprint reviews section |
| Retrospectives | This document, Retrospectives section | Written at sprint close from Jira and GitHub records |
| Source repository | [github.com/Abdulrahman-Wadani/Amlak](https://github.com/Abdulrahman-Wadani/Amlak) | Bun monorepo: `apps/api`, `apps/web`, `packages/shared` |
| Pull requests | [All PRs](https://github.com/Abdulrahman-Wadani/Amlak/pulls?q=is%3Apr) | 88 PRs, 87 merged (14 Oct – 21 Nov) |
| Bug tracking | [Jira: label = bug](https://abdulrahmanqmb.atlassian.net/issues/?jql=project%3DSCRUM%20AND%20labels%3Dbug%20ORDER%20BY%20key) | 17 bugs logged, 17 fixed, each linked to its PR |
| Testing evidence | [Web tests](https://github.com/Abdulrahman-Wadani/Amlak/tree/develop/apps/web/src/lib) · [API tests](https://github.com/Abdulrahman-Wadani/Amlak/tree/develop/apps/api/tests) · [Shared tests](https://github.com/Abdulrahman-Wadani/Amlak/tree/develop/packages/shared/test) · this document | Results in the QA section |
| Production environment | [amlak.software](https://amlak.software) · [API docs](https://amlak.software/api/docs) | AWS EC2, Docker Compose, Caddy with HTTPS |

## Team and working agreements

Three developers shared development, source control and QA; the rule was that nothing merges into `develop` without another member's approval (how well that held is in the Retrospectives).

| Member | GitHub | Main responsibilities | SCM and QA |
| --- | --- | --- | --- |
| Abdulrahman Ael Wadani | Abdulrahman-Wadani | API (all backend stories), database, email and S3, production deployment, web fixes and design integration | Reviews and merges PRs; tests the API with Swagger and scripted scenarios |
| Abdulwahab | wahabxvii | Web: sign-up and login, profile, properties, dashboard, finance, admin, app shell, CI | Reviews and merges PRs; tests his screens |
| Azzam al Duyuli | CyberSpace0 | Web: assets, workers, maintenance, bookings, notifications, support, web content, integration tests | Reviews and merges PRs; tests his screens |

**Branching.** Each change is a branch (`feat/…`, `fix/…`, `chore/…`) opened as a PR into `develop`. Branch protection on `develop` requires one approval from a member other than the author. A release is a PR from `develop` into `main`, merged with a merge commit; the server deploys `main`.

**Pull requests** follow one template: What and why, Closes (Jira key), Changes, How to test, Database, API and docs, Breaking changes, Checklist. Commit titles use Conventional Commits (`feat(api): …`, `fix(web): …`).

**Definition of Done**

- Merged into `develop` through a reviewed PR
- `bun run check` (Biome) and `bun run typecheck` pass for all three packages
- Tests pass, and new logic has tests where it has a pure function to test
- Every new string is in both catalogs (`bun run i18n:check`); Arabic and English checked
- Works at 1440 px and 360 px
- API changes are reflected in the OpenAPI document at `/api/docs`
- The Jira issue is moved to Done with the PR linked

## Sprint plan

The backlog was split into 7 Must-have epics, broken into an API story and a web story per feature, and run in two-week sprints; Should and Could items were set aside for later releases.

**Sprints**

| Sprint | Dates | Goal | Planned | Done |
| --- | --- | --- | --- | --- |
| Sprint 0 | 11 Oct – 4 Nov (closed 6 Nov) | Project setup; accounts, properties, assets and workers in the API; first web screens | 23 | 13 |
| Sprint 1 | 6 Nov – 20 Nov (closed 21 Nov) | Maintenance, bookings, finance and admin in the API; every web screen; production deployment | 46 | 42 |
| Sprint 2 | 22 Nov – 5 Dec (active) | Final integration, QA and release: CI, unit and integration tests, end-to-end test and demo rehearsal | 4 | — |

Sprint 0 ran 3.5 weeks because it included project setup. Counts are Jira issues (stories and tasks); story points were not used.

**MoSCoW priorities**

| Priority | Scope | Jira |
| --- | --- | --- |
| Must have | Authentication and accounts; properties, workers and assets; maintenance (reports with photos, review, completion, schedules, reminders, overdue alerts); bookings with check-in and check-out; expenses and financial reports; administration (users, notifications, support, web content); platform and delivery | Epics SCRUM-5 to SCRUM-11 |
| Should have | Pre- and post-booking checklists; admin plans and payments; admin statistics with export | SCRUM-69 to SCRUM-71 |
| Could have | Google or Apple sign-up; interests at onboarding; walkthrough; first-login tooltips | SCRUM-72 to SCRUM-75 |
| Won't have (this release) | Every Should and Could item above, held in epic SCRUM-12 "Later releases" | SCRUM-12 |

**Breakdown and owners by epic**

| Epic | API stories (owner: Abdulrahman) | Web stories | Web owner |
| --- | --- | --- | --- |
| Authentication and accounts | Register, verify email, new code, log in and out, profile, password reset, profile picture (SCRUM-13 to 19) | Register, verify, log in, reset password, profile (SCRUM-20 to 24) | Abdulwahab |
| Properties, workers and assets | Properties, assets, worker accounts, assign workers, health dashboard (SCRUM-25 to 29) | Properties, dashboard (SCRUM-30, 34) | Abdulwahab |
|  |  | Assets, worker accounts, assign workers (SCRUM-31 to 33) | Azzam |
| Maintenance | Damage reports, review, completion, schedules, reminders, overdue alerts, daily schedule job (SCRUM-35 to 40, 79) | Report damage, review and complete, schedules (SCRUM-41 to 43) | Azzam |
| Bookings | Booking calendar, check-in and check-out (SCRUM-44, 45) | Calendar, check-in and check-out (SCRUM-46, 47) | Azzam |
| Financial | Expenses with receipts, financial reports (SCRUM-48, 49) | Expenses, reports (SCRUM-50, 51) | Abdulwahab |
| Administration | Users, notifications and announcements, support, web content (SCRUM-52 to 55) | Users (SCRUM-56) | Abdulwahab |
|  |  | Notifications, support, web content (SCRUM-57 to 59) | Azzam |
| Platform and delivery | Audit log and paging, S3 uploads, email provider, API docs, deployment (SCRUM-62 to 64, 66, 67) | App shell with Arabic and English, web container (SCRUM-60, 61); CI (SCRUM-65) | Abdulwahab |
| QA | Unit tests (SCRUM-76, Abdulrahman); end-to-end test and demo (SCRUM-68, whole team) | Integration tests (SCRUM-77) | Azzam |

**Dependencies**

1. Each web story waits for its API story: the web screen is built against the API's OpenAPI contract at `/api/docs`.
2. The app shell, routing and translations (SCRUM-60) come before the other web stories.
3. S3 uploads (SCRUM-63) come before damage reports, completion photos, receipts and profile pictures.
4. The email provider (SCRUM-64) comes before email verification, password reset and maintenance reminders.
5. Worker accounts and assignment (SCRUM-27, 28) come before tickets can be assigned and completed.
6. Production deployment (SCRUM-67) comes before the end-to-end test and demo rehearsal (SCRUM-68).

**Deadlines.** Each sprint's issues are due on the sprint's end date: 4 Nov for Sprint 0, 20 Nov for Sprint 1, 5 Dec for Sprint 2.

## Execution

Every Must-have user story was delivered through 87 merged pull requests; the API was finished first, then the web app was completed and brought to the approved design.

**Stack.** Bun workspaces; API on Express 5, Prisma 7 and PostgreSQL, validated with zod schemas shared with the web app and published as OpenAPI at `/api/docs`; web app on React 19, TanStack Router and Lingui (Arabic right-to-left and English); photos on AWS S3; email through Resend.

**Sprint 0 (11 Oct – 4 Nov).** Monorepo, containers and shared packages; the API for accounts (register, email verification, login with refresh tokens), properties, assets, worker accounts and assignment; audit log, paging and the email provider; the first web screens for assets and workers.

**Sprint 1 (6 – 20 Nov).**

- API: maintenance tickets with photos, review and completion; preventive schedules with a daily job, email reminders and overdue alerts; bookings with check-in and check-out; expenses and financial reports; admin user management; notifications and announcements; support requests; web content; the property and asset health dashboard.
- Production: deployed to [amlak.software](https://amlak.software) with HTTPS (PR #55).
- Web: every screen built, then fixed and completed in PRs #63 to #74: session refresh, role-based actions, full Arabic and English translation, zero type errors, tests and translated API errors.
- Design: the web app was brought to the approved design ("Amlak v3.1 screens") in PRs #76 to #86: one top bar and phone layout, design-system components, popups for add forms, input limits on API and web, and the rule that bookings and repairs never share a day.

**Source control in numbers** (from GitHub, 14 Oct – 21 Nov)

| Measure | Value |
| --- | --- |
| Pull requests opened | 88 |
| Merged | 87 (76 into `develop`, 11 releases into `main`); 1 closed without merging |
| Merged with an approving review by another member | 25 of 87 |
| PRs by author | Abdulrahman 71 · Abdulwahab 9 · Azzam 8 |
| Reviews by member (approvals of others' PRs) | Abdulwahab 13 · Azzam 12 · Abdulrahman 1 |

## Monitoring progress

Progress was tracked on the Jira board; Sprint 1 completed 42 of 46 planned issues (91%) against 13 of 23 (57%) in Sprint 0, and all 17 logged bugs are fixed.

| Metric | Sprint 0 | Sprint 1 |
| --- | --- | --- |
| Issues planned | 23 | 46 |
| Issues completed (velocity) | 13 | 42 |
| Completed vs planned | 57% | 91% |
| Carried to the next sprint | 10 | 4 |
| Bugs logged | — | 17 |
| Bugs fixed (resolution rate) | — | 17 (100%) |

**How progress was tracked**

- Each issue moves across the columns to Done on the [board](https://abdulrahmanqmb.atlassian.net/jira/software/projects/SCRUM/boards/1); every PR names its Jira key.
- Bugs found in code review and QA are logged as tasks labelled `bug`, each with what went wrong and the PR that fixed it ([list](https://abdulrahmanqmb.atlassian.net/issues/?jql=project%3DSCRUM%20AND%20labels%3Dbug%20ORDER%20BY%20key)). Jira has no Bug issue type on this project, hence the label.
- The team had no daily stand-ups. Blockers and questions were handled in PR comments and reviews.

**Adjustments made**

- Sprint 0 was extended from two to three and a half weeks to absorb project setup; its 10 unfinished web stories moved to Sprint 1.
- When the API was finished, its owner took over web fixes and the design pass so the web stories could close within Sprint 1.
- The four QA and delivery tasks not finished in Sprint 1 (CI, unit tests, integration tests, end-to-end test and demo) moved to Sprint 2.
- Web story statuses lagged behind the code; they were brought up to date at Sprint 1's close (21 Nov), checked against the merged PRs.

## Sprint reviews

No review meeting was held during the sprints; these reviews record each sprint's increment at its close, from Jira and the merged pull requests.

**Sprint 0 review (closed 6 Nov): 13 of 23 issues done**

| Delivered | Evidence |
| --- | --- |
| Register a manager, verify email by code, request a new code, log in and out with refresh tokens | SCRUM-13 to 16; endpoints under `/auth` in `/api/docs` |
| Manage properties and assets; worker accounts; assign workers to properties | SCRUM-25 to 28 |
| Web screens for assets, worker accounts and worker account setup | SCRUM-31, 32 |
| Audit log and paging helpers; real email provider with retries; API documentation | SCRUM-62, 64, 66 |

Not done and carried over: profile, the web sign-up and login screens, properties and dashboard screens, the app shell and web container.

**Sprint 1 review (closed 21 Nov): 42 of 46 issues done, 17 bugs fixed**

| Delivered | Evidence |
| --- | --- |
| Maintenance end to end: damage report with photos, manager review, completion with photo proof, preventive schedules, email reminders, overdue alerts | SCRUM-35 to 43, 79 |
| Bookings calendar with check-in and check-out; repairs and bookings never share a day | SCRUM-44 to 47; PR #86 |
| Expenses with receipts and financial reports | SCRUM-48 to 51 |
| Admin: users, notifications and announcements, support requests, public web content | SCRUM-52 to 59 |
| Profile, password reset, profile picture, health dashboard | SCRUM-17 to 19, 23, 24, 29, 34 |
| Arabic and English throughout, phone and desktop layouts to the approved design | SCRUM-60, 61; PRs #68, #76 to #86 |
| Production deployment with HTTPS | SCRUM-67; [amlak.software](https://amlak.software) |

Not done and moved to Sprint 2: CI with GitHub Actions (SCRUM-65), integration tests (SCRUM-77), end-to-end test and demo rehearsal (SCRUM-68).

## Retrospectives

No retrospective meeting was held during the sprints; this one covers Sprints 0 and 1 together and sets the rules for Sprint 2.

**What worked well**

- The API was designed contract first: zod schemas shared by API and web, and an OpenAPI page at `/api/docs` that the web team built against.
- One PR template and Conventional Commit titles kept every change explained and easy to review.
- Strict checks caught real problems before users did: type checking found 165 errors, the translation check found missing and broken Arabic entries.
- Production went live in Sprint 1 with HTTPS, so features were tested on the real server early.
- Business rules were settled before code and then tested, for example that bookings and repairs never share a day.

**Challenges**

- The web app lagged the API: 10 web stories slipped from Sprint 0, and in Sprint 1 the API owner had to take over web fixes.
- The review rule did not hold: only 25 of 87 merged PRs had an approval from another member; the rest were merged by the repository owner with an admin bypass.
- Jira statuses fell behind the code, so the board did not show real progress until Sprint 1 closed.
- Quality debt built up: 165 type errors, a test setup that ran no tests, and about 530 lines of hard-coded Arabic, all found late.
- The first web screens drifted from the approved design and needed a full design pass.
- There were no stand-ups, so blockers surfaced only in PRs.

**Changes for Sprint 2**

- [ ] CI on every PR (Biome, type check, tests, translation check, build) as a required status (SCRUM-65)
- [ ] No admin bypass: every PR into `develop` needs one approval from another member
- [ ] Move the Jira issue to Done in the same step as merging its PR
- [ ] A 10-minute stand-up three times a week, plus a written note in the team chat on the other days
- [ ] Compare each new screen with its design image, at 1440 px and 360 px, before opening the PR
- [ ] Hold the Sprint 2 review and retrospective as meetings on 5 Dec

## Final integration and QA testing

After PR #88, all automated checks pass on `develop` (221 tests across the three packages, zero type errors, 781 messages translated), and every end-to-end API scenario below gave the expected result; an integration suite and CI are the open QA work in Sprint 2.

**Automated checks** (run locally before each PR; CI to run them comes in Sprint 2)

| Check | Command | Result on `develop` (PR #88) |
| --- | --- | --- |
| Lint and format | `bun run check` (Biome) | Pass, 130 files |
| Type check, all three packages | `bun run typecheck` | Pass, 0 errors |
| Web unit and component tests | `bunx vitest run` in `apps/web` | 158 passed in 25 files |
| Shared schema tests (input limits, place defaults) | `bun run test` in `packages/shared` | 9 passed |
| Translations | `bun run i18n:check` | 781 messages, each in Arabic and English |
| Production build with type check | `bun run build` (`tsc -b` and Vite) | Pass |

Web tests cover session refresh and retry (`authFetch`), translated API errors, booking grouping, dates and number formatting, paging, ticket rules (who may complete a ticket), places counts and form limits.

| Suite | Written by | Files | Result |
| --- | --- | --- | --- |
| API unit tests: auth, dates, errors and the error handler, presenters, validation (`apps/api/tests`, `bun run test`) | Azzam | 6 | 54 passed |
| Web unit and page tests: auth, bookings, expenses, home, places, tickets, users, validators and the shared helpers (`apps/web`, `vitest run`) | Abdulwahab and Azzam | 21 | 116 passed |

Both suites were merged into develop in PR #88 (21 Nov), with 9 web tests updated for code changed since 18 Nov and none weakened. The root command bun run test now runs shared (9), API (54) and web (158) tests: 221 passed.

**End-to-end API scenarios** (run against a local API and PostgreSQL)

| Scenario | Expected | Result |
| --- | --- | --- |
| Tickets sorted by due date | Soonest first, no due date last; an unknown sort value is refused | Pass; 422 for an unknown value |
| Open tickets filter | Only PENDING\_REVIEW and APPROVED; count equals the dashboard's | Pass; 19 = 19 |
| Sign up with a registered email | 409 naming the email field | Pass |
| Approve a repair inside a confirmed booking | Booking cancelled with reason; assignee notified with guest name and phone | Pass |
| New booking on a repair day | Refused with the ticket and its day | Pass (409) |
| Move a repair into a booking | That booking cancelled, assignee notified | Pass |
| Repair day while a guest is checked in | Refused, with the guest's check-out date | Pass (422) |
| Preventive maintenance on a booked day | Does not block the booking | Pass |
| Record a stay that already ended | Saved as checked out | Pass |

**Front end with back end** (production build in Chromium, Arabic and English, 1440 px and 360 px)

- Each role (manager, worker, admin) signed in and walked its pages: no console errors, no sideways scroll at 360 px.
- A crawl of 49 pages in both languages (102 page loads) found no untranslated message IDs and no Arabic-Indic digits.
- The session survives closing and reopening the browser; signing out ends it.
- Screens were compared side by side with the approved design images.

**Sprint 2 test plan (open)**

- [ ] Unit tests for the API and web merged into develop in PR #88 on 21 Nov: 221 tests passing (SCRUM-76)
- [ ] Integration tests across web, API and database (SCRUM-77)
- [ ] CI running every check above on each PR (SCRUM-65)
- [ ] End-to-end test on production with the whole team and demo rehearsal (SCRUM-68)
- [ ] Test on a real phone and in Safari, which have not been tested yet
- [ ] A Postman collection for the main API flows, exported from `/api/docs`

## Production environment

The MVP runs at [amlak.software](https://amlak.software) on one AWS EC2 server, deployed from the `main` branch with Docker Compose and served over HTTPS.

| Part | Detail |
| --- | --- |
| Web app | [amlak.software](https://amlak.software) |
| API | `https://amlak.software/api/v1` |
| API documentation | [amlak.software/api/docs](https://amlak.software/api/docs) (OpenAPI, Swagger UI) |
| Server | AWS EC2 t4g.small with an Elastic IP; access to S3 through an IAM role, no keys on the server |
| Services | `compose.prod.yaml`: PostgreSQL 18, the API container, and Caddy serving the built web app and proxying `/api` |
| HTTPS | Caddy with automatic Let's Encrypt certificates; ports 80 and 443 open to the web, plus SSH for administration |
| Storage and email | Photos and receipts on AWS S3; email through Resend from `mail.amlak.software` |
| Database changes | Prisma migrations run automatically when the API container starts |
| Deploying | Merge `develop` into `main`, then on the server: `git pull` and `docker compose -f compose.prod.yaml up -d --build` |

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started
This repository contains a work-in-progress Next.js application (app router) used as the base for a banking/transactions management UI and related API routes.

The project is not finished — some features, database migrations, and production hardening are still TODO. This README explains how to clone, run, and contribute locally.

## Quick start


Prerequisites:

- Node.js 18+ (or the version supported by Next.js 15)
- A PostgreSQL database (local or remote) if you want to use the built-in API routes that persist data

Recommended provider: [Neon](https://neon.tech)

This project was developed with Neon in mind as the preferred hosted Postgres provider, but any Postgres-compatible server works (local Postgres, Railway, Supabase, AWS RDS, etc.). Below are quick steps to connect a Neon database to this project.

Clone the repo:

```bash
git clone https://github.com/thisismalindu/mims-app.git
cd mims-app
```

Install dependencies:

```bash
npm install
```

Available npm scripts (from `package.json`):

- `npm run dev` — start Next.js in development mode
- `npm run build` — build for production
- `npm run start` — start the production server (after build)
- `npm run db:apply` — apply the database schema and create initial users (prompts for passwords)

Open [http://localhost:3000](http://localhost:3000) in your browser after running `npm run dev`.


Environment variables


This project includes a sample environment file: `sample.env.local`.
Copy it to `.env.local` in the project root and fill in the real values before running the app:

```properties
DATABASE_URL="your-postgres-connection-string"
JWT_SECRET="a-long-random-secret-for-signing-tokens"
```

Notes:
- `DATABASE_URL` should be a valid PostgreSQL connection string the `pg` package can use.
- `JWT_SECRET` is used by server API routes for signing/verifying JSON Web Tokens. Use a long, random value in production.

Optional (for email-based password reset/invite links via Resend):

```properties
RESEND_API_KEY="re_..."
EMAIL_FROM="MIMS <no-reply@yourdomain.com>"
```

How to connect Neon (neon.tech)


1. Create a Neon account and create a new project and branch. Neon will provision a serverless Postgres.

2. From the Neon dashboard, find the connection details for your branch and copy the connection string. It will look like:

	postgres://user:password@host:port/database

3. Use that connection string as `DATABASE_URL` in your `.env.local` file. Example:

```properties
DATABASE_URL="postgres://your_user:your_password@db.neon.tech:5432/your_db_name"
JWT_SECRET="a-long-random-secret-for-signing-tokens"
```

Notes when using Neon:
- Neon provides serverless branches — pick the branch you're connecting to.
- If Neon gives a TLS/SSL requirement, the `pg` client used by `lib/database.js` generally supports SSL via the connection string. If you need to pass SSL options, update `lib/database.js`.
- Neon connection strings sometimes contain query params (e.g., `?sslmode=require`). Keep them as provided.

If you prefer another Postgres provider or local Postgres, follow that provider's docs to obtain a connection string and set `DATABASE_URL` accordingly.


## Folder structure overview

Top-level files/folders you'll commonly work with:

- `app/` — Next.js app router. Pages, layouts and client components live here.
  - `app/page.js` — main landing page component
  - `app/layout.js` — root layout
  - `app/globals.css` — global styles (imports Tailwind in this project)
  - `app/api/` — serverless API route handlers (login, register, transactions, users, etc.)
    - `setup-database/database-schema.sql` — SQL schema to create the initial tables
    - `api/*/route.js` — route handlers used by the UI
  - `app/components/` — React components used by pages (Dashboard, Transactions, Users, etc.)
  - `login/` and `register/` — pages and components for auth flows

- `lib/database.js` — database connection helper (Postgres client wrapper)
- `public/` — static assets
- `sample.env.local` — example environment variables (copy to `.env.local`)
- `generate-hash.js` — small helper (likely for generating password salts/hashes; review before using)

Dependencies of note

- `next` 15.x — Next.js framework (app router)
- `react` 19.x — React
- `pg` — PostgreSQL client
- `bcrypt` — password hashing
- `jsonwebtoken`, `jose` — JWT handling and signing
- `chart.js`, `react-chartjs-2` — charts used by dashboard components
- `tailwindcss` — CSS utility framework (configured via postcss)

What is implemented today

- Basic Next.js app router structure with pages and components
- API routes for auth, users, transactions and setup scripts
- SQL file to create the database schema under `app/api/setup-database/database-schema.sql`

Known gaps / TODOs

- Database migrations and seed scripts are minimal or missing — the SQL file is provided but there's no migration tooling yet.
- Authentication/session hardening for production (refresh tokens, secure cookies, CSRF) needs review.
- Input validation and error handling can be improved on server routes.
- Tests are not included — consider adding unit and integration tests.

Tips for local development

- Use a local Postgres instance (Docker recommended) and point `DATABASE_URL` at it. Example Docker command:

```bash
docker run --name mims-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=mims -p 5432:5432 -d postgres:15
```

- After creating the DB, run the schema and create initial users via the interactive CLI:

```bash
# Ensure .env.local has DATABASE_URL set
npm run db:apply
```

What this does:
- Prompts you for admin/agent/manager passwords (hidden input)
- Hashes them in-memory (never writes to disk)
- Applies `src/app/api/setup-database/database-schema.sql` to your database with the placeholders replaced
- If you modify `sample.env.local`, re-copy to `.env.local` or restart the dev server so Next.js picks up new variables.

Security notes

- Do not commit `.env.local` or secrets to git. Keep `sample.env.local` as the template only.
- Use a strong value for `JWT_SECRET` and rotate it if it is ever exposed.

Contributing

If you want to contribute a new feature or fix, follow this recommended workflow to make collaboration smooth:

1. Clone the repository and add the upstream remote (if you forked):

```bash
git clone https://github.com/thisismalindu/mims-app.git
cd mims-app
# If you forked, add the original repo as upstream once:
git remote add upstream https://github.com/thisismalindu/mims-app.git
```

1. Keep your local master up to date before starting new work:

```bash
git fetch upstream
git checkout master
git pull upstream master
```

1. Create a feature branch using the convention `username-featurename`:

```bash
git checkout -b yourusername-myfeature
```

1. Make changes, commit logically (small, focused commits), and include a helpful commit message:

```bash
git add .
git commit -m "feat: add X feature to Y"
```

1. Publish your branch to your fork (or origin) and open a Pull Request against `master` on the upstream repository:

```bash
git push origin yourusername-myfeature
# Then open a PR from your fork/branch into upstream `master`
```

1. In your PR description, explain the change, include screenshots or steps to reproduce if applicable, and link any related issues.

1. The repository owner/maintainers will review and merge the PR into `master` once approved.

Tips / rules of thumb:

- Always fetch and pull the latest `master` before creating a new branch to reduce merge conflicts.
- If your branch gets out of date, rebase onto or merge the latest `master` before opening (or updating) the PR.
- Keep changes focused to a single feature or fix per branch/PR.
- Run the dev server and smoke test your changes locally before opening a PR.

Where to look next in the code

- `app/api/login/route.js`, `app/api/register/route.js` — auth flows and token creation
- `lib/database.js` — DB connection patterns
- `app/components/` — UI components to extend

Contact / support

If you need help with the repository, open an issue or reach out to the maintainers.

---

License

This project is licensed under the MIT License (see `LICENSE` in the repo).
## Setting up initial user accounts

Recommended: use the interactive CLI

```bash
# with DATABASE_URL set in .env.local
npm run db:apply
```

The CLI prompts you for the initial passwords (admin, agent, manager), hashes them in memory, and applies the SQL schema with the hashes substituted. Nothing sensitive is written to disk.

Manual alternative (optional)

If you prefer to generate hashes yourself:

1) Generate a bcrypt hash:

```bash
node generate-hash.js
```

2) Edit `src/app/api/setup-database/database-schema.sql` and replace `<adminhash>`, `<agenthash>`, and `<managerhash>` with your generated hashes. Then apply the SQL using psql or a GUI.

Notes:
- Do not commit real passwords or generated hashes to the repository.
- You can re-run `npm run db:apply` against a clean database to re-seed.

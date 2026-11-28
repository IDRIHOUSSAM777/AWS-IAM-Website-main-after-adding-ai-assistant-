# AWS IAM & Access Security — Student Builder

KYUBI, the AWS IAM assistant, is included in this app. It talks to Google Gemini through a small server-side proxy in `server/`, so the API key never reaches the browser and is never committed.

The app saves anonymous quiz progress in a **MySQL/MariaDB database that runs inside a virtual machine (VM)**. The database is not part of this repository.

## ⚠️ The database VM must be turned on

- **The owner of the project must power on the VM** before the quiz works. The rest of the site still opens without it.
- The VM is on a **private network** (`192.168.59.128`, port `3306`). You must be on the same network or VPN.
- Ask the owner for the **database password** privately.
- No database data, password or secret is stored in this repository — only `database/schema.sql` (empty structure) is committed.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

That runs the whole site, KYUBI included.

- Without a Gemini key, the site still runs and KYUBI replies that it is not connected yet.
- Without the VM, the site still runs; only the quiz is unavailable.

## Environment (`.env`)

Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

```bash
# KYUBI — Google Gemini (optional)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite

# Database — the owner's VM (must be powered on)
DB_HOST=192.168.59.128
DB_PORT=3306
DB_USER=aws
DB_PASSWORD=
DB_NAME=aws_iam_platform
```

The database schema is in [`database/schema.sql`](database/schema.sql). It creates the `aws_iam_platform` database and its tables. The backend reads the connection details from `.env` (`server/profile-api.mjs`).

If you want to run your own database instead of the VM, install MariaDB/MySQL and import `database/schema.sql`.

## KYUBI setup (one shared team key)

Do **not** create one key per teammate, and never commit the key.

1. One owner creates the key at <https://aistudio.google.com/apikey> and keeps it in the team password manager (1Password, Bitwarden, …).
2. Each teammate copies `.env.example` to `.env` and pastes the shared key.

3. `npm run dev`. The key is read only by the Node/Vite server (`server/kyubi-api.mjs`) and is never sent to the browser.

`.env`, `.env.local` and `.env.*` are already git-ignored; only `.env.example` (no secret) is committed. If a key ever lands in a commit, revoke it in AI Studio and create a new one.

Optional: API keys can be restricted to the Generative Language API in Google Cloud Console, so a leaked key cannot be used for other Google services.

### Scripts

- `npm run dev` — app + APIs at `http://localhost:5173`
- `npm run build` — type-check and build to `dist/`
- `npm run preview` — serve the build with the APIs
- `npm run start` — production Node server for `dist/` + APIs (`PORT`, default `4173`)
- `npm run lint` — Oxlint

### Files

| Path | Role |
| --- | --- |
| `src/kyubi/Kyubi.tsx` | Floating mascot button, chat window, greeting, states |
| `src/kyubi/MessageText.tsx` | Small Markdown renderer for answers |
| `src/kyubi/kyubi.css` | Isolated styles (`ky-` prefix) |
| `server/kyubi-api.mjs` | Gemini proxy: validation, same-origin check, rate limit, error mapping |
| `server/kyubi-system-prompt.mjs` | KYUBI's system instructions |
| `server/profile-api.mjs` | Visitor identity lookup for KYUBI |
| `server/quiz-api.mjs` | Anonymous quiz questions and progress |
| `server/index.mjs` | Dependency-free production server |
| `database/schema.sql` | Database and tables |
| `public/kyubi/` | Original Kyubi avatar and greeting videos |

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

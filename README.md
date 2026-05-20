# OctoPulse

A zero-backend GitHub maintainer dashboard. Triage *what needs you* and *what's rotting* across many repos from a single page — no server, no data collection, no vendor lock-in.

- **Action Required Inbox** — review requests, assignments, blocked PRs, and unanswered external issues
- **Repository Pulse Grid** — health-at-a-glance for every tracked repo (green / amber / red)
- **Stale Watch** — open threads ranked by days-since-last-activity
- **One-click merge / close** — confirm modal, REST mutation, refresh
- **LLM-powered thread summarizer + intent classifier** — bring-your-own provider (OpenAI / Groq / OpenRouter / Gemini / any OpenAI-compatible endpoint, including local llama.cpp / Ollama)
- **Demo mode** — drive the full UI with no token

Everything runs in your browser. Your PAT and LLM key live in `localStorage` and are never transmitted anywhere except directly to the APIs they belong to.

---

## Quickstart

```bash
git clone <this-repo> octopulse
cd octopulse
npm install
npm run dev
```

Open <http://localhost:5173>. Choose **Try demo mode** to test-drive without a token, or paste a GitHub PAT to load real data.

Production build:

```bash
npm run build         # outputs static dist/
npm run preview       # serve the build locally
```

---

## GitHub Personal Access Token

OctoPulse needs a PAT to call the GitHub API directly from the browser. (Device Flow would be nicer but `github.com/login/device/code` blocks browser CORS.) Choose one of:

**Classic PAT** — quickest. Visit <https://github.com/settings/tokens/new?scopes=repo,read:org,read:user&description=OctoPulse>. The scopes `repo`, `read:org`, `read:user` are pre-filled. Generate, copy, paste into OctoPulse.

**Fine-grained PAT** (recommended for least-privilege) — Visit <https://github.com/settings/personal-access-tokens/new>. Grant access to the repos you want to track and the following permissions:
- **Issues** — Read & write (needed to close issues)
- **Pull requests** — Read & write (needed to merge PRs)
- **Contents** — Read
- **Metadata** — Read
- **Members** — Read (for org repos)

The token stays in your browser's `localStorage` under the key `octopulse:githubToken`. Use the **Sign out** button to clear it.

---

## LLM provider setup

Open the settings panel (gear icon, top right) → **AI Assistant** section. The summarizer + intent classifier are gated on a configured provider; the dashboard itself works without one.

| Provider | Where to get a key | Default model |
|---|---|---|
| **OpenAI** | <https://platform.openai.com/api-keys> | `gpt-4o-mini` |
| **Groq** | <https://console.groq.com/keys> | `llama-3.3-70b-versatile` |
| **OpenRouter** | <https://openrouter.ai/keys> | `openrouter/auto` |
| **Gemini** | <https://aistudio.google.com/apikey> | `gemini-2.0-flash` |
| **Custom (OpenAI-compatible)** | local — llama.cpp, LM Studio, Ollama, etc. | `llama3` (default base URL `http://localhost:11434/v1`) |

Click **Test** after pasting your key. Defaults rot fast — feel free to override the model. Keys persist in `localStorage` under `octopulse:llmConfig`.

> **Ollama users:** start Ollama with `OLLAMA_ORIGINS="*" ollama serve` (or your specific origin) so the browser can call it.

---

## Deploy

Production builds are pure static files in `dist/`. Any static host works.

**GitHub Pages**
```bash
npm run build
# Push dist/ to gh-pages branch, or use the official Pages action.
```
Set your repo's Pages source to the `gh-pages` branch (or to GitHub Actions if using the action).

**Cloudflare Pages**
- Build command: `npm run build`
- Build output directory: `dist`
- No env vars needed.

**Vercel (static)**
- Framework preset: **Vite**
- Output directory: `dist`
- No serverless functions needed.

**Local file (no host)**
```bash
npm run build
cd dist && python3 -m http.server 8000
```
Browse to <http://localhost:8000>. Useful when you'd rather not deploy at all.

---

## Privacy & security

- Your PAT and LLM API key live in `localStorage` only. They never leave your browser except to the APIs they authenticate to (api.github.com, your configured LLM provider).
- No telemetry, no analytics, no third-party scripts.
- The whole app is a single static bundle; you can read the network tab and verify.

If you don't want OctoPulse to keep a token at all, use **demo mode**.

---

## Stack

Vite 8 · React 19 · TypeScript strict · Tailwind v4 · Lucide React · Vitest

GitHub data: GraphQL primary (`/graphql`) with ETag-cached REST fallbacks for the few endpoints GraphQL doesn't cover (merge PR, close issue, fetch issue body, fetch comments).

Refresh strategy: load + manual button + on tab-focus if the cache is older than 5 minutes.

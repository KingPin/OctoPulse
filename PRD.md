Product Requirement Document (PRD) & Master Prompt

Project Name: OctoPulse (The Unified GitHub Maintainer Command Center)

1. Executive Summary

OctoPulse is a single-page, high-density dashboard designed specifically for open-source and professional software maintainers. Its primary objective is to aggregate critical, actionable events (unresolved issues, review requests, and failing builds) across dozens of repositories into a single, clean browser viewport.

By eliminating the noise of traditional email streams, OctoPulse prevents critical community contributions and user-reported bugs from getting lost in spam. It runs completely client-side, storing credentials and state in local browser storage, offering users 100% privacy, zero data collection, and zero hosting friction.

2. System Architecture & Security

To keep hosting costs at exactly $0, ensure absolute data privacy, and make the codebase highly portable, the system is designed around a Client-Side-First Architecture.

                           +----------------------------------------+
                           |          User's Web Browser            |
                           |                                        |
                           |   +-------------------+  Local Writes  |
                           |   | LocalStorage/IDB  |<============+  |
                           |   | (PAT, OAuth Token,|             |  |
                           |   |  Repo Lists, Keys)|             |  |
                           |   +-------------------+             |  |
                           |             || Read                 |  |
                           |             \/                      |  |
                           |   +-------------------+             |  |
                           |   |   Dashboard UI    |-------------+  |
                           |   +-------------------+                |
                           +----------------------------------------+
                                 ||                    ||
                   Direct Client || HTTP               || Direct Client
                   GraphQL/REST  || Requests           || HTTP (User Key)
                                 \/                    \/
                         +---------------+     +---------------+
                         |  GitHub API   |     |  Gemini API   |
                         +---------------+     +---------------+


2.1 Storage Layer

LocalStorage / IndexedDB: All access tokens (Personal Access Tokens, GitHub OAuth Tokens), custom repository tracking lists, configurations, and user preferences are saved directly to the user’s browser storage. No data ever touches a remote database owned by the developer.

2.2 Authentication Flow Options

Option A: Personal Access Token (PAT) [Default / Zero-Config]

User inputs a classic GitHub PAT with repo and read:org scopes.

Saved directly to browser storage.

Option B: Standard GitHub OAuth Login (With Free Serverless Proxy)

To allow standard "Log In with GitHub" buttons without exposing credentials:

A 15-line serverless backend (Cloudflare Worker or Vercel Serverless Function) acts as an exchange gateway.

The proxy accepts a temporary code from the browser, appends the secret client_secret, makes the CORS-restricted token trade with GitHub, and returns the encrypted access_token to the frontend.

No user tokens or logs are preserved on the proxy.

2.3 CORS & Rate Limiting

Because the browser queries api.github.com directly, all API requests leverage the individual user's token rate limit (5,000 requests per hour).

Requests use aggressive local caching (e.g., matching ETag headers) to stay well within limits.

3. Core Features: Version 1 (The MVP Dashboard)

3.1 Onboarding & Setup Workspace

Token Input Panel: Clean form to input a PAT or initiate OAuth. Includes a validation status indicator checking token validity and scope requirements.

Repository Selection Engine:

Auto-Discover Mode: Fetch all repositories the token has access to (both public and private, including organization repos).

Manual Override Mode: Allow users to paste raw repo strings (e.g., facebook/react, owner/repo) to track specific open-source codebases.

3.2 The "Action Required" Inbox (Top Priority)

This is the main inbox. It automatically filters and bubbles up items based on priority rules:

Unanswered Issues: Issues created by external users with zero responses from the repository owners or collaborators.

My Review Requests: Pull requests across all tracked repositories where the user is listed as an assigned reviewer.

Blocked PRs: Your open pull requests that have requested changes from other reviewers or have failing CI/CD status checks.

3.3 Dynamic Repository Pulse (The Grid Layout)

A responsive grid showing customizable repository cards.

Repository Cards:

Repository name, description, and status badges (Public/Private/Fork).

Numerical metrics: Open PR Count, Open Issue Count, Pending Releases, and Last Active Timestamp.

Health Status Outline: Green (no outstanding activity), Amber (unresolved issues/PRs older than 3 days), Red (unresolved issues/PRs older than 7 days, or failing main-branch build).

3.4 Unified Global Activity Stream

A chronological timeline rendering events across all tracked repositories:

Recent commits (showing author avatar, shortened hash, and commit message).

New issue declarations and pull request openings.

Ability to filter the timeline by event type (commits, issues, PRs).

4. Bells & Whistles: Version 2 (Future Scalability)

4.1 On-Dashboard Interaction Engine

Direct Commenting: Click on an issue/PR in the dashboard to open a modal that renders the markdown comment thread. Users can write a reply and submit it directly to GitHub without leaving OctoPulse.

Direct Merging/Closing: Perform simple operations like merging a passing PR (squash, rebase, or merge commit) or closing stale issues right from the UI.

4.2 Client-Side AI Intelligence (Gemini Integration)

API Key Config: A setting where users can paste their own free Gemini API Key (saved safely to LocalStorage).

Smart Features Powered by Gemini (gemini-2.5-flash-preview-09-2025):

Instant Comment Thread Summarizer: Condense highly active, long-winded debate threads on issues or pull requests into a 3-bullet-point summary.

Tone & Intent Detector: Flags issues as "Urgent bug", "Feature request", or "General configuration question" even if the author applied no labels.

Auto-Draft Replies: Click "Draft Response" to generate a polite, contextual reply to an issue based on the project's details.

4.3 Stale-Track & Progress Visualizations

"Stale Timer" Overlays: Visually highlights open issues showing "Days Since Last Comment" to easily spot conversations that have stalled out.

D3/Chart.js Metric Analytics: Visual trends showing open vs. closed issues over a 30-day period.

4.4 Custom Webhook Listening Mode (For VPS Deployments)

If hosted on a VPS/Serverless framework rather than static hosting, provide a toggle to activate real-time webhooks, transforming the page from pull-polling to a live-updating web socket layout.

5. UI/UX Specifications

Visual Philosophy: High-density, professional developer interface (reminiscent of Linear, Vercel, or GitHub's dark theme). Clean borders, sophisticated neutral gradients, subtle shadow levels, and tight layouts.

Theme Engine: Standard system-matching Dark/Light toggle.

Responsive Adaptation:

Grid shifts dynamically from a 3-column setup (Desktop) to a single-column layout (Mobile).

Interactive items must have accessible, clear tap areas ($>44\text{px}$ on touchscreens).

Status Badging System:

Danger Red for failing checks or critical errors.

Warning Yellow for stale items or pending approvals.

Success Green for passing builds or clean repositories.

Brand Blue/Purple for basic activity and notifications.

6. GitHub API Implementation Requirements

To ensure the application operates rapidly without hitting API limits, the system should employ a hybrid GraphQL / REST query plan.

6.1 Recommended Unified GraphQL Query (Fetch Everything in One Request)

Instead of executing dozens of REST queries per repository, use a single optimized GraphQL POST query.

query GetRepoMetrics($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    name
    description
    isPrivate
    url
    stargazerCount
    object(expression: "main") {
      ... on Commit {
        statusCheckRollup {
          state
        }
      }
    }
    issues(states: OPEN, first: 20, orderBy: {field: CREATED_AT, direction: DESC}) {
      totalCount
      nodes {
        id
        title
        number
        createdAt
        url
        author {
          login
          avatarUrl
        }
        comments(first: 1) {
          totalCount
        }
      }
    }
    pullRequests(states: OPEN, first: 20, orderBy: {field: CREATED_AT, direction: DESC}) {
      totalCount
      nodes {
        id
        title
        number
        url
        createdAt
        reviewRequests(first: 5) {
          nodes {
            requestedReviewer {
              ... on User {
                login
              }
            }
          }
        }
      }
    }
  }
}


7. Master AI Instruction Prompt (The "Build It" Prompt)

Copy and paste this section directly into your coding model to build the application.

Act as a Senior Frontend and Systems Engineer. I want you to build a single-file, production-ready React application featuring Tailwind CSS and Lucide Icons. The application is a Client-Side GitHub Maintainer Dashboard called "OctoPulse".

### Functional Guidelines:
1. Deliver the code inside a single self-contained react file (App.jsx) that exports the primary App component by default.
2. Ensure there are ZERO external script dependencies besides React, Tailwind CSS, and Lucide icons.
3. Keep all configurations, Personal Access Tokens (PAT), and user state stored in `localStorage`. 
4. The application MUST support:
   - Onboarding via PAT string entry.
   - Live querying of the GitHub REST/GraphQL endpoints using the user's stored token.
   - An "Action Items" aggregate section showing unresolved PRs, unanswered issues, and build statuses across all input/selected repos.
   - An intuitive "Repository Pulse" overview grid displaying repository health statuses.
   - Global activity streams detailing recent commits and events.
   - Beautiful, high-density dashboard layouts optimized with modern UI/UX principles (subtle gradients, rounded borders, clean light/dark modes).
5. Implement safe, resilient API error handling. Include robust loading UI, custom alerts (no native alerts or confirms), and smart exponential retry backoffs.
6. Provide a dummy dashboard mode if no PAT is input, letting the user test drive the layout with mock workspace data.

Design for maximum aesthetic appeal, high informational density, and exceptional responsiveness across both mobile and wide monitor layouts. Let's begin.

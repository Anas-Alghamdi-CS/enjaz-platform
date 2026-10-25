# Enjaz — Student Projects Platform

![Status](https://img.shields.io/badge/Status-Live-brightgreen)
![GitHub Pages](https://img.shields.io/badge/Hosted-GitHub%20Pages-blue)
![Supabase](https://img.shields.io/badge/Auth%20%26%20Data-Supabase-3FCF8E)
![Stack](https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20HTML%20%7C%20CSS-f7df1e)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

A role-based academic project management platform where **students** submit project proposals, **supervisors** review them and give feedback, and **admins** oversee the whole platform. Built with zero build steps and deployed as a static site.

## Live Demo

**[Open Enjaz Platform →](https://anas-alghamdi-cs.github.io/enjaz-platform/)**
· [Video walkthrough](https://youtu.be/0gzl_PbU0ic)

---

## Demo Accounts

Created by the one-click seed tool (`seed.html`). All accounts share the same password.

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@enjaz.demo` | `Password123!` |
| Supervisor | `dr.khalid.demo@enjaz.com` | `Password123!` |
| Supervisor | `dr.sara.demo@enjaz.com` | `Password123!` |
| Student | `student.ali.demo@enjaz.com` | `Password123!` |
| Student | `student.nora.demo@enjaz.com` | `Password123!` |
| Student | `student.fahad.demo@enjaz.com` | `Password123!` |

> You can also register your own student or supervisor account from the **Create Account** tab. Admin accounts can only be granted by an existing admin (or by the seed tool).

---

## Features

| Role | Capabilities |
|------|--------------|
| 🎓 **Student** | Submit a proposal and pick a supervisor · track progress on a visual status timeline · discuss in a per-project comment thread · receive notifications |
| 👨‍🏫 **Supervisor** | See assigned projects with stats · change status from the card or detail modal · comment on projects · **a written reason is mandatory to reject a project** |
| 🔑 **Admin** | Manage user roles · view and delete any project · status distribution chart · broadcast announcements to all users |

Cross-cutting behaviour:

- **Live comment threads and notification badge** via Supabase Realtime, with a 30-second polling fallback.
- **Rejection rule** enforced in a single code path (`applyStatusChange`): the reason comment is saved first, and the status is only changed if that succeeds.
- **Error handling:** every Supabase call is wrapped in `try/catch` and reports failures through a toast.
- **Dark / light mode** persisted in `localStorage`, defaulting to the OS preference and applied before first paint (no flash).
- **Responsive layout** for mobile, tablet, and desktop; Tajawal + Inter fonts with RTL-ready styles (`dir="rtl"`) and per-element bidi handling for Arabic user content.

---

## Architecture

```
┌──────────────────────────── Browser (GitHub Pages) ────────────────────────────┐
│  index.html ── structure        style.css ── tokens, themes, responsive        │
│  app.js ── auth · role routing · CRUD · realtime · notifications               │
└───────────────┬────────────────────────────────────────────────────────────────┘
                │ supabase-js (CDN)
┌───────────────▼────────────────────────────────────────────────────────────────┐
│ Supabase                                                                       │
│   Auth (email + password)      PostgreSQL + Row-Level Security      Realtime   │
└────────────────────────────────────────────────────────────────────────────────┘
```

Role flow after sign-in:

```
login ─► profiles.role ─┬─ student ─► My Projects (submit, timeline, comments)
                        ├─ doctor  ─► Supervision (stats, status actions, comments)
                        └─ admin   ─► Admin Panel (users, projects, chart, broadcast)
```

### Data model

| Table | Purpose |
|-------|---------|
| `profiles` | One row per user — `id`, `name`, `email`, `role` (created on signup by a trigger) |
| `projects` | `title`, `description`, `status`, `student_id`, `doctor_id`, timestamps |
| `comments` | `project_id`, `author_id`, `body`, `created_at` |
| `notifications` | `user_id`, `message`, `link_type`, `link_id`, `is_read` |

Statuses: `Pending → In Progress → Under Review → Approved / Rejected / Completed`.

Row-Level Security policies restrict students to their own projects, supervisors to assigned ones, and admins to everything. Enable **Realtime** for the `comments` and `notifications` tables to get instant updates.

---

## Run Locally

No build step is required — it is a static site.

```bash
git clone https://github.com/Anas-Alghamdi-CS/enjaz-platform.git
cd enjaz-platform
python -m http.server 8000   # then open http://localhost:8000
```

To use your own backend, create a Supabase project, create the four tables above with RLS, and replace `SUPABASE_URL` / `SUPABASE_ANON` at the top of `app.js` (only the public anon key belongs in client code). Then open `seed.html` and press the button to create the demo data.

## Deploy to GitHub Pages

1. Push the repository to GitHub.
2. **Settings → Pages →** Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. The site is served at `https://<username>.github.io/enjaz-platform/`.

---

## Project Structure

```
enjaz-platform/
├── index.html    ← App markup (auth, dashboard views, modal)
├── app.js        ← Application logic (Supabase queries, roles, realtime)
├── style.css     ← Design tokens, components, dark mode, responsive rules
├── seed.html     ← One-click demo accounts and sample data
├── .nojekyll     ← Disables Jekyll on GitHub Pages
├── README.md
└── PROMPTS.md    ← AI prompts and design decisions log
```

---

## Academic Context

Developed as a course assignment for **Principles of Artificial Intelligence (مبادئ الذكاء الاصطناعي)** at Umm Al-Qura University.

**Developer:** Anas Alghamdi

## License

MIT

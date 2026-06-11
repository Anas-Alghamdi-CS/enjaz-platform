# Enjaz Platform — Student Projects Management

![Status](https://img.shields.io/badge/Status-Live-brightgreen)
![GitHub Pages](https://img.shields.io/badge/Hosted-GitHub%20Pages-blue)
![Supabase](https://img.shields.io/badge/Auth-Supabase-3FCF8E)
![Airtable](https://img.shields.io/badge/DB-Airtable-FFBF00)

## Live Demo

**[Open Platform →](https://Anas-Alghamdi-CS.github.io/enjaz-platform/)**

---

## Overview

**Enjaz** is a professional student project management platform built as an evolutionary project across three assignments in **AI4101 — Generative AI & Vibe Coding**.

| Assignment | What was built | Weight |
|------------|----------------|--------|
| A1 | Single-Page App with a professional UI deployed to GitHub Pages | 3% |
| A2 | Full CRUD operations backed by Airtable (Create / Read / Update / Delete) | 4% |
| A3 | Supabase authentication + professional GitHub Pages hosting | 3% |

---

## Features

- 🔐 **Authentication** — Sign up, sign in, and sign out via Supabase Auth
- 📋 **Full CRUD** — Add, view, edit, and delete projects stored in Airtable
- 📊 **Analytics Chart** — Project distribution by stage (powered by Chart.js)
- 🌙 **Dark Mode** — Persistent theme preference via localStorage
- 📱 **Responsive Design** — Works on mobile and desktop
- 👥 **Role-based UI** — Student view and Supervisor view
- ⚡ **No build step** — Runs directly on GitHub Pages

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5 + Vanilla CSS + Vanilla JavaScript |
| Authentication | Supabase (loaded via CDN) |
| Database | Airtable REST API |
| Charts | Chart.js |
| Icons | Font Awesome 6 |
| Fonts | Google Fonts — Tajawal |
| Hosting | GitHub Pages |

---

## Project Structure

```
enjaz-platform/
├── index.html      ← Single-page app shell
├── style.css       ← Complete design system with dark mode
├── app.js          ← Auth logic + Airtable CRUD + UI controllers
├── README.md       ← This file
└── PROMPTS.md      ← AI prompts and design decision log
```

---

## Airtable Data Model

**Table name:** `Projects`

| Field | Type | Description |
|-------|------|-------------|
| Name | Single line text | Project title |
| Description | Long text | Short project summary |
| Status | Single select | Planning / Design / In Progress / Review / Completed |
| StudentEmail | Email | Owner's email address |

---

## Assignment Checklist

### A1 — Ship Your First App ✅
- [x] Working single-page application
- [x] Built primarily through AI prompting (vibe coding)
- [x] Deployed to a public URL on GitHub Pages

### A2 — Add Data & CRUD ✅
- [x] **Create** — Add a new project via the form
- [x] **Read** — Fetch and display all projects from Airtable
- [x] **Update** — Edit a project through a modal dialog
- [x] **Delete** — Remove a project with a confirmation prompt
- [x] Connected to Airtable as the live data store

### A3 — Go Professional ✅
- [x] Supabase Auth — sign up, sign in, sign out
- [x] Role metadata stored in Supabase user object
- [x] GitHub Pages as the production host (no build step required)

---

## Developer

**Student:** Anas Alghamdi
**ID:** 444005852
**Course:** AI4101 — Generative AI & Vibe Coding  
**University:** Umm Al-Qura University

---

## License

MIT — Academic use

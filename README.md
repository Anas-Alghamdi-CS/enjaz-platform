# Enjaz — Student Projects Platform

![Status](https://img.shields.io/badge/Status-Live-brightgreen)
![GitHub Pages](https://img.shields.io/badge/Hosted-GitHub%20Pages-blue)
![Supabase](https://img.shields.io/badge/Auth%20%26%20Data-Supabase-3FCF8E)

## Live Demo

**[Open Enjaz Platform →](https://Anas-Alghamdi-CS.github.io/enjaz-platform/)**

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@enjaz.demo` | `Enjaz@2025` |
| **Supervisor (Doctor)** | `dr.sara@enjaz.demo` | `Enjaz@2025` |
| **Student** | `student1@enjaz.demo` | `Enjaz@2025` |

> You can also register a new account from the Sign Up tab — no email confirmation required.

---

## What It Does

A fully interactive, role-based academic project management platform with real-time collaboration between students, supervisors, and administrators.

---

## Role Capabilities

### 🎓 Student
- Submit a new project proposal (title, description, select supervisor)
- View all own projects with a **visual status timeline** (Pending → In Progress → Review → Done)
- Read feedback and **reply in comment threads** per project
- Receive **real-time notifications** when the supervisor changes status or comments

### 👨‍🏫 Supervisor (Doctor)
- View all projects assigned to them with student details
- **Change project status** directly from the project card or the detail modal
- Add feedback comments — with a **mandatory rejection reason** when rejecting
- Dashboard stats: Total supervised / Pending / Under Review / Completed
- Receive notifications when students submit new projects

### 🔑 Admin
- **User management table** — view all users, change roles (student ↔ supervisor ↔ admin)
- **Full project oversight** — see all projects from all users, open any, delete any
- **Analytics chart** — doughnut chart showing project distribution by status
- **Broadcast announcements** — send a platform-wide notification to every user at once

---

## Interactive Features (not just UI)

| Feature | Description |
|---------|-------------|
| Comment threads | Each project has a chat-style comment thread visible to student + supervisor + admin |
| Status timeline | Visual step indicator per project (Pending → In Progress → Under Review → Approved/Rejected/Completed) |
| Rejection reason | Doctor must write a comment before the "Rejected" status can be applied |
| Notification bell | Bell icon with unread badge — clicking shows inbox of all notifications |
| Supervisor picker | Student selects a supervisor when submitting (not a random assignment) |
| Announcement broadcast | Admin can send one message that appears in every user's notification inbox |
| Role management | Admin can change any user's role live from the users table |
| Dark / Light mode | Persistent theme toggle across sessions |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Single-file HTML + Vanilla CSS + Vanilla JS |
| Authentication | Supabase Auth (email/password, no email confirmation) |
| Database | Supabase PostgreSQL (projects, comments, profiles, notifications) |
| Charts | Chart.js v4 (CDN) |
| Hosting | GitHub Pages |

---

## Supabase Schema

**4 tables:**

| Table | Purpose |
|-------|---------|
| `profiles` | One row per user — name, role, email (auto-created on signup via trigger) |
| `projects` | Project proposals — linked to student + supervisor by user ID |
| `comments` | Thread per project — linked to project + author |
| `notifications` | Inbox per user — created on status change, comment, or announcement |

Row-Level Security ensures students only see their own projects, doctors only see assigned ones, and admins see everything.

---

## Project Structure

```
enjaz-platform/
├── index.html       ← Complete single-file app (HTML structure)
├── app.js           ← All application logic (Supabase queries, roles, events)
├── style.css        ← Complete styling (design tokens, components, responsive)
├── seed.html        ← One-click tool to create demo accounts & sample data
├── .nojekyll        ← Disables Jekyll on GitHub Pages
├── README.md        ← This file
└── PROMPTS.md       ← AI prompts and design decisions log
```

---

## Assignment Context

This is Assignment 3 (A3) for **AI4101 — Generative AI & Vibe Coding** at Umm Al-Qura University.

| Requirement | Status |
|-------------|--------|
| GitHub Pages deployment | ✅ |
| Supabase Auth (email/password) | ✅ |
| Supabase Database (real CRUD) | ✅ |
| Role-based access (student / doctor / admin) | ✅ |
| Real interactivity between roles | ✅ |
| Seed data for demonstration | ✅ |

---

## Developer

**Student:** Anas Alghamdi
**Course:** AI4101 — Generative AI & Vibe Coding
**University:** Umm Al-Qura University

---

## License

MIT — Academic use

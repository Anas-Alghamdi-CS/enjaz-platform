# PROMPTS.md — AI Prompts & Design Decision Log
## Enjaz Platform | AI4101 — Generative AI & Vibe Coding

---

## AI Tool Used

**Tool:** Antigravity (Gemini Advanced + Claude Sonnet)  
**Why this tool:** A fully integrated vibe coding environment that understands project context, executes code directly, and supports iterative pair programming — removing the friction between idea and working code.

---

## A1 — Top 3 Prompts (Ship Your First App)

### Prompt 1 — Core Idea
> *"Build a single-page app for student project management. The interface should be professional and polished, support Arabic right-to-left layout, and include a dashboard and project list view."*

**Design Decision:** Chose a student project platform because it solves a real academic problem and allows clear, incremental development across all three assignments without switching domains.

---

### Prompt 2 — Visual Design System
> *"Use a professional color system based on Indigo/Purple tones. Add dark mode support, smooth CSS animations, and Font Awesome icons. Use the Tajawal Arabic font from Google Fonts."*

**Design Decision:** Tajawal is the highest-quality Arabic typeface for technical UIs. Building the entire color system with CSS custom properties (variables) made dark mode trivial to implement — one attribute change on `<html>` switches the entire theme.

---

### Prompt 3 — SPA Navigation Architecture
> *"Make it a true Single-Page Application with no page reloads. Navigation between views should be handled purely in JavaScript. Use a fixed sidebar on the right (RTL) and a sticky top header."*

**Design Decision:** SPA architecture is the right choice for GitHub Pages because there is no server-side routing. All navigation stays client-side, which means the app works perfectly from a static file host.

---

## A2 — Data Model & CRUD Prompts

### Data Model

**Airtable Table:** `Projects`

| Field | Type |
|-------|------|
| Name | Single line text |
| Description | Long text |
| Status | Single select (Planning / Design / In Progress / Review / Completed) |
| StudentEmail | Email |

---

### Prompt 4 — Full CRUD with Airtable
> *"Add full CRUD to the project list using the Airtable REST API. Create: a form to add new projects. Read: fetch and render all records in a table. Update: open a modal dialog for editing without leaving the page. Delete: remove with a confirmation dialog. Use fetch() with async/await throughout."*

**Design Decision:** A modal dialog for editing was chosen over inline editing because it provides a clear, bounded interaction — the user knows exactly what they are changing, and there is no risk of accidental edits to other rows.

---

### Prompt 5 — UX Feedback Layer
> *"Add a loading spinner while data is being fetched, a toast notification system for success and error states, an empty state message when no projects exist, and summary stat cards above the project list."*

**Design Decision:** Visual feedback is mandatory in async CRUD applications. Without a loading state, the user has no indication that a network request is happening. The toast system was kept non-blocking (bottom center, auto-dismiss) so it doesn't interrupt the workflow.

---

## A3 — Professional Stack Prompts

### Prompt 6 — Supabase Auth via CDN
> *"Add Supabase authentication using the CDN build (no npm, no bundler) so the app stays compatible with GitHub Pages. Implement sign-up, sign-in, and sign-out. Store the user's role (student or supervisor) in Supabase user metadata."*

**Design Decision:** Supabase was chosen over Firebase for two reasons: it is the tool specified in the A3 assignment brief, and it provides a clean JavaScript CDN build that works in a script tag without any build tooling. Storing role in `user_metadata` avoids the need for a separate database table.

---

### Prompt 7 — GitHub Pages Compatibility
> *"The entire project must run on GitHub Pages with zero build steps. No Node.js, no Vite, no webpack. Vanilla JavaScript only, with all dependencies loaded from CDN."*

**Design Decision:** This was the most important architectural constraint. Choosing a CDN-only approach instead of a framework (Vite, Next.js) means deployment is a simple `git push` with no CI pipeline or build configuration needed.

---

## Lessons Learned from Vibe Coding

1. **Context-rich prompts produce better code** — describing the *why* alongside the *what* consistently produced more appropriate solutions than functional specs alone.
2. **Incremental refinement is the workflow** — no single prompt produced the final result; improvement happened through iteration.
3. **Technical constraints belong in the first prompt** — specifying "GitHub Pages compatible, no build step" early prevented wasted effort on framework-based solutions.
4. **Review generated code** — AI tools occasionally produce code that works but has security implications (e.g., API tokens visible in client-side code). Reviewing every output is part of the vibe coding skill.

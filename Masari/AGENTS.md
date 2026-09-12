# AGENTS.md — Masari (مساري) Engineering Guide & Agent Instructions

This document provides mandatory operational, architectural, and quality instructions for AI agents working on the **Masari (مساري)** repository. Every AI agent operating in this workspace must read, internalize, and strictly comply with this document before planning or executing any task.

---

## 1. Project Identity

* **Product Definition:** Masari (مساري) is an AI-guided self-assessment and career planning platform designed specifically for Saudi university graduates. It helps graduates identify a target career path, calculate skill gaps, generate a 4-phase actionable weekly development roadmap, and prepare ATS-friendly resumes and profiles.
* **Operational Reality:** This is an **existing, fully functional Minimum Viable Product (MVP)**. It is **NOT** a greenfield project.
* **Primary Source Files:** The application currently lives in [`massari-career-ai-main/index.html`](massari-career-ai-main/index.html), accompanied by project documentation ([`README.md`](massari-career-ai-main/README.md), [`PROJECT.md`](massari-career-ai-main/PROJECT.md), [`TECHNICAL.md`](massari-career-ai-main/TECHNICAL.md), [`DATA_SOURCES.md`](massari-career-ai-main/DATA_SOURCES.md)).

---

## 2. Core Engineering Principles

1. **Preserve Working Behavior:** Never break, degrade, or alter working features unless explicitly instructed by the user.
2. **Small, Incremental, Reversible Changes:** Prioritize surgical, minimal diffs over large, sweeping alterations. Every change must be easy to inspect, test, and rollback.
3. **Understand First, Modify Second:** Always inspect and understand the existing logic, state structures, and side effects before modifying any code.
4. **No Unnecessary Rewrites:** Never rewrite or replace large portions of working code simply for personal style or modern conventions.
5. **No Speculative Features:** Do not build features, abstractions, or configurations that were not explicitly requested.
6. **Deterministic & Explainable Logic:** Career scoring, ATS checks, and skill evaluations must remain transparent, deterministic, and explainable to users.
7. **Privacy by Default:** Treat user data as strictly private and local. Do not weaken privacy boundaries.

---

## 3. Architecture Rules

* **Current Architecture as Source of Truth:** Treat the current Vanilla HTML5, Vanilla CSS3, and native JavaScript (ES2020) architecture as the authoritative standard.
* **No Unapproved Framework Migrations:** Do **NOT** migrate to React, Vue, Svelte, Next.js, Vite, TypeScript, or any build tool unless the user explicitly requests and approves the migration.
* **Separation of Concerns:** Whenever evolving the codebase, keep business and mathematical logic cleanly separated from DOM manipulation and HTML rendering.
* **Preserve State and Persistence Model:** Maintain the normalized `state` schema, explicit consent gating, and single-key `localStorage` (`masari.v2`) pattern unless a migration is explicitly approved.
* **Preserve Bilingual & Bidirectional Integrity:** Every UI element, text string, and flow must maintain full parity between Arabic (`ar`, RTL) and English (`en`, LTR). Ensure directional styling, icon mirroring (`.flip-dir`), and tabular figures (`tnum`) are preserved.

---

## 4. Data Integrity and Privacy Rules

* **Zero Server-Side Storage:** Never introduce a backend server, cloud database, remote telemetry, or user tracking without explicit, prior user approval.
* **No Remote Transmission of User Data:** Never send user resume files, parsed resume text, academic records, contact info, or profile data to external APIs or cloud services.
* **Strict Consent Gating:** Writing to `localStorage` must remain blocked until the user explicitly agrees via the consent dialog (`state.consent === true`).
* **Document Ephemerality:** Resume files (PDF/DOCX) must be processed entirely in client memory; the file object reference must be discarded immediately after text extraction (`el.value = ""`).
* **Enforce Data Integrity Standards:** Retain the dual-status model defined in `DATA_SOURCES.md`:
  * Records with `status: "placeholder"` must only display their name and the `"Demo data"` badge. Never expose unverified URLs, pricing, prerequisites, or dates.
  * Only records with `status: "verified"` (verified within 90 days from official sources) may display descriptions, official links, and application details.

---

## 5. AI & Decision-Making Rules

* **No Faux-AI Misrepresentation:** Do **NOT** describe the in-browser deterministic rule engines (`aiTip()`, `swot()`, `matchScore()`) as a Large Language Model (LLM) or "generative AI". Accurately describe them as rule-based recommendations.
* **Approval Required for External AI:** Any future integration with external LLMs, AI models, or third-party inference APIs requires explicit user approval.
* **Preserve Scoring Formulas:** Never silently alter the weights, thresholds, or formulas for `matchScore` (60% skills, 25% field, 15% interests), `gapOf`, `cvScore`, `liScore`, or `readiness`. Any formula adjustment must be explicitly proposed and approved.

---

## 6. Agent Change Workflow

For every engineering task, agents must adhere to the following 8-step lifecycle:

```
1. UNDERSTAND ──> 2. INSPECT ──> 3. PLAN ──> 4. ASK FOR APPROVAL
                                                    │
                                                    ▼
8. REPORT   <── 7. REVIEW  <── 6. TEST <── 5. IMPLEMENT
```

* **Step 1: Understand:** Read the user request carefully. Clarify any ambiguities before making assumptions.
* **Step 2: Inspect:** Examine existing code, related data structures, and documentation.
* **Step 3: Plan:** Formulate a minimal, step-by-step implementation plan.
* **Step 4: Ask for Approval:** Present architectural decisions and plans to the user. **Wait for user approval before modifying files.**
* **Step 5: Implement:** Apply the smallest possible, targeted edits that fulfill the requirements.
* **Step 6: Test:** Verify functionality across applicable flows, languages, and viewports.
* **Step 7: Review:** Check diffs for regressions, leftover debug code, or accidental formatting shifts.
* **Step 8: Report:** Clearly describe what changed, what was verified, and how to test it.

---

## 7. Pre-Implementation Requirements

Before modifying any file, the agent must identify and document:
1. **Affected Files:** Exact file paths targeted for changes.
2. **Affected Components / Functions:** Specific functions, views, or data constants modified.
3. **Dependencies:** Any cross-component dependencies or event bindings affected.
4. **Potential Regressions:** Risks to existing state, layout, localization, or user flow.
5. **Testing & Verification Strategy:** Concrete steps to validate the change post-implementation.

---

## 8. Implementation Rules

* **Minimal Intervention:** Implement only what is required to satisfy the user's objective.
* **No Unrelated Refactoring:** Avoid touching lines, comments, or formatting outside the immediate scope of the task ("no drive-by cleanups").
* **Preserve UX & UI Consistency:** Maintain existing typography tokens, color palette, animations, and micro-interactions.
* **Defensive Coding:** Maintain error fallbacks (e.g., graceful fallbacks if CDN libraries fail to load or text cannot be extracted).

---

## 9. Verification & Post-Implementation Rules

After any code change, the agent must:
1. **Verify Core Flow:** Walk through the affected user journey to ensure expected behavior.
2. **Verify Localization:** Check that text renders properly in both Arabic (RTL) and English (LTR) without missing translation keys or broken layouts.
3. **Verify Responsiveness:** Check mobile layout (360px–768px) and desktop layout (1024px+) if UI elements were touched.
4. **Check Console / Runtime Errors:** Ensure no uncaught syntax or runtime exceptions are introduced.
5. **Detailed Reporting:** Report precisely what was modified and the exact manual/automated verification steps performed.

---

## 10. Git & Workspace Discipline

* **Atomic Commits:** Keep change sets small, focused, and cohesive.
* **Clear Commit Messages:** Write descriptive commit messages summarizing the "why" and "what".
* **No Destructive Operations:** Never overwrite, delete, or discard existing files or git history without explicit user confirmation.
* **Maintain Clean Workspace:** Do not leave temporary test artifacts, scratch files, or duplicate files in the repository.

---

## 11. Agent Behavioral Directives

* **Ask Clarifying Questions:** When a request has multiple valid interpretations or lacks clear constraints, ask the user rather than guessing.
* **Never Hallucinate Requirements:** Do not invent user requirements, personas, or dependencies that are not stated.
* **Honor the Working MVP:** Remember that the MVP already solves the core problem for Saudi graduates; our role is disciplined agentic engineering to support, stabilize, and thoughtfully evolve it.

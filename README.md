# Brain Math Quiz — Math for Every Mind

> **Live: https://neural-port.github.io/project-brain-math-quiz/**

An arcade-style mathematics and visual reasoning practice platform for **school learners, curious adults, and AI/ML engineers** — built as a fully AI-assisted coding showcase (prompt-driven development, zero hand-written code).

> Thousands of unique questions powered by a **procedural question generator** (unlimited math problems + generated visual puzzles) plus a **curated AI/ML concept bank** (50 questions, loaded locally). Includes interactive SVG-based visual questions, a self-playing practice mode, persistent player identity, session resume, and 55 unit tests verifying generator correctness.

Built with **React 19 + Vite + TypeScript + Vitest**. No backend, no external runtime API dependencies, no analytics, no data transmission.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Question Types](#question-types)
4. [Practice Mode](#practice-mode)
5. [Player Identity & Session Resume](#player-identity--session-resume)
6. [Run Locally](#run-locally)
7. [Test Suite](#test-suite)
8. [Deploy to GitHub Pages](#deploy-to-github-pages)
9. [Security & Compliance Audit](#security--compliance-audit)
10. [Known Limitations](#known-limitations)
11. [Tech Stack](#tech-stack)
12. [Why this project is in my portfolio?](#why-this-project-is-in-my-portfolio)
13. [License](#license)

---

## Features

### Learning paths

Four learning paths cover the full audience spectrum — from young learners to AI/ML engineers:

| Path | Audience | Default level | Categories |
|---|---|---|---|
| **Foundation** | Kids, beginners | Easy | Arithmetic, Geometry, Visual Reasoning, Memory, Fractions |
| **School Math** | School students | Easy | Arithmetic, Algebra, Geometry, Visual Reasoning, Patterns, Fractions, Probability, Statistics |
| **Everyday Logic** | Curious adults | Medium | Arithmetic, Geometry, Visual Reasoning, Memory, Patterns, Fractions, Probability, Statistics |
| **AI/ML Math** | Engineers, researchers | Medium | Algebra, Patterns, Matrices & Vectors, Derivatives, Probability, Statistics, AI/ML Concepts |

Each path pre-selects relevant categories; the user can toggle any topic on the start screen.

### Interactive visual questions

All visual questions render as **inline SVG** — no image assets, sharp at any resolution, touch-friendly and keyboard-accessible.

- **Tap the shape** — pick the correct shape from a visual grid (10 shapes, multiple question variants: identify, odd-one-out, sides counting, most-sides, symmetry)
- **Mirror image** — choose the correct horizontal or vertical mirror of a figure
- **Shape counting** — count triangles, squares, stars, and more in a generated scene
- **Drag-and-rotate** — rotate a shape on a dial to match a target outline (pointer drag, ±15° buttons, arrow keys)
- **Memory dots** — scattered dots light up in a sequence; tap them back in order (Simon-style, scales from 3 to 7 dots)
- **Fractions** — visual shaded bar; identify what fraction is shaded

### Text math questions

- **Arithmetic** — add, subtract, multiply, divide, mixed operations, order of operations
- **Algebra** — solve for x, evaluate expressions, simplify
- **Number Patterns** — arithmetic, geometric, squares, alternating, Fibonacci-style, interleaved sequences
- **Matrices & Vectors** — dot products, determinants, traces, vector magnitudes
- **Derivatives** — polynomial, trigonometric, exponential, chain rule
- **Probability** — dice, coins, marbles, cards, combinations
- **Statistics** — mean, median, mode, range
- **AI/ML Concepts** — 50 curated questions on gradient descent, loss functions, activation derivatives, Bayes' theorem, PCA, SVD, attention, KL divergence, Adam optimizer

### Game mechanics

- **3 challenge levels**: Easy (45s, 5 lives), Medium (30s, 4 lives), Hard (20s, 3 lives)
- **Arcade scoring**: base points by difficulty + streak bonus (50/answer) + time bonus (30 for fast answers)
- **Countdown timer** with visual bar
- **Lives system** — wrong answers cost a life; out of lives ends the quiz
- **Repeat protection** — question history tracked in `localStorage` (capped at 2000 entries); generators avoid seen questions across sessions, with category strikeout when a pool is exhausted
- **Results screen** — grade (S/A/B/C/D/F), accuracy, per-category breakdown, full question review with explanations

### Platform features

- **Player name** — stored on-device, greeted on every visit, removable via "Not you?"
- **Session resume** — progress auto-saves on every question; start screen offers "Resume where you left off" or a fresh start
- **Practice mode** — self-playing demo round covering every question type (see [Practice Mode](#practice-mode))
- **Quit button** — save and exit mid-quiz from any question
- **Fully responsive** — touch-first on phones, keyboard-accessible on desktop, three breakpoints (tablet, phone, small phone) plus landscape-phone layout
- **Footer** — "Developed by: NeuralWeb Solutions, Goa — 2026" with *Fully AI-Assisted Work* tagline on every screen

---

## Architecture

### Question delivery (hybrid approach)

The app uses a **hybrid question system** to guarantee variety:

1. **Procedural generators** (`src/quiz/generator.ts` + `src/quiz/visual-generator.ts`) — generate text math questions and visual puzzles algorithmically at runtime. Each call produces a fresh question with randomized parameters, computed correct answers, and plausible distractors. Category strikeout drops exhausted pools mid-session instead of forcing repeats.

2. **Curated AI/ML bank** (`public/ai-ml-questions.json`) — 50 hand-authored questions on AI/ML mathematical concepts that can't be procedurally generated. Loaded locally at runtime; ready to be served from any CDN by swapping the URL in `src/quiz/cdn.ts`.

3. **Seen-history** (`src/quiz/seen-history.ts`) — every question's dedupe key is stored in `localStorage` (capped at 2000 entries with FIFO eviction). Generators avoid repeating questions you've already seen, and fall back gracefully when a pool is exhausted.

### Project structure

```
src/
├─ quiz/
│  ├─ types.ts             # Domain types (Question, VisualQuestion, QuizState, QuizConfig, ...)
│  ├─ categories.ts        # Learning paths, category/difficulty metadata, generator registry
│  ├─ generator.ts         # Procedural math question generator (text categories + patterns)
│  ├─ visual-generator.ts  # Procedural visual puzzle generator (shape/mirror/count/rotate/memory/fraction)
│  ├─ cdn.ts               # Local curated bank loader
│  ├─ seen-history.ts      # localStorage-backed repeat protection (capped at 2000)
│  ├─ session.ts           # Versioned session save/load + player name persistence
├─ hooks/
│  └─ useQuiz.ts           # Quiz state: timer, lives, streaks, scoring, flow, session persistence
├─ components/
│  ├─ ErrorBoundary.tsx    # Last-resort render crash recovery with data-clear option
│  ├─ NamePrompt.tsx       # First-visit name collection with privacy notice
│  ├─ StartScreen.tsx      # Learning path + difficulty + topics + resume + practice
│  ├─ QuestionCard.tsx     # Question display + answer options + feedback + practice demo
│  ├─ VisualQuestionPanel.tsx # Visual question rendering dispatcher
│  ├─ ShapeGraphic.tsx     # SVG shape renderer (10 shapes, rotation, mirror, tones)
│  ├─ RotationChallenge.tsx # Drag/rotate dial interaction (+ practice auto-rotate)
│  ├─ MemoryDotsChallenge.tsx # Memory dots game (+ practice auto-tap)
│  ├─ ScoreBar.tsx         # Score, streak, progress, category tag
│  ├─ Timer.tsx            # Countdown bar
│  ├─ Lives.tsx            # Life indicators
│  └─ ResultsScreen.tsx    # Final grade, stats, category breakdown, review
├─ App.tsx                 # Phase routing (loading → name → start → playing → results)
├─ main.tsx                # Entry point with ErrorBoundary
└─ index.css               # All styling (palette + responsive + practice demo)
public/
├─ ai-ml-questions.json    # Curated AI/ML question bank (50 questions)
├─ favicon.svg
└─ icons.svg
```

---

## Question Types

### Text-based (multiple choice)

| Category | Generator | Unique pool | Notes |
|---|---|---|---|
| Arithmetic | Parameterized | ~2,000+ | Add/sub/mul/div, mixed, order of operations |
| Algebra | Parameterized | ~1,500+ | Solve for x, evaluate, simplify |
| Number Patterns | Parameterized | ~500+ | Arithmetic, geometric, squares, alternating, Fibonacci, interleaved |
| Matrices & Vectors | Parameterized | ~800+ | Dot products, determinants, traces, magnitudes |
| Derivatives | Parameterized | ~600+ | Polynomial, trig, exponential, chain rule |
| Probability | Parameterized | ~1,000+ | Dice, coins, marbles, cards, combinations |
| Statistics | Parameterized | ~700+ | Mean, median, mode, range |
| AI/ML Concepts | Curated bank | 50 fixed | Gradient descent, loss functions, PCA, SVD, attention, etc. |

### Visual (interactive SVG)

| Type | Unique pool | Interaction |
|---|---|---|
| Tap the shape | ~10 identify + ~90 odd-one-out + ~24 sides + ~20 most-sides + ~7 symmetry | Click correct shape card |
| Mirror image | ~24 variants | Click correct mirror card |
| Shape counting | ~49 (shape × count) | Count shapes in scene, pick number |
| Drag-and-rotate | ~24 variants | Drag dial / ±15° buttons / arrow keys |
| Memory dots | Effectively infinite (random layout + sequence) | Watch sequence, tap in order |
| Fractions | ~60 (shaded/total × orientation) | Read visual bar, pick fraction |

---

## Practice Mode

A **self-playing visual demo** so new users learn every interaction before the real quiz:

- **8 questions** covering every question type once
- **No lives lost** — wrong answers and timeouts cost nothing; the round can't end early
- **60 seconds per question** — generous time to observe
- **Automatic demonstrations**:
  - Text MCQ / shapes / mirror / counting / fractions → correct option **pulses with a green highlight** after ~1s, then auto-selects
  - Rotation dial → the shape **rotates itself** to the target outline and auto-submits
  - Memory dots → after the sequence plays, **the dots tap themselves in order** with numbers filling in
- **Caption** on each question explains what's happening: *"Watch — the correct answer is highlighted, then selected for you."*
- Practice questions **don't consume the seen-history pool** — the real quiz stays fresh
- Practice sessions **are never saved** to localStorage — they can't overwrite a real saved session

---

## Player Identity & Session Resume

### Player name

- First visit shows a name prompt with a **privacy notice**: *"Your name is stored only in this browser's local storage on your device. It is never sent anywhere and never leaves this app. You can remove it anytime using 'Not you?' on the start screen."*
- Name is greeted on the start screen ("Hi, {name}") and results screen ("{name}, quiz complete")
- "Not you?" link clears the name and re-prompts
- Persists until browser cache is cleared or the user removes it

### Session resume

- Progress **auto-saves on every question transition** (question index, score, lives, streak, answer history)
- Sessions are **version-stamped** (`version: 2`) — an incompatible session from an older build is rejected and cleared, never rendered
- Start screen shows: *"Resume previous session — Question 5 of 10 · 380 pts → [Resume]"*
- Start button reads "Start over (new session)" when a saved session exists
- Resuming restarts the **current question with a fresh timer** (no cheating the clock by pausing)
- Finishing a quiz or quitting clears the saved session
- Practice rounds are **never saved** and can't overwrite real progress

---

## Run Locally

```bash
npm install
npm run dev      # start dev server (http://localhost:5173)
npm run build    # type-check + production build to /dist
npm run preview  # preview the production build
npm run lint     # oxlint (0 errors expected)
```

Requires Node 18+ (developed on Node 22).

---

## Test Suite

The project includes **55 unit tests** (`src/quiz/generators.test.ts`) verifying that the AI-generated question generators produce correct, valid output. The tests run via Vitest and cover five layers:

### Structural invariants (32 tests)

Every generator × every difficulty level is tested for:
- Valid ID, prompt, explanation, and dedupe key
- 2-4 answer options with answerIndex in bounds
- No duplicate options
- Correct answer doesn't appear as a distractor
- Category, difficulty, and source match what was requested
- Visual questions have a non-null visual payload

### Answer correctness (5 tests)

The tests parse the question prompt, compute the expected answer independently, and verify the generator's answer matches:
- **Arithmetic**: parse "5 + 3" from the prompt, verify the answer is 8 (50 iterations across +, −, ×, ÷)
- **Statistics mean**: extract numbers, verify answer = sum ÷ count
- **Statistics range**: verify answer = max − min
- **Patterns**: verify arithmetic sequence next term = last + difference
- **Calculus**: parse "ax^n", verify derivative = a×n×x^(n−1)

### Visual payload integrity (5 tests)

- **Memory dots**: correct dot count per difficulty, valid sequence indices, no duplicate indices, dots within 0-100 bounds, non-overlapping with minimum distance check
- **Fractions**: shaded > 0, shaded < total, correct answer matches "shaded/total"

### Semantic correctness (6 tests)

These verify the *meaning* of the answer, not just the structure:
- **Mirror flip**: correct option's `mirrorX`/`mirrorY` must match the prompt wording ("left-to-right" vs "top-to-bottom"), and the correct answer must never be identical to the original figure
- **Mode uniqueness**: parses generated data, recomputes the mode, asserts exactly one unique mode exists
- **Probability distractor values**: parses every distractor as a fraction, asserts no distractor numerically equals the correct answer (catches "4/8" = "1/2" style collisions)
- **Tone leak checks**: asserts all odd-one-out and symmetry options share one tone (no color giveaway), and the arrow never appears as a "not symmetrical" distractor (it is symmetric)

### Dedupe key uniqueness (2 tests)

- 100 arithmetic calls → at least 80 unique dedupe keys
- 50 memory dots calls → all 50 unique

### Batch generation (3 tests)

- `generateQuestions` produces the requested count
- Every question in a batch is structurally valid
- No duplicate dedupe keys within a single batch

### Bugs found by the test suite

The tests caught **eight real bugs** in the generators that manual playtesting missed — two structural, six correctness-critical (wrong or ambiguous answers):

1. **TB-01: Duplicate option labels in visual choice questions** — the odd-one-out, symmetry, and most-sides generators used shape names as option text, producing duplicates like `["Arrow", "Circle", "Circle", "Circle"]`. Fixed with numbered labels since the shape is shown in the card.

2. **TB-02: Duplicate distractors in fraction questions** — when `shaded + 1 === total − shaded` (e.g., 2/3 appeared twice). Fixed with proper dedup + padding fallback.

3. **TB-03: Ambiguous mirror-image wording + impossible flips** — "horizontal mirror" was ambiguous, and the arrow's horizontal symmetry meant a top-bottom flip produced a correct answer *identical to the original*. Fixed with "flipped left-to-right / top-to-bottom" wording and restricting mirror questions to fully-asymmetric shapes (flag, l-shape, scalene-triangle).

4. **TB-04: Symmetric shape used as asymmetric distractor** — the arrow IS symmetric about its long axis, so "which shape is symmetrical?" could have two correct answers. Fixed by moving arrow to the symmetric pool and adding a new scalene-triangle shape for the asymmetric pool.

5. **TB-05: Color leaked the answer** — in odd-one-out and symmetry questions, the correct shape was always green and distractors always cream — answerable by color, not shape. Fixed: all options share one random tone.

6. **TB-06: Ambiguous statistics mode** — non-mode values could duplicate each other, producing two modes (e.g., `[3,3,5,5]`). Fixed by ensuring all non-mode values are distinct.

7. **TB-07: Rounded mean displayed as exact answer** — mean of 19 ÷ 4 = 4.75 was shown as "4.8". Fixed by regenerating until the mean is an exact integer.

8. **TB-08: Probability distractor equals correct answer in value** — "4/52" = "1/13" (same value, different form); marbles showed the unreduced "4/8" when correct was "1/2". Fixed by reducing all distractors via gcd and filtering by numeric value inequality.

### Running the tests

```bash
npm test          # run all 55 tests
npm run test:watch # watch mode
```

---

## Deploy to GitHub Pages

This repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys automatically on every push to `main`.

**CI pipeline gates:**
1. `npm ci` — clean install
2. `npm audit --audit-level=high` — dependency vulnerability gate
3. `npm run lint` — code quality gate
4. `npm test` — unit test gate (55 tests)
5. `npm run build` — type-check + production build
6. Upload artifact → deploy to GitHub Pages

**One-time setup:**
1. Create a new repository on GitHub and push this code to `main`.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` — the workflow builds and publishes to:
   `https://<your-username>.github.io/<your-repo-name>/`

The Vite `base` is set to `'./'` so asset paths stay relative and work under any repo name.

---

## Security & Compliance Audit

A full professional audit was conducted covering bug hunting, resource leaks, ISO 27001 security controls, ISO 5054 software quality, ISO 42001 AI governance, and the IT Act 2000 (India). Findings and remediations below.

### Critical findings (remediated)

#### F-01: Practice round overwrites real saved session [ISO 5054 Reliability]

**Finding:** The session-save effect wrote to `localStorage` whenever `phase === 'playing'` with no practice-mode guard. If a user had a real quiz in progress (saved at Q5) and took a practice round, the practice session silently overwrote their real progress. "Resume" would then restore the practice round instead of the real quiz.

**Fix:** The session-save effect now skips practice mode entirely (`s.config.practice` check). `loadSession()` also defensively rejects any session with a practice flag. Practice rounds can never touch the real session store.

#### F-02: No error boundary + weak session validation [ISO 5054 Availability]

**Finding:** `loadSession()` cast `as SavedSession` after only shallow checks. The visual-question schema changed multiple times during development — a session saved by an older build would render and crash on an unknown `visual.kind`, white-screening the app with no recovery path.

**Fix:** Added an `ErrorBoundary` component wrapping the entire app. Any render crash now shows a recovery screen with "Clear saved data and reload" (wipes `quiz-session`, `quiz-seen-prompts`, `quiz-player-name`) instead of a white screen. Additionally, `loadSession()` now performs deep structural validation of every question record and rejects sessions with malformed data.

#### F-03: Timeout deducts lives in practice mode [Correctness]

**Finding:** `handleTimeout` decremented lives unconditionally — contradicting the "Practice — no lives lost" promise shown in the HUD. A practice user could theoretically run out of lives via timeouts.

**Fix:** `handleTimeout` now checks `s.config.practice` and preserves lives in practice mode.

### High findings (remediated)

#### F-04: Player name (PII) stored with no notice at collection [ISO 27001 A.8.3 / IT Act SPDI Rules 2011]

**Finding:** The player's name was written to `localStorage` silently at collection time. While the data is local-only (low risk), the IT Act's SPDI Rules require a notice at collection disclosing storage location, retention, and withdrawal pathway.

**Fix:** The name prompt now displays a privacy notice: *"Your name is stored only in this browser's local storage on your device. It is never sent anywhere and never leaves this app. You can remove it anytime using 'Not you?' on the start screen."* The withdrawal path ("Not you?") was already present.

#### F-05: No schema versioning on saved sessions [ISO 5054]

**Finding:** Saved sessions had no version field. Any schema change (which happened multiple times during development) would make old sessions incompatible with no way to detect or reject them — the root enabler of F-02.

**Fix:** Sessions are now version-stamped (`version: 2`). `loadSession()` rejects unknown versions and auto-clears them. Future schema changes bump the version; old sessions are safely discarded rather than crashing the app.

### Medium findings (remediated)

#### F-07: CI has no dependency vulnerability gate [ISO 27001 A.8.8]

**Finding:** The deploy workflow ran `npm ci` and `npm run build` but no `npm audit` step. Vulnerable dependencies could ship to production undetected.

**Fix:** CI now runs `npm audit --audit-level=high` and `npm run lint` as build gates before the build step. A high-severity vulnerability blocks deployment.

#### F-09: Stale HTML metadata [Quality]

**Finding:** `index.html` title and description still referenced "AI/ML Math Quiz" — the old product name before the pivot to "Math for Every Mind."

**Fix:** Updated title to "Math for Every Mind — Practice & Quiz" and description to match the current product scope.

### Medium findings (recommendations — manual follow-up)

#### F-06: GitHub Actions not SHA-pinned [ISO 27001 A.8.30]

**Finding:** The deploy workflow uses mutable action tags (`actions/checkout@v4`, `actions/setup-node@v4`, etc.) rather than SHA-pinned commits. A compromised action release could inject malicious code into the CI pipeline.

**Recommendation:** Replace each `@v4` tag with the SHA of the action's release commit from its GitHub releases page. This is a 10-minute manual task — the SHAs must be verified by the repo owner, not generated by an AI.

#### F-08: Google Fonts loaded externally [Privacy observation]

**Finding:** Roboto is loaded from `fonts.googleapis.com`, which leaks visitor IP and User-Agent to a third party. Font fallbacks exist in the CSS, so this is cosmetic, not functional.

**Recommendation:** Self-host the Roboto woff2 files in `/public` and drop the Google Fonts `<link>` tags from `index.html` if zero external requests are desired.

### Low findings / observations (accepted)

#### F-10: Multi-tab session race

Multiple tabs writing to the same `localStorage` session key use last-write-wins semantics. Opening a second tab and playing could overwrite the first tab's progress. **Accepted limitation** — documented here. Fix would require `BroadcastChannel` coordination, not justified for this use case.

#### F-11: Memory dots not playable by screen-reader users

The memory-dots game is inherently visual — there is no non-visual way to represent "tap the dots in the order they lit up." Practice demo mode and the post-answer reveal mitigate this for sighted users. **Accepted limitation** — screen-reader users will skip this question type via timeout.

#### F-12: SeenHistory.has() is a linear scan

`SeenHistory.has(prompt)` performs a linear scan of up to 2000 entries inside the generation loop (up to 200 checks per session). Performance is fine in practice (sub-millisecond). **Note only** — a `Set`-backed lookup would be faster but the current implementation is adequate.

#### F-13: No focus move to "Next Question" after answering

After answering, the "Next Question" button appears but focus doesn't move to it. Keyboard users must tab to reach it. **Minor UX** — recommend `useEffect` to focus the next button when `answered` flips to true.

### Positive findings (verified)

- **No secrets or credentials in source** — confirmed by full inspection of all files
- **No `dangerouslySetInnerHTML`** — React escapes all user input; the player name is safe from XSS
- **No runtime LLM or external AI calls** — all questions come from deterministic generators + a static bank. Zero hallucination surface, full algorithmic traceability (ISO 42001 aligned)
- **No user data leaves the device** — no analytics, no network writes, no telemetry. Privacy by design
- **All `localStorage` access wrapped in try/catch** — storage failure never breaks the game; graceful degradation everywhere
- **CI permissions properly scoped** — `contents: read`, `pages: write`, `id-token: write` (least privilege)
- **Footer discloses AI-assisted work** — transparency practice aligned with ISO 42001 AI governance
- **Strict TypeScript** — no `any`, no `// @ts-ignore`, builds clean with `tsc -b`
- **Immutable state updates** — the quiz state hook never mutates input state
- **Defense in depth on session persistence** — guard at write (practice skip), validation at read (version + structure), boundary at render (ErrorBoundary)

### Final audit findings (remediated)

A second full audit was conducted after all features and tests were complete.

#### FA-01: Incomplete session field validation [ISO 5054 Reliability]

**Finding:** `loadSession()` validated `questions`, `currentIndex`, and `lives` but not `score`, `maxLives`, `streak`, `bestStreak`, `history`, or `config`. A corrupted localStorage value with missing/NaN fields could crash `ResultsScreen` or `resumeQuiz`.

**Fix:** Added full-field validation — all numeric fields type-checked, `history` checked as array, `config.difficulty` checked as string. Invalid sessions are rejected.

#### FA-02: Unguarded JSON parse in CDN loader [ISO 5054 Reliability]

**Finding:** `loadCuratedBank()` cast `res.json()` as `CuratedBank` and accessed `bank.questions` without guarding `bank` itself — a `null` JSON response would throw.

**Fix:** Added `bank &&` guard before property access.

### Bugs found by the test suite

The test suite caught **eight real bugs** that manual playtesting missed. TB-01 and TB-02 are structural; TB-03 through TB-08 are correctness-critical (the marked "correct" answer was wrong or ambiguous).

#### TB-01: Duplicate option labels in visual choice questions [Correctness]

**Finding:** The odd-one-out, symmetry, and most-sides generators used shape names as option text. When 3 of 4 shapes were the same (odd-one-out), options were `["Arrow", "Circle", "Circle", "Circle"]` — 3 duplicate strings. The `assertUniqueOptions` test caught this.

**Fix:** Switched to numbered labels ("Option 1", "Option 2"...) for visual choice questions where the shape is shown in the card, not the text label.

#### TB-02: Duplicate distractors in fraction questions [Correctness]

**Finding:** The fraction generator's distractor list could produce duplicates when `shaded + 1 === total − shaded` (e.g., `2/3` appeared twice). The `.filter` only removed the correct answer, not duplicate distractors.

**Fix:** Replaced with a `Set`-based dedup loop that checks against both the correct answer and existing distractors, with a padding fallback for edge cases.

#### TB-03: Ambiguous mirror wording + impossible flips [Correctness]

**Finding:** "Which option is the horizontal mirror image?" was ambiguous — "horizontal mirror" conventionally means a horizontal mirror line (top-to-bottom flip), but the code mapped it to `scaleX(-1)` (left-to-right flip). Worse: the arrow is symmetric about its horizontal axis, so a top-bottom flip produced a correct answer **visually identical to the original** — the question was unsolvable.

**Fix:** Reworded to unambiguous flip directions ("flipped left-to-right" / "flipped top-to-bottom") and restricted mirror questions to shapes asymmetric on both axes (flag, l-shape, scalene-triangle).

#### TB-04: Symmetric shape used as "not symmetrical" distractor [Correctness]

**Finding:** The symmetry generator's distractor pool included the arrow — but the arrow IS symmetric about its long axis. "Which shape is symmetrical?" could have two correct answers.

**Fix:** Moved arrow to the symmetric pool (it is, in fact, a valid symmetric answer) and added a new `scalene-triangle` SVG shape so the asymmetric pool still has 3 distractors.

#### TB-05: Color leaked the answer [Correctness]

**Finding:** In odd-one-out and symmetry questions, the correct shape was always `tone: 'green'` and distractors always `tone: 'cream'`. The answer could be determined by color without recognizing any shape property.

**Fix:** All options in a question now share one randomly chosen tone.

#### TB-06: Ambiguous statistics mode [Correctness]

**Finding:** The mode generator produced `[val, val, ...others]` where `others` were only prevented from equaling `val` — they could duplicate each other, producing two modes (e.g., `[3,3,5,5]` → both 3 and 5 are modes).

**Fix:** Non-mode values are now generated as a `Set` of distinct integers ≠ val, guaranteeing exactly one unique mode.

#### TB-07: Rounded mean displayed as exact answer [Correctness]

**Finding:** Non-integer means were displayed via `toFixed(1)` — mean of 19 ÷ 4 = **4.75** was shown as **"4.8"**, marking a mathematically wrong value as correct.

**Fix:** Mean questions now regenerate the dataset until `sum % n === 0`, guaranteeing an exact integer answer.

#### TB-08: Probability distractor numerically equals correct answer [Correctness]

**Finding:** The marbles generator listed the unreduced `${red}/${total}` as a distractor — when the correct answer was "1/2", the distractor "4/8" is the same probability. The card generator listed "4/52" which equals the correct "1/13". String-dedup can't catch these because the strings differ.

**Fix:** All probability distractors are reduced via gcd, then filtered by numeric value inequality (`a/b === correct` by cross-multiplication), not just string comparison.

### Audit verdict

**PASS.** All three quality gates green (lint, build, tests). Zero critical or high findings remaining. The original audit found 7 issues (F-01 through F-09), all remediated or documented. A second final audit found 2 additional medium findings (FA-01: incomplete session field validation, FA-02: unguarded JSON parse in CDN loader), both fixed. The test suite found **8 real generator bugs** (TB-01 through TB-08 — duplicate options, ambiguous answers, color leaks, and mathematically wrong "correct" answers), all fixed. Remaining conditions are the manual follow-ups (F-06 SHA-pinning, F-08 font self-hosting) which require repo-owner action.

---

## Known Limitations

1. **Multi-tab usage** — two tabs on the same origin share `localStorage`; last-write-wins on the session key. Use one tab at a time for predictable resume behavior.
2. **Memory dots** — inherently visual; not playable non-visually by screen-reader users. The question is skipped via timeout with no lives lost in practice mode.
3. **Browser storage per origin** — `localhost:5173` and `127.0.0.1:50868` are different origins; they keep separate player names and saved sessions. Always test on the same URL.
4. **Curated AI/ML bank is fixed at 50 questions** — these are hand-authored and can't be procedurally generated. After ~15 rounds on the AI/ML path, repeats from this pool are expected (seen-history prevents immediate repeats).

---

## Tech Stack

- **React 19** — UI framework
- **Vite 8** — build tool and dev server
- **TypeScript 6** — strict typing, no `any`
- **Vitest 5** — unit testing (55 tests, all passing)
- **oxlint** — fast linter (0 errors, 0 warnings)
- **GitHub Actions** — CI/CD with audit + lint + test + build gates
- **Inline SVG** — all visual questions rendered as vector graphics, no image assets

---

## Why this project?

This repo demonstrates **prompt-driven, AI-assisted development**: the entire app — generators, visual puzzle engine, memory game, practice demo mode, session persistence, error boundary, UI, styling, CI, and this audit — was produced through natural-language prompts with no hand-written code. It's engineered to a production standard:

- **Procedural generation** — parameterized question templates, computed correct answers, plausible distractors, dedup tracking, and category strikeout
- **SVG visual engine** — 10 shapes, mirrors, rotation interactions, memory dots, and fraction bars rendered inline, sharp at any resolution
- **Self-playing practice mode** — every interaction type auto-demonstrated so users learn by watching
- **Session persistence** — version-stamped, practice-guarded, structurally validated, with error boundary recovery
- **Repeat protection** — persistent seen-history across sessions with FIFO eviction
- **Pure, testable logic** — generators and quiz engine are isolated from React
- **Strict TypeScript** — no `any`, no `// @ts-ignore`, builds clean with `tsc -b`
- **Immutable state updates** — the quiz state hook never mutates input state
- **Security audited** — full ISO 27001 / 5054 / 42001 / IT Act audit with remediations applied

---

## License

MIT — free to use, learn from, and build on.

## Why this project is in my portfolio?

This project isn't a tutorial app or a CRUD scaffold. It's a **deliberate engineering showcase** — every feature was chosen to demonstrate a specific skill that matters in production software. Here's what it proves and why a reviewer should care.

### 1. Prompt-driven development at production standard

The entire codebase — generators, visual engine, game logic, session persistence, error boundary, CI, audit, and this README — was produced through natural-language prompts with **zero hand-written code**. That demonstrates:

- **System architecture thinking** — I can describe a system precisely enough that an AI produces correct, production-grade code. That's the core skill for working with AI coding tools at scale.
- **Quality gatekeeping** — I didn't accept whatever the AI produced. The audit found real bugs (session overwrite, timeout in practice, missing error boundary) and I drove the fixes. The AI is the typist; I'm the architect and QA.
- **Iterative refinement** — the project pivoted mid-flight from a simple AI/ML quiz to a full brain-training platform with visual puzzles, memory games, and a self-playing practice mode. That's real product evolution under prompt control.

### 2. Algorithmic thinking, not framework plumbing

Most portfolio apps demonstrate that you can wire together existing libraries. This one demonstrates that you can **design algorithms**:

- **Procedural question generation** — parameterized templates with computed correct answers, plausible distractor generation, and dedup tracking across 11 categories. Each generator is a small algorithm with edge cases (negative answers, division by zero, distractor collisions).
- **Visual puzzle generation** — non-overlapping dot scatter via rejection sampling with grid fallback; sequence generation with difficulty scaling; fraction bar rendering with vertical/horizontal orientation.
- **Repeat protection** — a capped FIFO history with category strikeout when pools exhaust, falling back gracefully instead of stalling.
- **Self-playing demo mode** — auto-highlighting correct answers, auto-rotating the dial to target with a 3-phase state machine (reset → rotate → submit), auto-tapping memory dots in sequence with stale-closure-aware incremental scheduling.
- **55 unit tests verifying the above** — the tests don't just check structure; they parse prompts, independently compute expected answers, verify distractor values differ numerically, and check that visual questions can't be answered by color alone. The tests found 8 real bugs that manual playtesting missed.

These are problems you solve with thinking, not with `npm install`.

### 3. Production-grade reliability engineering

- **Versioned session persistence** — schema versioning with reject-and-clear on mismatch, so a schema change never crashes a returning user's app.
- **Error boundary with recovery** — last-resort render crash recovery with a "clear saved data" path, so no bad localStorage record can trap a user.
- **Defense in depth** — guard at write (practice skip), validation at read (version + structure), boundary at render (ErrorBoundary). Three layers protecting one invariant.
- **Graceful degradation** — every `localStorage` access is wrapped in try/catch. Storage full or disabled? The app still works, just without persistence.

### 4. Security and compliance awareness

The audit section in this README is the portfolio piece. It shows I can:

- **Think like an auditor** — identify findings by severity (critical/high/medium/low), map them to frameworks (ISO 27001, ISO 5054, ISO 42001, IT Act 2000), and write remediations.
- **Care about PII** — even for a local-only app, I added a privacy notice at collection time and a withdrawal pathway, aligning with IT Act SPDI Rules.
- **Hunt supply-chain risk** — flagged mutable GitHub Actions tags and added an `npm audit` CI gate.
- **Know what "no external data transmission" is worth** — zero analytics, zero telemetry, zero network writes. Privacy by design is a feature, not an afterthought.

### 5. Full-stack product ownership

This isn't a frontend exercise. It's a **complete product**:

- **Product design** — four learning paths covering kids to AI/ML engineers, six interaction types, difficulty scaling, arcade scoring.
- **UX engineering** — self-playing practice mode so users learn by watching, not reading instructions. Resume where you left off. Quit anytime. Responsive across phone/tablet/desktop.
- **DevOps** — CI pipeline with audit + lint + build gates, GitHub Pages deployment, relative asset paths for any repo name.
- **Documentation** — a 380-line README with architecture, question-type inventory, audit report, and known limitations. The kind of doc a reviewer can read in 10 minutes and understand the whole project.

### 6. What this project is NOT

Being honest about what this doesn't prove:

- **No backend** — there's no database, no auth, no server. If you're hiring for backend work, this shows algorithmic thinking but not backend skills. Pair it with a Supabase/Node project.
- **No real users at scale** — the repeat-protection and session logic are designed for single-device use. Multi-device sync would need a backend.
- **No integration/E2E tests** — the 55 unit tests cover the generators (pure functions), but there are no component or browser-level tests. For a portfolio showcase this is adequate; a production team would add Playwright/Cypress.

### The one-line pitch

> *"I can architect a production-grade interactive platform entirely through prompt-driven development, audit it against ISO standards, and ship it with CI gates — and the codebase proves it."*

---

*Developed by: NeuralWeb Solutions, Goa — 2026*
*Fully AI-Assisted Work*

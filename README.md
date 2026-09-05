# Brain Math Quiz — Math for Every Mind

> **Live: https://neural-port.github.io/project-brain-math-quiz/**

An arcade-style mathematics and reasoning practice platform for school learners, competitive exam aspirants, curious adults, and AI/ML engineers. Built as a fully AI-assisted coding showcase — prompt-driven development, zero hand-written code.

> Thousands of unique questions powered by a procedural question generator across 16 categories, plus curated AI/ML and figure classification banks (60 questions, loaded locally). Includes interactive SVG-based visual questions, guided practice mode, persistent player identity, session resume, internationalized currency scaling, and 210 automated tests verifying generator correctness.

Built with React 19 + Vite + TypeScript + Vitest. No backend, no external runtime API dependencies, no analytics, no data transmission.

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
9. [Quality Audit](#quality-audit)
10. [Known Limitations](#known-limitations)
11. [Tech Stack](#tech-stack)
12. [Why This Project Is in My Portfolio](#why-this-project-is-in-my-portfolio)
13. [License](#license)

---

## Features

### Learning paths

Five learning paths cover the full audience spectrum — from young learners to competitive exam aspirants to AI/ML engineers:

| Path | Audience | Default level | Categories |
|---|---|---|---|
| **Foundation** | Kids, beginners | Easy | Arithmetic, Geometry, Visual Reasoning, Memory, Fractions |
| **School Math** | School students | Easy | Arithmetic, Algebra, Geometry, Visual Reasoning, Patterns, Fractions, Probability, Statistics |
| **Everyday Logic** | Curious adults | Medium | Arithmetic, Geometry, Visual Reasoning, Memory, Patterns, Fractions, Probability, Statistics |
| **Competitive Exams** | Aspirants | Hard | Competitive Math, Number Series, Letter Coding, Logical Reasoning, Arithmetic, Algebra, Probability |
| **AI/ML Math** | Engineers, researchers | Medium | Algebra, Patterns, Matrices & Vectors, Derivatives, Probability, Statistics, AI/ML Concepts |

Each path pre-selects relevant categories; the user can toggle any topic on the start screen.

### Interactive visual questions

All visual questions render as inline SVG — no image assets, sharp at any resolution, touch-friendly and keyboard-accessible.

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
- **Competitive Math** — work and time, speed-distance-time, trains, boats, percentages, profit and loss, discount, simple and compound interest, averages, ratios, mixtures, partnerships, ages, LCM/HCF, area and perimeter, BODMAS
- **Number Series** — primes, geometric, squares, cubes, triangular, Fibonacci, alternating, mixed operations, wrong-number identification
- **Letter Coding** — forward/backward shift, reverse, letter-number coding, mixed coding, direct coding, number coding, symbol substitution
- **Logical Reasoning** — blood relations, direction sense, seating arrangements, rankings, calendars, clock angles, syllogisms, statement-conclusion evaluation, missing number grids
- **AI/ML Concepts** — 50 curated questions on gradient descent, loss functions, activation derivatives, Bayes' theorem, PCA, SVD, attention, KL divergence, Adam optimizer

### Game mechanics

- **3 challenge levels**: Easy (45s, 5 lives), Medium (30s, 4 lives), Hard (20s, 3 lives)
- **Per-category timers** — calculation-heavy categories get extra time
- **Arcade scoring**: base points by difficulty + streak bonus (50/answer) + time bonus (30 for fast answers)
- **Countdown timer** with visual bar
- **Lives system** — wrong answers cost a life; out of lives ends the quiz
- **Repeat protection** — question history tracked in localStorage (capped at 2000 entries); generators avoid seen questions across sessions, with category strikeout when a pool is exhausted
- **Category balancing** — the scheduler distributes questions evenly across selected categories and limits sequence-family dominance so no single pattern type overwhelms a quiz
- **Results screen** — grade (S/A/B/C/D/F), accuracy, per-category breakdown, full question review with explanations

### Platform features

- **Player name** — stored on-device, greeted on every visit, removable via "Not you?"
- **Session resume** — progress auto-saves on every question; start screen offers "Resume where you left off" or a fresh start
- **Practice mode** — self-playing demo round covering every question type
- **Quit button** — save and exit mid-quiz from any question
- **Currency scaling** — monetary amounts in questions adapt to the user's region (India, US, Europe, UK, Japan, Malaysia, Singapore, Sri Lanka, UAE, South Africa, China, Germany, Indonesia, Italy)
- **Unicode superscript notation** — expressions like 3x⁴, 2ⁿ, (1.10)² rendered with proper raised notation instead of caret syntax
- **Fully responsive** — touch-first on phones, keyboard-accessible on desktop, three breakpoints plus landscape-phone layout
- **Footer** — "Developed by: Gauresh Chari — NeuralWeb Solutions, Goa © 2026" with "Built with AI" tagline on every screen

---

## Architecture

### Question delivery (hybrid approach)

The app uses a hybrid question system to guarantee variety:

1. **Procedural generators** (`src/quiz/generator.ts`, `src/quiz/competitive-generator.ts`, `src/quiz/series-generator.ts`, `src/quiz/coding-generator.ts`, `src/quiz/logic-generator.ts`, `src/quiz/visual-generator.ts`) — generate questions algorithmically at runtime. Each call produces a fresh question with randomized parameters, computed correct answers, plausible distractors, and step-by-step explanations. Category strikeout drops exhausted pools mid-session instead of forcing repeats.

2. **Curated AI/ML bank** (`public/ai-ml-questions.json`) — 50 hand-authored questions on AI/ML mathematical concepts that can't be procedurally generated. Loaded locally at runtime.
3. **Curated figure classification bank** (`public/figure-classification-questions.json`) — 10 hand-authored visual reasoning questions for figure classification and odd-one-out patterns. Loaded locally at runtime.

3. **Seen-history** (`src/quiz/seen-history.ts`) — every question's dedupe key is stored in localStorage (capped at 2000 entries with FIFO eviction). Generators avoid repeating questions you've already seen, and fall back gracefully when a pool is exhausted.

### Project structure

```
src/
├─ quiz/
│  ├─ types.ts                  # Domain types (Question, VisualQuestion, QuizState, QuizConfig, ...)
│  ├─ categories.ts             # Learning paths, category/difficulty metadata, generator registry
│  ├─ generator.ts              # Core math generator (arithmetic, algebra, patterns, stats, calculus, probability, linear algebra)
│  ├─ competitive-generator.ts  # Competitive exam generator (20 subtypes: work, speed, trains, percentages, profit/loss, etc.)
│  ├─ series-generator.ts       # Number series generator (12 subtypes: primes, geometric, Fibonacci, mixed, etc.)
│  ├─ coding-generator.ts       # Letter coding generator (7 subtypes: shift, reverse, mixed, number coding, etc.)
│  ├─ logic-generator.ts        # Logical reasoning generator (17 subtypes: blood relations, directions, syllogisms, etc.)
│  ├─ visual-generator.ts       # Visual puzzle generator (shape/mirror/count/rotate/memory/fraction/text-mirror/dot-region/composite-rotate)
│  ├─ cdn.ts                    # Local curated bank loader
│  ├─ seen-history.ts           # localStorage-backed repeat protection (capped at 2000)
│  ├─ session.ts                # Versioned session save/load + player name + currency persistence
├─ hooks/
│  └─ useQuiz.ts                # Quiz state: timer, lives, streaks, scoring, flow, session persistence, currency scaling
├─ components/
│  ├─ ErrorBoundary.tsx         # Last-resort render crash recovery with data-clear option
│  ├─ NamePrompt.tsx            # First-visit name collection with privacy notice
│  ├─ StartScreen.tsx           # Learning path + difficulty + topics + resume + practice + currency
│  ├─ QuestionCard.tsx          # Question display + answer options + feedback + practice demo
│  ├─ VisualQuestionPanel.tsx   # Visual question rendering dispatcher
│  ├─ ShapeGraphic.tsx          # SVG shape renderer (10 shapes, rotation, mirror, tones)
│  ├─ RotationChallenge.tsx     # Drag/rotate dial interaction (+ practice auto-rotate)
│  ├─ MemoryDotsChallenge.tsx   # Memory dots game (+ practice auto-tap)
│  ├─ ScoreBar.tsx              # Score, streak, progress, category tag
│  ├─ Timer.tsx                 # Countdown bar
│  ├─ Lives.tsx                 # Life indicators
│  └─ ResultsScreen.tsx         # Final grade, stats, category breakdown, review
├─ App.tsx                      # Phase routing (loading → name → start → playing → results)
├─ main.tsx                     # Entry point with ErrorBoundary
└─ index.css                    # All styling (palette + responsive + practice demo)
public/
├─ ai-ml-questions.json                  # Curated AI/ML question bank (50 questions)
├─ figure-classification-questions.json  # Curated figure classification bank (10 questions)
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
| Competitive Math | Parameterized | ~5,000+ | 20 subtypes: work, speed, trains, boats, percentages, profit/loss, discount, SI/CI, averages, ratios, mixtures, partnerships, ages, LCM/HCF, area, BODMAS |
| Number Series | Parameterized | ~2,000+ | 12 subtypes: primes, geometric, squares, cubes, triangular, Fibonacci, alternating, mixed, wrong-number |
| Letter Coding | Parameterized | ~1,000+ | 8 subtypes: forward/backward shift, reverse, mixed, letter-number, direct, number, symbol substitution |
| Logical Reasoning | Parameterized + bank | ~500+ | 18 subtypes: blood relations, directions, arrangements, rankings, calendars, clocks, syllogisms, statement-conclusion, missing number grids |
| AI/ML Concepts | Curated bank | 50 fixed | Gradient descent, loss functions, PCA, SVD, attention, etc. |

### Visual (interactive SVG)

| Type | Unique pool | Interaction |
|---|---|---|
| Tap the shape | ~150 variants | Click correct shape card |
| Mirror image | ~24 variants | Click correct mirror card |
| Shape counting | ~49 (shape × count) | Count shapes in scene, pick number |
| Drag-and-rotate | ~24 variants | Drag dial / ±15° buttons / arrow keys |
| Memory dots | Effectively infinite | Watch sequence, tap in order |
| Fractions | ~60 (shaded/total × orientation) | Read visual bar, pick fraction |

---

## Practice Mode

A self-playing visual demo so new users learn every interaction before the real quiz:

- **8 questions** covering every question type once
- **No lives lost** — wrong answers and timeouts cost nothing; the round can't end early
- **60 seconds per question** — generous time to observe
- **Automatic demonstrations**:
  - Text MCQ / shapes / mirror / counting / fractions → correct option pulses with a green highlight after ~1s, then auto-selects
  - Rotation dial → the shape rotates itself to the target outline and auto-submits
  - Memory dots → after the sequence plays, the dots tap themselves in order with numbers filling in
- **Caption** on each question explains what's happening
- Practice questions don't consume the seen-history pool — the real quiz stays fresh
- Practice sessions are never saved to localStorage — they can't overwrite a real saved session

---

## Player Identity & Session Resume

### Player name

- First visit shows a name prompt with a privacy notice: *"Your name is stored only in this browser's local storage on your device. It is never sent anywhere and never leaves this app. You can remove it anytime using 'Not you?' on the start screen."*
- Name is greeted on the start screen ("Hi, {name}") and results screen ("{name}, quiz complete")
- "Not you?" link clears the name and re-prompts
- Persists until browser cache is cleared or the user removes it

### Session resume

- Progress auto-saves on every question transition (question index, score, lives, streak, answer history)
- Sessions are version-stamped (`version: 3`) — an incompatible session from an older build is rejected and cleared, never rendered
- Start screen shows: *"Resume previous session — Question 5 of 10 · 380 pts → [Resume]"*
- Start button reads "Start over (new session)" when a saved session exists
- Resuming restarts the current question with a fresh timer (no cheating the clock by pausing)
- Finishing a quiz or quitting clears the saved session
- Practice rounds are never saved and can't overwrite real progress

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

The project includes **210 automated tests** across three test files, all running via Vitest.

### Permanent test suite — 140 tests (`src/quiz/generators.test.ts`)

**Structural invariants (33 tests)**

Every generator × every difficulty level is tested for:
- Valid ID, prompt, explanation, and dedupe key
- 2–4 answer options with answerIndex in bounds
- No duplicate options
- Correct answer doesn't appear as a distractor
- Category, difficulty, and source match what was requested
- Visual questions have a non-null visual payload

**Answer correctness (5 tests)**

Tests parse the question prompt, compute the expected answer independently, and verify the generator's answer matches:
- Arithmetic: parse "5 + 3" from the prompt, verify the answer is 8 (50 iterations across +, −, ×, ÷)
- Statistics mean: extract numbers, verify answer = sum ÷ count
- Statistics range: verify answer = max − min
- Patterns: verify arithmetic sequence next term = last + difference
- Calculus: parse "axⁿ", verify derivative = a×n×xⁿ⁻¹

**Visual payload integrity (5 tests)**

- Memory dots: correct dot count per difficulty, valid sequence indices, no duplicate indices, non-overlapping with minimum distance check
- Fractions: shaded > 0, shaded < total, correct answer matches "shaded/total"

**Semantic correctness (6 tests)**

- Mirror flip: correct option's mirrorX/mirrorY matches the prompt wording, and the correct answer is never identical to the original figure
- Mode uniqueness: parses generated data, recomputes the mode, asserts exactly one unique mode exists
- Probability distractor values: parses every distractor as a fraction, asserts no distractor numerically equals the correct answer
- Tone leak checks: asserts all odd-one-out and symmetry options share one tone (no color giveaway), and the arrow never appears as a "not symmetrical" distractor

**Dedupe key uniqueness (2 tests)**

- 100 arithmetic calls → at least 80 unique dedupe keys
- 50 memory dots calls → all 50 unique

**Batch generation (5 tests)**

- `generateQuestions` produces the requested count
- Every question in a batch is structurally valid
- No duplicate dedupe keys within a single batch
- Categories are balanced instead of relying on random selection
- Sequence-family questions are limited when mixed with other topics

**Competitive exam generators (13 tests)**

- Structural validity across all competitive-math, number-series, letter-coding, and logical-reasoning subtypes
- Numeric answers are valid numbers (no NaN, no undefined)
- Percentage answers are mathematically correct
- Arithmetic sequence answers are correct
- Shift-forward coding answers are correct
- Number coding is fully derivable from the stated rule
- Calendar answers are correct

**Regression tests (36 tests)**

Tests covering every bug found during the quality audit (see [Quality Audit](#quality-audit) below). Each test runs 300–500 randomized samples to catch edge-case collisions:
- Competitive math: distractor collision checks for all 16 subtypes, day-by-day simulation verification for alternating-days work problems, midpoint-ratio check for mixtures, negative-age prevention, NaN prevention for area questions
- Number series: distractor collision checks for primes, alternating, and multiply-add subtypes
- Letter coding: explanation shows actual shift amount (not hardcoded "A→B"), no negative or zero alphabet values in mixed coding
- Logical reasoning: gender-appropriate names for blood relations, shadow direction correctness, ordinal suffix validation (no "2th", "3th", "1th"), clock angle explanation includes >180° reduction, statement-conclusion reclassification verification
- Original generators: pattern subtraction explanation direction, probability coins no duplicate-value distractors, median explanation mentions two middle values for even count
- Visual generators: uniform tone verification (no color leaks), mirror rotation restricted to 0°/180°, fraction distractor collision prevention
- Session validation: NaN rejection in numeric fields, invalid difficulty rejection

### Audit test suite — 44 tests (`src/quiz/audit.test.ts`)

Exhaustive programmatic audit that generates 500 questions per category per difficulty and verifies:
- Structural validity (valid options, answerIndex, no duplicates, no NaN)
- Semantic correctness (parsed answers match independently computed expected values)
- Batch integrity (category spread, sequence-family limits, no duplicate dedupe keys)

### New generators audit suite — 26 tests (`src/quiz/new-generators-audit.test.ts`)

Dedicated audit for the 6 new question types added in the latest release:
- 500-sample stress tests per difficulty for symbol substitution, missing number grids, text mirror, dot region, and composite rotation
- Answer correctness verification (mapping consistency, geometric containment, pattern consistency)
- **Dot-region visual-clearance validator** — checks 4,500 randomized visual-reasoning generations across all difficulties and requires the entire rendered dot to remain at least 5 SVG units from every shape boundary
- **Composite-rotation visual-signature validator** — transforms every dot and line exactly as the SVG renderer does and rejects questions unless all four answer options are visibly distinct
- Figure classification curated bank validation (structure, unique dedupe keys, unique options)
- **Semantic partition validator** — parses every "Group by" option's criterion and partition, verifies exactly ONE option is mathematically valid and it sits at `answerIndex`. Prevents ambiguous classifications where multiple options describe correct groupings.
- **Odd-one-out discriminator validator** — verifies the non-answer figures share a common shape or tone that the answer figure lacks, with manual-verification whitelist for non-attribute rules (polygon classification, symmetry)
- **AI/ML curated bank validation** — structure, unique dedupe keys, unique options for all 50 questions

### Running the tests

```bash
npm test              # run all 210 tests
npm run test:watch    # watch mode
```

---

## Deploy to GitHub Pages

This repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys automatically on every push to `main`.

**CI pipeline gates:**
1. `npm ci` — clean install
2. `npm audit --audit-level=high` — dependency vulnerability gate
3. `npm run lint` — code quality gate
4. `npm test` — unit test gate (210 tests)
5. `npm run build` — type-check + production build
6. Upload artifact → deploy to GitHub Pages

**One-time setup:**
1. Create a new repository on GitHub and push this code to `main`.
2. In the repo: Settings → Pages → Build and deployment → Source: GitHub Actions.
3. Push to `main` — the workflow builds and publishes to `https://<your-username>.github.io/<your-repo-name>/`

The Vite `base` is set to `'./'` so asset paths stay relative and work under any repo name.

---

## Quality Audit

A full audit was conducted covering generator correctness, visual question integrity, session reliability, currency scaling, and security compliance. The audit was mapped against four frameworks: **ISO/IEC 27001** (information security), **ISO/IEC 5054** (software quality), **ISO/IEC 42001** (AI governance), and the **IT Act 2000** (India, including SPDI Rules 2011). The methodology: generate thousands of randomized samples, parse prompts, independently compute expected answers, verify distractors are unique and not equal to the correct answer, and check that visual questions cannot be solved from color alone.

### Bugs found and fixed

**Competitive math generator — 15 fixes:**

- Work and time: distractor `answer - 5` could equal `aDays` — replaced with safe distractors
- Alternating-days work: formula `Math.ceil(totalPairs * 2)` was mathematically wrong — replaced with day-by-day simulation
- Speed-distance-time: `answer - speed` could equal `speed × hours` — replaced
- Train crossing: distractors could duplicate after rounding — adjusted formulas
- Percentage: 50% case caused `value - answer == answer` — removed 50% from option pool
- Profit and loss: explanation interpolated the word "profit%" or "loss%" instead of the numeric percentage — fixed; distractor collision fixed
- Discount: 50% case caused discount amount to equal selling price — removed 50% from option pool
- Simple interest: `principal + answer` and `answer + principal` were identical distractors — replaced
- Average (missing value): `avg` could equal the missing answer — filtered out
- Ratio: `total - a × multiplier` always equals `b × multiplier` — replaced with non-colliding distractors
- Partnership: distractor could equal correct profit share at equal contributions — replaced
- Mixture and alligation: target was always the midpoint, making the ratio always 1:1 — now uses non-midpoint targets with divisible quantities
- Ages: `yearsAgo` could exceed current age (negative past ages); `Math.round` broke the stated ratio — now constructs from a divisible base
- LCM/HCF: distractors could equal the correct answer when inputs are related — filtered
- Area and perimeter: square with side 4 caused perimeter to equal area (source of the NaN bug); rectangle perimeter could equal area — replaced distractors, minimum side raised to 5
- BODMAS: `a×b + c×d` distractor equals answer when `c < d` (integer division yields 0) — replaced

**Number series generator — 3 fixes:**

- Primes: `primes[3] + 2` or `+ 4` could equal the next prime — replaced with larger offsets
- Alternating add/subtract: `first + addStep × 3` could equal the answer — replaced
- Alternating multiply/add: `seq[3] + adder` always equals the answer — replaced

**Letter coding generator — 3 fixes:**

- Forward/backward shift: explanation hardcoded "A→B" even when the actual shift was 2–5 — now shows the real shift amount
- Mixed coding: backward-shift distractor produced zero or negative alphabet values for words with early letters — replaced with positive-only distractors

**Logical reasoning generator — 7 fixes:**

- Blood relations: the name pool was all female names, but questions used names as grandfather, brother, father, uncle, husband, and son — added a male name pool with gender-appropriate assignment
- Direction shadow: south-facing cases mapped left/right incorrectly — simplified to a correct shadow-direction question
- Arrangement constraint variant 4: constraints didn't uniquely determine the rightmost person — added explicit positional constraint
- Ranking: ordinal suffix was always "th", producing invalid labels like "2th", "3th", "1th" — added a proper ordinal helper; distractor collision fixed
- Clock angle: explanation reported the raw angle difference as the final answer, omitting the >180° reduction step — now includes the reduction
- Statement-conclusion: three scenarios were classified as "probably follows" despite insufficient logical basis (correlation presented as causation, recovery rate without control group, CCTV evidence without due process) — reclassified to "does not follow"

**Core math generator — 3 fixes:**

- Patterns (subtraction): explanation showed `seq[1] − seq[0] = d` which is negative for decreasing sequences — now shows `seq[0] − seq[1] = d`
- Probability (coins): for n=2, distractors "1/2" and "2/4" are the same value — replaced with non-colliding distractors
- Statistics (median): explanation claimed a single middle position for even-sized datasets — now mentions "average of the two middle values"

**Visual generator — 12 fixes:**

- Shape choice, sides counting, most-sides, and counting: each option had an independent random color tone, so the correct shape could be the only one of its color — all options now share one uniform tone
- Counting: grid could overflow (14 shapes in 12 slots) — capped total at 12
- Mirror: 90°/270° rotations produced visually incorrect mirrors — restricted to 0°/180°
- Fractions: `shaded - 1` distractor equals the correct answer when `shaded === 1` — replaced
- Rotate explanation: said "Answer: 90°" but options are "Aligned"/"Not aligned" — fixed to match option text
- Memory dots explanation: said "Answer: 5 dots" but option is "Completed correctly" — fixed to match option text
- Dot-region containment used only the dot center, allowing its visible 3-unit radius to cross another shape's boundary while the answer excluded that shape — generation now selects only positions with at least 5 SVG units of clearance from every boundary; regression-tested across all difficulties
- Composite rotation could place identical dots in rotationally symmetric positions, making two nominally different transformations render as the same answer — generated dot/line configurations are now rejected unless all four rendered transformations are unique
- Shape-counting figures used a rightmost center position of 93% inside an `overflow: hidden` panel, allowing wide shapes to clip on narrow phones — columns now use safe centers at 12.5%, 37.5%, 62.5%, and 87.5%

**Figure classification curated bank — 7 fixes (second audit round):**

- fc-001, fc-003, fc-004, fc-007: correct groupings were trivial row or column partitions — rewrote all seven 9-figure questions so the correct grouping uses scattered positions (e.g., shapes at 1,6,8 / 2,4,9 / 3,5,7) with distractor partitions matching nothing in the grid
- fc-002: all 9 figures were identical circles, making every partition trivially valid by shape — replaced with 9 distinct shapes so only the fill-rows grouping is correct
- fc-006: correct fill grouping was rows (1,2,3)/(4,5,6)/(7,8,9) — scattered to (1,5,9)/(2,4,8)/(3,6,7) so it no longer coincides with rows
- fc-010: claimed arrows lack symmetry (wrong — a right-pointing arrow has horizontal symmetry) — replaced with l-shape vs symmetric shapes (circle, star, square)
- fc-010: options appeared out of numeric order ("Figure 1, 2, 4, 3") — reordered to 1, 2, 3, 4
- Answer positions were clustered at option A — redistributed across A/B/C/D
- Added automated semantic partition validator test to prevent regression

**Text mirror visual — 2 fixes (second audit round):**

- Mirror axis line was invisible: `.mirror-axis` used `--border-strong` (`#C9C29F`, cream) on `--surface-2` (`#F5EFDC`, cream) — contrast ratio ~1.3:1, below WCAG AA 3:1 for graphical objects. Changed to `--text` (`#333B28`, dark olive) for ~7:1 contrast
- `.text-mirror-original` retained stale `text-align: center` from the pre-flex block layout — removed (flex container handles alignment)

**Session and currency systems — 4 fixes:**

- Currency regex failed to capture decimal amounts like "₹116.15" — now captures decimals with proper locale formatting
- Curated questions were filtered by `q.prompt` but recorded in seen-history by `q.dedupeKey ?? q.prompt` — now consistent everywhere
- Curated question ordering shuffled unseen and seen together, destroying unseen-first priority — now preserves unseen-first ordering
- Session validation didn't reject NaN values (typeof NaN === 'number') — now uses `Number.isFinite` and validates difficulty against the allowed enum

### Compliance audit — control-by-control

A systematic control-by-control audit was conducted against four frameworks. Each control was evaluated against the actual codebase, not just the feature list. Status definitions: **COMPLIANT** (control met with evidence), **PARTIALLY COMPLIANT** (control met with gaps), **NON-COMPLIANT** (control not met), **NOT APPLICABLE** (control doesn't apply to a client-only app with no backend).

#### ISO/IEC 27001 — Information Security

| Control | Status | Evidence |
|---|---|---|
| A.5.12 Information classification | PARTIALLY COMPLIANT | Player name stored as PII with privacy notice, but no formal classification labels in code |
| A.5.15 Access control | PARTIALLY COMPLIANT | Data bound to browser origin; no auth needed for single-user local app; documented in privacy notice |
| A.5.34 Privacy and PII protection | PARTIALLY COMPLIANT | Notice at collection, deletion path ("Not you?"), no transmission; missing explicit opt-in checkbox and formal retention policy |
| A.6.7 Secure development | COMPLIANT | CI pipeline with lint, test, audit, build gates in `.github/workflows/deploy.yml` |
| A.8.3 Information access restriction | COMPLIANT | `loadSession()` validates version, structure, finite numbers, difficulty enum before rendering |
| A.8.8 Technical vulnerability management | COMPLIANT | `npm audit --audit-level=high` in CI; `package-lock.json` for reproducible installs |
| A.8.10 Information deletion | COMPLIANT | `clearSession()`, `clearPlayerName()`, `clearCurrency()`, `history.clear()`; "Not you?" UI; ErrorBoundary wipe |
| A.8.15 Logging | COMPLIANT | Only `console.error` in ErrorBoundary; no PII logged |
| A.8.20 Network security | PARTIALLY COMPLIANT | Only same-origin fetch for local JSON; Google Fonts over HTTPS; no CSP header configured |
| A.8.24 Use of cryptography | NOT APPLICABLE | No cryptography needed for a single-user local app; no passwords, no tokens, no secrets |
| A.8.25 Secure development lifecycle | COMPLIANT | Session versioning (v3), 210 tests, CI gates, strict TypeScript |
| A.8.28 Secure coding | COMPLIANT | `strict: true` in tsconfig, no `any`, no `dangerouslySetInnerHTML`, no `eval`, input trimmed and capped |
| A.8.30 Outsourced development | NON-COMPLIANT | GitHub Actions use floating tags (`@v4`), not SHA-pinned — requires repo-owner manual fix |
| A.8.32 Change management | COMPLIANT | `SESSION_VERSION = 3` with reject-and-clear on mismatch; no old schema can crash the app |

#### ISO/IEC 5054 — Software Quality

| Characteristic | Status | Evidence |
|---|---|---|
| Functional Suitability | COMPLIANT | Generators compute answers from prompt parameters; 210 tests independently verify correctness |
| Performance Efficiency | PARTIALLY COMPLIANT | 320 KB bundle (98 KB gzip); no bundle analyzer or code-splitting; generator backtracking capped |
| Compatibility | PARTIALLY COMPLIANT | Modern browsers only (ES2023); 6 responsive breakpoints; no polyfills for legacy browsers |
| Usability | COMPLIANT | Practice mode, session resume, error recovery, responsive design, privacy notice |
| Reliability | COMPLIANT | All localStorage in try/catch; session validation; ErrorBoundary; graceful degradation |
| Security | COMPLIANT | Strict TypeScript, no XSS surface, no secrets, input validation, NaN-safe session checks |
| Maintainability | PARTIALLY COMPLIANT | Clear module structure; shared utilities duplicated across generators; `useQuiz.ts` is 472 lines |
| Portability | COMPLIANT | `base: './'` relative paths; no backend; deploys to any static host |

#### ISO/IEC 42001 — AI Governance

| Aspect | Status | Evidence |
|---|---|---|
| AI Policy and Transparency | COMPLIANT | "Built with AI" in app footer and README; AI-assisted origin disclosed |
| Algorithmic Accountability | COMPLIANT | All generators deterministic and procedural; each question has a traceable `dedupeKey` |
| Data Provenance | COMPLIANT | Two sources only: procedural generators (`source: 'generator'`) and curated static JSON (`source: 'curated'`); no runtime AI output |
| Hallucination Defense | COMPLIANT | Zero runtime LLM calls; zero external AI APIs; all answers computed mathematically |
| Human Oversight | PARTIALLY COMPLIANT | ErrorBoundary, session validation, "Not you?" deletion; no "Report this question" feedback channel |
| Risk Management | COMPLIANT | 210 tests including independent answer recomputation, 500-sample audit sweeps, semantic partition validation, regression tests for 54 fixed bugs |
| Privacy in AI Context | COMPLIANT | No user data sent to any AI service; no AI service called; all data stays on device |
| Bias and Fairness | PARTIALLY COMPLIANT | Gender-appropriate name pools for blood relations; gender-neutral pronouns in merchant questions; single cultural name set (Indian-origin) |

#### IT Act 2000 — India (including SPDI Rules 2011)

| Aspect | Status | Evidence |
|---|---|---|
| SPDI Collection with Consent | PARTIALLY COMPLIANT | Privacy notice at collection with storage location, non-transmission, withdrawal path; implicit consent via Continue button (no explicit opt-in checkbox) |
| Privacy Policy/Disclosure | PARTIALLY COMPLIANT | Inline notice in NamePrompt; no standalone privacy policy page or persistent in-app disclosure |
| Reasonable Security Practices (RSP) | COMPLIANT | Session validation, try/catch on all storage, ErrorBoundary, schema versioning, strict TypeScript, input capped at 30 chars |
| Data Retention and Deletion | PARTIALLY COMPLIANT | Full deletion available ("Not you?", ErrorBoundary wipe); no explicit retention schedule in UI |
| Breach Notification | NOT APPLICABLE | No backend, no network data transmission; ErrorBoundary handles local data corruption |
| Intermediary Liability (Section 79) | NOT APPLICABLE | App is not an intermediary; no user-generated content shared between users |
| Electronic Records Integrity (65A/65B) | COMPLIANT | `SESSION_VERSION = 3` stamping; `loadSession()` rejects malformed/NaN/invalid records; ErrorBoundary as last defense |
| Sensitive Data Transmission | COMPLIANT | No player data transmitted; only same-origin fetch for local JSON; Google Fonts carries no user data |
| Withdrawal of Consent | COMPLIANT | "Not you?" link clears player name and currency; ErrorBoundary offers full data wipe |

### Remediation summary

**Fixed this audit:**
- TypeScript `strict` mode enabled in `tsconfig.app.json` (was missing — found by ISO 27001 A.8.28 and ISO 5054 Security)
- Gendered pronoun "he" in merchant question replaced with "they" (found by ISO 42001 Bias and Fairness)
- Symbol substitution generator: word selection now guarantees all letters are in the mapping (was producing `?` placeholders)
- Missing number grid: diag-sum pattern fallback now properly regenerates as row-sum instead of overriding with a random number
- Test files excluded from production `tsc -b` build (were causing type errors with node imports)
- Figure classification bank: all 7 grouping questions rewritten with scattered partitions so only the intended criterion is valid (was trivial row/column groupings)
- Figure classification bank: fc-002 identical-shapes ambiguity and fc-010 incorrect symmetry claim fixed
- Text mirror: invisible mirror axis line (cream-on-cream, WCAG fail) replaced with high-contrast dark olive line
- Figure classification rendering: `dot-region` and `figure-classification` visual types now render standard answer option buttons (were missing)
- Semantic partition validator test added to prevent ambiguous classification questions from shipping
- AI/ML curated bank: added missing `dedupeKey` to all 50 questions (was falling back to `q.prompt`; now consistent with figure-classification bank)
- AI/ML curated bank: added automated structure and dedupe-key uniqueness test

**Fixed in earlier sessions (still valid):**
- Session overwrite by practice round [ISO 5054 Reliability] — practice-mode guard added
- No error boundary [ISO 5054 Availability] — `ErrorBoundary` with recovery added
- Timeout in practice mode [Correctness] — practice-mode check in `handleTimeout`
- PII without notice [ISO 27001 A.5.34 / IT Act SPDI] — privacy notice at collection
- No schema versioning [ISO 5054] — `SESSION_VERSION` with reject-and-clear
- No dependency vulnerability gate [ISO 27001 A.8.8] — `npm audit` in CI
- Incomplete session validation [ISO 5054] — `Number.isFinite` and difficulty enum checks
- Unguarded JSON parse [ISO 5054] — null guard added
- 42 generator correctness bugs (first audit round) — all fixed with regression tests
- 9 figure-classification and text-mirror defects (second audit round) — all fixed with semantic partition validator test
- Dot-region visible-boundary ambiguity (post-release audit) — fixed with minimum-clearance generation and regression test
- Composite-rotation duplicate visible options (post-release audit) — fixed with rendered-state signatures and rejection sampling
- Shape-counting clipping on narrow phones (post-release audit) — fixed with safe grid margins
- Four visual audit tests requested categories that could never produce the visual subtype being tested — corrected dispatch categories and added minimum sample assertions so tests cannot silently pass without exercising relevant questions

**Remaining items (manual follow-up, require repo-owner action):**
- GitHub Actions SHA-pinning [ISO 27001 A.8.30] — replace `@v4` tags with pinned commit SHAs
- Google Fonts self-hosting [Privacy] — self-host font files to eliminate external request
- Explicit consent checkbox [IT Act SPDI] — add opt-in toggle in NamePrompt
- Standalone privacy policy [IT Act] — add a privacy page or persistent in-app disclosure
- "Report this question" feedback [ISO 42001] — add a feedback button for human oversight
- Bundle analyzer [ISO 5054 Performance] — add `vite-bundle-analyzer` to CI
- Shared utility extraction [ISO 5054 Maintainability] — deduplicate `randInt`, `pick`, `shuffle`, `mcq` across generators

### Audit verdict

**PASS with documented exceptions.** All quality gates green — 0 lint errors, 0 build errors, 210/210 tests passing, strict TypeScript enabled. 54 correctness and visual-ambiguity defects have been fixed across the audit rounds, including post-release dot-region boundary, composite-rotation uniqueness, and mobile shape-clipping issues. ISO 27001: 9 compliant, 4 partially compliant, 1 non-compliant (SHA-pinning, manual fix), 1 N/A. ISO 5054: 5 compliant, 3 partially compliant. ISO 42001: 6 compliant, 2 partially compliant. IT Act 2000: 4 compliant, 3 partially compliant, 2 N/A. Remaining items are manual follow-ups requiring repo-owner action, not code changes.

---

## Known Limitations

1. **Multi-tab usage** — two tabs on the same origin share localStorage; last-write-wins on the session key. Use one tab at a time for predictable resume behavior.
2. **Memory dots** — inherently visual; not playable non-visually by screen-reader users. The question is skipped via timeout with no lives lost in practice mode.
3. **Browser storage per origin** — `localhost:5173` and `127.0.0.1:5173` are different origins; they keep separate player names and saved sessions. Always test on the same URL.
4. **Curated AI/ML bank is fixed at 50 questions** — these are hand-authored and can't be procedurally generated. After ~15 rounds on the AI/ML path, repeats from this pool are expected (seen-history prevents immediate repeats).
5. **Currency scaling is approximate** — scale factors are rough magnitudes for local realism, not live exchange rates. The intent is that ₹500 feels like ¥5,000 in context, not precise FX conversion.

---

## Tech Stack

- **React 19** — UI framework
- **Vite 8** — build tool and dev server
- **TypeScript 6** — strict typing, no `any`
- **Vitest 5** — unit testing (210 tests, all passing)
- **oxlint** — fast linter (0 errors, 0 warnings)
- **GitHub Actions** — CI/CD with audit + lint + test + build gates
- **Inline SVG** — all visual questions rendered as vector graphics, no image assets

---

## Why This Project Is in My Portfolio

This project isn't a tutorial app or a CRUD scaffold. It's a deliberate engineering showcase — every feature was chosen to demonstrate a specific skill that matters in production software.

### 1. Prompt-driven development at production standard

The entire codebase — generators, visual engine, game logic, session persistence, error boundary, CI, audit, and this README — was produced through natural-language prompts with zero hand-written code. That demonstrates system architecture thinking, quality gatekeeping (the audits found 54 real correctness and visual-ambiguity defects and I drove every fix), and iterative product evolution under prompt control.

### 2. Algorithmic thinking, not framework plumbing

- Procedural question generation across 15 categories with 60+ subtypes, each with computed correct answers, plausible distractors, and step-by-step explanations
- Visual puzzle generation with rejection sampling, sequence scaling, and SVG rendering
- Category balancing and sequence-family limiting in the scheduler so no single pattern type dominates a quiz
- Self-playing demo mode with auto-highlighting, auto-rotation, and auto-tap state machines
- 210 tests that parse prompts, independently compute expected answers, verify distractor values differ numerically, check that visual questions can't be answered by color alone, and validate that figure-classification partitions have exactly one mathematically correct grouping

These are problems you solve with thinking, not with `npm install`.

### 3. Production-grade reliability engineering

- Versioned session persistence with reject-and-clear on schema mismatch
- Error boundary with recovery and data-clear path
- Defense in depth: guard at write, validation at read, boundary at render
- Graceful degradation: every localStorage access wrapped in try/catch
- NaN-safe validation using `Number.isFinite` instead of `typeof === 'number'`

### 4. Security and compliance awareness

The audit section demonstrates the ability to think like an auditor — identify findings by severity, map them to frameworks (ISO 27001, ISO 5054, ISO 42001, IT Act 2000), and write remediations. Even for a local-only app, privacy notice at collection time and a withdrawal pathway were added, aligning with IT Act SPDI Rules.

### 5. Full-stack product ownership

- Product design: five learning paths covering kids to AI/ML engineers, six interaction types, difficulty scaling, arcade scoring
- UX engineering: self-playing practice mode, resume where you left off, quit anytime, responsive across phone/tablet/desktop, internationalized currency
- DevOps: CI pipeline with audit + lint + test + build gates, GitHub Pages deployment
- Documentation: architecture, question-type inventory, audit report, and known limitations

### 6. What this project is NOT

Being honest about what this doesn't prove:
- No backend — there's no database, no auth, no server. Pair it with a Supabase/Node project for backend skills.
- No real users at scale — the repeat-protection and session logic are designed for single-device use.
- No integration/E2E tests — the 210 unit tests cover the generators (pure functions), but there are no component or browser-level tests. A production team would add Playwright/Cypress.

### The one-line pitch

> *"I can architect a production-grade interactive platform entirely through prompt-driven development, audit it against ISO standards, and ship it with CI gates — and the codebase proves it."*

---

## License

MIT — free to use, learn from, and build on.

---

*Developed by: Gauresh Chari — NeuralWeb Solutions, Goa © 2026*
*Built with AI*

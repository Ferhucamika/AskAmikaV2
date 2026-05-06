# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project: AskAmika

Internal C-Level decision-support chatbot. Read `docs/BUILD_SUMMARY.md` for the full picture. Key facts for every session:

### Stack
- Next.js (App Router) + TypeScript 5 + Tailwind CSS v4
- Auth: Entra ID via MSAL — **not wired live yet**, login gate is in place but `AZURE_AD_CLIENT_ID` is not set
- Tests: **Vitest 3 + happy-dom** (not Jest, not jsdom — switching either breaks ESM)
- Run tests: `npm test` (48 tests, all mocked, no live API keys needed)

### Models (6 active in `src/lib/constants.ts`)
| ID | Provider | Model string | Status |
|---|---|---|---|
| `claude-opus` | Anthropic | `claude-opus-4-7` | ✅ Active |
| `claude-sonnet` | Anthropic | `claude-sonnet-4-6` | ✅ Active |
| `claude-haiku` | Anthropic | `claude-haiku-4-5-20251001` | ✅ Active |
| `openai-flagship` | OpenAI | `gpt-5.5` | ✅ Active |
| `gemini-flash` | Google | `gemini-2.5-flash` | ✅ Active |
| `grok` | xAI | `grok-3` | ✅ Active |

All 6 models are active with credentials set up in `.env.local`.

### Key architecture
- **Analyzer** (`src/lib/mcp/analyzer.ts`) classifies every question → `{ isBusinessContext, confidence, entities }`
- **Router** (`src/lib/llm/router.ts`) picks model: `≥3 entities → Opus`, `business → Sonnet`, `general → Haiku/GPT`
- **Factory** (`src/lib/llm/factory.ts`) — single place that maps `provider` → client instance; update here when adding new providers
- **Council** (`/api/council`) — 3 models in parallel via `Promise.all`, synthesized by Opus
- **Artifacts** — detected by regex after stream closes, auto-opens `ArtifactPanel` overlay
- **Sessions** — localStorage now; `src/lib/storage/schemas.ts` already matches future Cosmos shape

### What's NOT done yet (requires external provisioning)
- Azure staging/prod deploy (Task 13) — needs Azure CLI, Key Vault secrets, Container App, GitHub OIDC
- Live MSAL login — needs App Registration client ID
- Cosmos DB — schemas ready, just swap `src/lib/storage/sessions.ts`
- Fabric MCP routing — `isBusinessContext` flag is set but not acted on

### Testing rules
- All LLM API calls must be mocked with `vi.hoisted` — no live SDK calls in tests
- Use `vi.mock('openai', ...)` pattern for OpenAI-compatible clients (OpenAI + Grok share the SDK)
- Gemini mock targets `@google/genai` → `GoogleGenAI` constructor

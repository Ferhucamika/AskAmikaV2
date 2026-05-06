# AskAmika — Build Summary

Internal C-Level decision-support chatbot. Built with Next.js, TypeScript, Tailwind, MSAL auth, and multiple LLM backends.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, standalone output) |
| Language | TypeScript 5 |
| Styles | Tailwind CSS v4 |
| Auth | Entra ID via `@azure/msal-browser` + `@azure/msal-react` |
| LLMs | Anthropic SDK (Claude), OpenAI SDK (GPT + Grok), `@google/genai` (Gemini) |
| Tests | Vitest 3 + happy-dom (48 tests, all mocked) |
| Deploy | Docker → Azure Container Registry → Azure Container App |
| CI | GitHub Actions with OIDC federation (no stored secrets) |
| Secrets | Azure Key Vault + managed identity |

---

## Models

| ID | Provider | Role in AskAmika |
|---|---|---|
| `claude-opus-4-7` | Anthropic | Council synthesis, high-entity-count questions |
| `claude-sonnet-4-6` | Anthropic | Business context questions |
| `claude-haiku-4-5-20251001` | Anthropic | Question analyzer (classifier) |
| `gpt-5.5` | OpenAI | OpenAI flagship option |
| `gemini-2.5-flash` | Google | Fast multimodal option |
| `grok-3` | xAI | Creative/research alternative |

All six are registered in `MODELS` and selectable as Council members or via `overrideModelId`. Gemini and Grok are fully active with `GOOGLE_API_KEY` / `XAI_API_KEY` configured in `.env.local`.

---

## What Was Built (12 tasks)

### Task 1 — Next.js scaffold
`npx create-next-app` with TypeScript, Tailwind, App Router. Added `.env.example`, `.gitignore`, Vitest config, brand colors in `globals.css`, placeholder home page.

### Task 2 — Entra ID auth
- `src/lib/auth.ts` — MSAL config, `extractUserFromToken`, `validateToken`
- `src/components/Providers.tsx` — client-side MSAL wrapper (keeps `layout.tsx` server-side)
- `src/app/api/auth/me/route.ts` — Bearer token → user JSON

### Task 3 — Question analyzer
- `src/lib/mcp/analyzer.ts` — calls `claude-haiku-4-5-20251001`, returns `{ isBusinessContext, confidence, entities }`
- `isBusinessContext` flag preserved for future Fabric routing; not acted on yet

### Task 4 — LLM client abstractions
- `src/lib/llm/types.ts` — `LLMClient` interface (`stream`, `complete`)
- `src/lib/llm/clients/claude.ts` — ClaudeClient
- `src/lib/llm/clients/openai.ts` — OpenAIClient
- `src/lib/llm/clients/gemini.ts` — GeminiClient (`@google/genai`, maps `assistant` → `model` role)
- `src/lib/llm/clients/grok.ts` — GrokClient (OpenAI SDK pointed at `https://api.x.ai/v1`)
- `src/lib/llm/factory.ts` — `clientFor(model)` switch used by both routes

### Task 5 — Model constants
- `src/lib/constants.ts` — `MODELS` array (6 entries), `AMIKA_COLORS`
- `src/lib/types.ts` — all shared interfaces: `Message`, `Artifact`, `QuestionAnalysis`, `ModelResponse`, `CouncilResponse`, `ChatSession`

### Task 6 — Intelligent router
- `src/lib/llm/router.ts` — scores models by confidence + entity count + business/general context
- Routing: `≥ 3 entities → Opus`, `business → Sonnet`, `general → Haiku/GPT`
- Supports `context.overrideModelId` for user-forced model selection

### Task 7 — Streaming chat API
- `src/app/api/chat/route.ts` — POST handler: analyzer → router → client, streams as `text/plain`, exposes `X-Selected-Model` header

### Task 8 — Chat UI + Council feature
- `src/components/ChatInterface.tsx` — gradient header, streaming message list (user right/orange, assistant left/gray), session persistence, "Convene Council" button
- `src/components/ModelSelector.tsx` — dropdown in header to manually override model choice (or "Auto" for router)
- `src/components/CouncilTabs.tsx` — tabbed interface showing 3 model responses + orchestrator, click to switch between them
- `src/components/QuestionInput.tsx` — textarea + send button
- `src/components/Login.tsx` — Entra ID sign-in screen
- `src/app/page.tsx` — auth gate (bypassed by `NEXT_PUBLIC_SKIP_AUTH=true` for local dev)
- `src/lib/llm/orchestrator.ts` — `synthesizeCouncilResponses` via Opus
- `src/app/api/council/route.ts` — 3 models in parallel (`Promise.all`), returns `{ responses, orchestratorSummary }`
- `src/components/CouncilView.tsx` — legacy 3-column view (kept for reference, replaced by CouncilTabs)

### Task 9 — Artifact detection + panel
- `src/lib/artifacts/detector.ts` — regex detection: fenced code, JSON/YAML/CSV (data), markdown tables, multi-heading documents
- `src/components/ArtifactPanel.tsx` — fixed right-side overlay, language badge, copy button, JSX-rendered (no XSS surface)

### Task 10 — Session persistence (localStorage)
- `src/lib/storage/schemas.ts` — `SessionDocument`, `MessageDocument`, `ArtifactDocument` (same shape as future Cosmos swap)
- `src/lib/storage/sessions.ts` — `saveSession`, `getSession`, `listSessions`, `deleteSession` with SSR guard

### Task 11 — Integration + ArtifactPanel wiring
- `tests/integration/chat-flow.test.ts` — analyzer → router chain end-to-end
- `ChatInterface` updated: detects artifacts after each stream, auto-opens panel, resets on next question

### Task 12 — Docker + Azure deploy
- `Dockerfile` — multi-stage (deps / builder / runner), Node 20 Alpine, non-root `nextjs:1001`, runs `.next/standalone/server.js`
- `.dockerignore` — excludes tests, docs, secrets
- `.github/workflows/deploy.yml` — test stage (`npm test + build`), deploy stage (OIDC login → `az acr build` → `containerapp update`)
- `docs/deployment/azure-key-vault-setup.md` — full bootstrap guide (KV creation, secret population, managed identity, env var mapping, GitHub OIDC federation)
- `next.config.ts` — `output: "standalone"`

---

## Test Coverage

| File | Tests |
|---|---|
| `tests/lib/auth.test.ts` | 1 |
| `tests/lib/mcp/analyzer.test.ts` | 5 |
| `tests/lib/llm/clients/claude.test.ts` | 4 |
| `tests/lib/llm/clients/gemini.test.ts` | 4 |
| `tests/lib/llm/clients/grok.test.ts` | 4 |
| `tests/lib/llm/router.test.ts` | 5 |
| `tests/lib/llm/orchestrator.test.ts` | 3 |
| `tests/lib/artifacts/detector.test.ts` | 6 |
| `tests/lib/storage/sessions.test.ts` | 5 |
| `tests/app/api/chat/route.test.ts` | 4 |
| `tests/app/api/council/route.test.ts` | 4 |
| `tests/integration/chat-flow.test.ts` | 3 |
| **Total** | **48** |

All tests use mocked SDK calls — no live API keys needed to run `npm test`.

---

## Local Testing (Ready Now)

Run `npm run dev` and navigate to `http://localhost:3000`. Thanks to `NEXT_PUBLIC_SKIP_AUTH=true` in `.env.local`, the login gate is bypassed. To test models:

1. **Chat**: Ask a question → router automatically selects the best model or use the dropdown to override
2. **Council**: Click "Convene Council" → all 3 models run in parallel, results show in tabs (switch between them)
3. **Artifacts**: Ask for code/JSON/tables → detected automatically, open in right-side panel
4. **Models**: Dropdown in header lets you force a specific model instead of letting the router decide

## What's Left

| Task | Requires |
|---|---|
| Task 13 — Azure staging/prod deploy | Azure CLI signed in, Key Vault secrets populated, Container App provisioned, GitHub OIDC federation wired |
| Live MSAL login | Azure App Registration client ID + tenant ID in `.env.local`, set `NEXT_PUBLIC_SKIP_AUTH=false` |
| Cosmos DB persistence | Azure Cosmos account + key — swap out `src/lib/storage/sessions.ts` (schemas already match) |
| Fabric MCP routing | Fabric connector — `isBusinessContext` flag already set by analyzer, not yet acted on |

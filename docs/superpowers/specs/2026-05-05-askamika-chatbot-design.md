# AskAmika Chatbot - Design Specification
**Date:** 2026-05-05  
**Status:** Approved  
**Project:** AskAmikaV2 Internal Chatbot  
**Timeline:** 3-4 weeks  
**Builder:** Solo development

---

## Executive Summary

AskAmika is an internal chatbot for C-Level executives that intelligently routes questions to the best AI model and provides a "Council" feature for consensus decision-making. Questions are automatically classified as business or general, with business questions augmented by real-time data from Microsoft Fabric via MCP integration.

---

## Architecture

### Tech Stack
- **Frontend:** Next.js 14+ with TypeScript, React Server Components
- **Styling:** Tailwind CSS with Amika brand color palette
- **Authentication:** Entra ID via MSAL
- **Hosting:** Azure App Service
- **Database:** Azure Cosmos DB (session history, preferences)
- **Model APIs:** OpenAI (GPT-4), Anthropic (Claude), Google (Gemini), xAI (Grok)
- **Data Integration:** MCP client → Microsoft Fabric

### System Architecture

```
┌─────────────┐
│  Entra ID   │ (Authentication)
└──────┬──────┘
       │
┌──────▼────────────────────────────┐
│    Next.js App (Azure App Service) │
├────────────────────────────────────┤
│ • Server Actions (routing logic)   │
│ • API Routes (auth, integrations)  │
│ • React Components (UI)            │
└──────┬─────────────┬───────────────┘
       │             │
   ┌───▼──────┐   ┌──▼─────────┐
   │ LLM APIs │   │  Fabric MCP │
   │(Claude,  │   │(data query) │
   │GPT, etc) │   └────────────┘
   └──────────┘
```

---

## User Flow

### Step 1: Question Entry
- Clean interface with large text input (Amika orange accent on focus)
- "Analyzing question..." feedback on submit

### Step 2: Intelligent Question Analysis
- Haiku classifier determines: **Business Context** or **General Knowledge**
- Business questions trigger entity extraction (product names, customer IDs, metrics)
- Classification result shown to user with model selection pending

### Step 3: Conditional Data Retrieval
- **Business questions:** MCP queries Fabric for relevant data (cached briefly)
- **General questions:** Skips Fabric, proceeds directly to routing

### Step 4: Intelligent Model Selection
- Routing logic evaluates question complexity and context:
  - **Complex analysis** → Claude Opus
  - **Quick answers** → Claude Haiku or GPT-4 Turbo
  - **Creative tasks** → Grok
  - **Research/synthesis** → Gemini
- User sees selected model with option to override

### Step 5: Response Rendering
- Stream response in real-time
- Auto-detect code, documents, structured data → generate artifact
- Show "View in Artifact" button if applicable
- Log response to history

---

## Core Features

### 1. Intelligent Question Analysis
- Automatic classification of business vs. general questions
- Entity extraction from business questions (customer names, product IDs, etc.)
- Context preserved throughout the request pipeline

### 2. Configurable Model Selection
**Balanced Model Roster (configurable in environment):**
- Claude Opus (complex reasoning)
- Claude Sonnet (fast, capable)
- Claude Haiku (ultra-fast)
- GPT-4 Turbo (multimodal, strong analysis)
- Gemini Pro (research, synthesis)
- Grok (creative, lateral thinking)

**Routing Logic:**
- Question complexity analysis
- Model capability matching
- Fallback chain (if primary fails, try next)
- Manual override by user

### 3. Council Feature
Executive decision-making enhanced by multiple perspectives.

**Council View:**
- 3 models respond to same question in parallel
- Side-by-side comparison: Model 1 | Model 2 | Model 3
- Each response expandable/collapsible
- Copy individual responses, export as PDF

**Orchestrator Summary:**
- Claude Opus synthesizes all 3 responses
- Highlights agreements, disagreements, key insights
- Styled with Amika colors (orange for key points, hot pink for warnings)
- Shows recommended action if consensus exists

**Council Actions:**
- Reprocess with different model combination
- Export all responses + summary
- Star favorite response for later reference

### 4. Artifact System
Auto-generate rich displays for complex outputs.

**Triggers:**
- Code blocks (any language)
- Structured data (JSON, CSV, tables)
- Documents (markdown, formatted reports)
- User-requested visuals (charts, diagrams)

**Artifact Display:**
- Expandable side panel (40% width, right side)
- Syntax highlighting by language
- Copy to clipboard button
- Download as file option
- Full-screen mode for large artifacts

**Council Artifacts:**
- Side-by-side artifact comparison if all 3 models generate
- Users can compare implementations and pick best

### 5. Microsoft Fabric Integration (MCP)
Real-time business data retrieval.

**Capabilities:**
- Query Fabric datasets via natural language
- Extract customer data, sales figures, product info
- Cache results briefly (5 min) to avoid redundant queries
- Graceful fallback if Fabric unavailable

**Data Classification:**
- Questions auto-classified as business/general
- Only business questions trigger Fabric queries
- Extracted entities used to narrow Fabric queries

---

## Data Flow

```
User Question Input
       ↓
[Analysis Server Action]
  ├─ Haiku classification (Business/General?)
  ├─ Entity extraction
  └─ Context evaluation
       ↓
    ┌──────────────────┬──────────────────┐
    │                  │                  │
BUSINESS CONTEXT    GENERAL QUESTION     │
    │                  │                  │
    ↓                  │                  │
[MCP → Fabric Query]   │                  │
  └─ Fetch data ──────┘                  │
    ↓                  ↓                  │
    └──────────┬───────┘                  │
               ↓                          │
        [Model Routing Logic]             │
      ├─ Evaluate complexity              │
      ├─ Match to model capability        │
      └─ Select best model ───────────────┘
               ↓
      [Stream Response]
      ├─ API call to selected model
      ├─ Real-time streaming to UI
      └─ Parse for artifacts
               ↓
       [Render + Persist]
      ├─ Display in UI
      ├─ Generate artifact (if needed)
      ├─ Log to Cosmos DB
      └─ Show reprocess option
```

**Council Parallel Flow:**
- 3 selected models called in parallel
- Orchestrator called after all 3 complete
- Results aggregated and displayed side-by-side

---

## Integration Points

| System | Purpose | Authentication | Protocol |
|--------|---------|-----------------|----------|
| **Entra ID** | User authentication | OAuth 2.0 | REST |
| **Fabric MCP** | Business data retrieval | Service Principal | HTTP + MCP |
| **Claude API** | Model inference | API Key | REST + streaming |
| **OpenAI API** | GPT-4 inference | API Key | REST + streaming |
| **Google Generative AI** | Gemini inference | API Key | REST + streaming |
| **xAI API** | Grok inference | API Key | REST + streaming |
| **Cosmos DB** | Session history, preferences | Connection string | SDK |

### Credential Management
- All API keys stored in Azure Key Vault
- Environment variables reference vault secrets
- No hardcoded credentials
- Service Principal for Fabric (Entra ID) authentication

---

## Error Handling

| Scenario | Response |
|----------|----------|
| **Model API timeout (>30s)** | Retry with faster model (Haiku), show "Partial response" |
| **Fabric query fails** | "Data unavailable - proceeding with general answer" |
| **Council: 1 of 3 models fails** | Show error card for that model, allow individual retry |
| **All 3 Council models fail** | Display error, suggest manual retry or different models |
| **Entra ID token expired** | Silent refresh if possible, redirect to login if needed |
| **MCP connection lost** | Banner: "Data connector offline - operating in general mode" |
| **Artifact generation fails** | Show response normally, log error server-side |

**Security & Compliance:**
- API keys in Key Vault only
- Session data encrypted in Cosmos DB
- All Fabric queries audited for compliance
- Response history private to authenticated user
- No PII in error messages

---

## Testing Strategy

### Unit Tests
- Question analysis: classification accuracy on business/general split
- Model routing: complexity evaluation → correct model selection
- Artifact detection: code/document/structure identification

### Integration Tests
- MCP ↔ Fabric: data retrieval, error cases, timeouts
- Model APIs: streaming, partial responses, token limits
- Entra ID: login flow, token refresh, session expiry
- Cosmos DB: history logging, preferences storage

### End-to-End Tests
- Full request: question → analysis → data retrieval → model selection → response → artifact
- Council feature: parallel model calls, orchestrator synthesis, summary generation
- Error scenarios: graceful fallbacks, user messaging

### Testing Setup
- Mock LLM APIs (JSON fixtures) for fast iteration
- Mock Fabric connector with sample datasets
- Manual e2e in Dev environment before Azure staging

---

## Deployment & Launch

### Pre-Launch Checklist
- [x] Design approved
- [ ] Dev environment set up (Next.js, Entra ID, local Cosmos)
- [ ] Model APIs tested with credentials
- [ ] Fabric MCP integration tested
- [ ] UI mockups reviewed
- [ ] Initial unit tests passing
- [ ] Staging environment deployed
- [ ] E2E tests passing
- [ ] Performance baseline established
- [ ] Azure key vault configured
- [ ] C-Level user testing (internal pilot)
- [ ] Production deployment

### Go-Live Criteria
- All integration tests passing
- Fabric queries <2 sec (cached)
- Model responses stream within 3 sec
- Council orchestrator <5 sec
- Zero auth errors in staging
- Error rates <0.5%

---

## Configuration & Extensibility

### Model Configuration
Models defined in config file (easily swappable):
```
models: [
  { id: "claude-opus", provider: "anthropic", capability: "complex" },
  { id: "gpt-4-turbo", provider: "openai", capability: "analysis" },
  { id: "gemini-pro", provider: "google", capability: "research" },
  { id: "grok-beta", provider: "xai", capability: "creative" }
]
```

### Routing Rules
Model selection logic configurable by complexity tier and task type.

### Fabric Queries
Entity extraction patterns customizable per business context.

---

## Success Criteria

- C-Level users can ask questions without manual model selection
- Business questions correctly identified and augmented with Fabric data
- Council feature provides meaningful consensus
- All responses stream in <5 seconds
- Error rate <1% in production
- 90%+ of artifacts auto-generate correctly
- Users feel confident in model selection (vs. random choice)

---

## Next Steps

1. User review of this spec
2. Invoke writing-plans skill for implementation roadmap
3. Begin development (Day 1: Next.js scaffold + Entra ID auth)
4. Parallel: Model API integration + MCP research
5. Week 2-3: Feature implementation
6. Week 4: Testing, refinement, launch

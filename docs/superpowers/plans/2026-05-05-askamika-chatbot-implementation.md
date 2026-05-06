# AskAmika Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready internal chatbot for C-Level executives with intelligent multi-model routing and a Council consensus feature. Fabric data integration is a follow-up milestone — the analyzer's `isBusinessContext` flag is preserved for future use.

**Architecture:** Monolithic Next.js 14+ app deployed to Azure App Service. Server Actions handle model routing and MCP calls. React Server Components minimize client JS. Streaming responses for low-latency perception.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, React 18, Anthropic + OpenAI SDKs, Entra ID (MSAL), localStorage session history

**Timeline:** 2-3 weeks (solo)

> **Scope notes (2026-05-05 revision):**
> - **Models:** Claude 4.x (Opus/Sonnet/Haiku) and OpenAI only. Gemini and Grok are deferred until API keys are provisioned. The `LLMClient` interface keeps the architecture open for adding them later.
> - **Persistence:** localStorage for the solo internal pilot. Cosmos DB integration is a follow-up milestone.
> - **Fabric MCP:** Deferred. The analyzer's `isBusinessContext` flag is preserved so it can drive Fabric routing once the connector ships.

---

## Phase 1: Foundation & Auth (Days 1-2)

### Task 1: Next.js Scaffold & TypeScript Setup

**Files:**
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `package.json`
- Create: `.env.local` (local template)
- Create: `.env.example` (for reference)
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Initialize Next.js project with TypeScript**

```bash
cd /Users/fernandohuerta/Documents/GPT/AskAmikaV2
npx create-next-app@latest . --typescript --tailwind --app
```

Expected output: Next.js 14 with TypeScript and Tailwind installed

- [ ] **Step 2: Install required dependencies**

```bash
npm install @azure/msal-react @azure/msal-browser \
  @anthropic-ai/sdk openai \
  axios dotenv
```

> Note: Gemini (`@google/generative-ai`), xAI/Grok, and Cosmos (`@azure/cosmos`) packages are deliberately omitted from initial scope. Add them when their respective integrations ship.

- [ ] **Step 3: Create environment template**

Create `.env.example`:
```
# Entra ID
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=
NEXT_PUBLIC_AZURE_AD_AUTHORITY=
NEXT_PUBLIC_AZURE_AD_REDIRECT_URI=

# API Keys (stored in Azure Key Vault in prod)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Future milestones (uncomment when integrations ship):
# GOOGLE_API_KEY=
# XAI_API_KEY=
# COSMOS_ENDPOINT=
# COSMOS_KEY=
# COSMOS_DATABASE=AskAmika
# COSMOS_CONTAINER=sessions
# FABRIC_API_ENDPOINT=
# FABRIC_WORKSPACE_ID=
```

- [ ] **Step 4: Create root layout with Amika colors**

Create `src/styles/globals.css`:
```css
:root {
  --amika-orange: #FF6B26;
  --amika-orange-bright: #FF7A00;
  --amika-pink: #FB63C0;
  --amika-hot-pink: #EC008C;
  --amika-yellow: #FFBF00;
  --amika-blue: #38B6FF;
  --amika-lime: #C9E167;
  --amika-coral: #FF5555;
  --amika-black: #000000;
  --amika-white: #FFFFFF;
  --amika-gray-light: #DDDDDD;
  --amika-gray-text: #6A6A6A;
}

body {
  background-color: var(--amika-white);
  color: var(--amika-black);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 rounded-lg font-semibold;
    background-color: var(--amika-orange);
    color: white;
  }
  
  .btn-primary:hover {
    background-color: var(--amika-orange-bright);
  }

  .input-focus {
    border-color: var(--amika-orange) !important;
  }
}
```

Create `src/app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'AskAmika',
  description: 'C-Level Executive Chatbot',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 5: Create placeholder home page**

Create `src/app/page.tsx`:
```typescript
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold" style={{ color: 'var(--amika-orange)' }}>
        AskAmika
      </h1>
    </main>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

---

### Task 2: Entra ID Authentication Setup

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth].ts`
- Create: `src/app/api/auth/me.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write failing test for auth utilities**

Create `tests/lib/auth.test.ts`:
```typescript
describe('auth utilities', () => {
  test('should extract user from token', () => {
    const token = { 
      oid: 'user-123',
      preferred_username: 'user@company.com'
    }
    const user = extractUserFromToken(token)
    expect(user.id).toBe('user-123')
    expect(user.email).toBe('user@company.com')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/lib/auth.test.ts
```

Expected: FAIL - "extractUserFromToken is not defined"

- [ ] **Step 3: Create Entra ID auth utilities**

Create `src/lib/auth.ts`:
```typescript
import { PublicClientApplication } from '@azure/msal-browser'

export const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || '',
    authority: process.env.NEXT_PUBLIC_AZURE_AD_AUTHORITY || '',
    redirectUri: process.env.NEXT_PUBLIC_AZURE_AD_REDIRECT_URI || '',
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
}

export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
}

export function extractUserFromToken(token: any) {
  return {
    id: token.oid,
    email: token.preferred_username,
    name: token.name,
  }
}

export async function validateToken(token: string) {
  // In production, validate against Entra ID
  // For now, basic structure validation
  try {
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    if (!decoded.oid || !decoded.exp) return null
    if (decoded.exp < Date.now() / 1000) return null
    return extractUserFromToken(decoded)
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/lib/auth.test.ts
```

Expected: PASS

- [ ] **Step 5: Create auth API route**

Create `src/app/api/auth/me.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const user = await validateToken(token)
  
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  return NextResponse.json(user)
}
```

- [ ] **Step 6: Update layout with MSAL provider**

Modify `src/app/layout.tsx`:
```typescript
'use client'

import type { Metadata } from 'next'
import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig } from '@/lib/auth'
import '../styles/globals.css'

const msalInstance = new PublicClientApplication(msalConfig)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <MsalProvider instance={msalInstance}>
          {children}
        </MsalProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth tests/lib/auth.test.ts
git commit -m "feat: implement Entra ID authentication with MSAL"
```

---

## Phase 2: Core Chat Interface (Days 3-5)

### Task 3: Question Input Component & Basic UI

**Files:**
- Create: `src/components/QuestionInput.tsx`
- Create: `src/components/ChatInterface.tsx`
- Create: `src/app/page.tsx` (replace placeholder)
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Define TypeScript types**

Create `src/lib/types.ts`:
```typescript
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  timestamp: Date
  artifacts?: Artifact[]
}

export interface Artifact {
  id: string
  type: 'code' | 'document' | 'data' | 'visual'
  language?: string
  content: string
  title?: string
}

export interface QuestionAnalysis {
  isBusinessContext: boolean
  confidence: number
  entities: string[]
}

export interface ModelResponse {
  model: string
  content: string
  tokensUsed: number
  streamingTime: number
}

export interface CouncilResponse {
  responses: ModelResponse[]
  orchestratorSummary: string
  consensus?: string
}

export interface ChatSession {
  id: string
  userId: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}
```

- [ ] **Step 2: Create QuestionInput component**

Create `src/components/QuestionInput.tsx`:
```typescript
'use client'

import { useState } from 'react'

interface QuestionInputProps {
  onSubmit: (question: string) => Promise<void>
  isLoading?: boolean
}

export default function QuestionInput({ onSubmit, isLoading = false }: QuestionInputProps) {
  const [question, setQuestion] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    await onSubmit(question)
    setQuestion('')
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto p-4">
      <div className="flex gap-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 p-3 border rounded-lg resize-none focus:outline-none"
          style={{
            borderColor: 'var(--amika-gray-light)',
            minHeight: '100px'
          }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="btn-primary"
        >
          {isLoading ? 'Processing...' : 'Send'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Create ChatInterface main component**

Create `src/components/ChatInterface.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Message } from '@/lib/types'
import QuestionInput from './QuestionInput'

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleQuestionSubmit = async (question: string) => {
    setIsLoading(true)
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])

    // TODO: Call chat API
    // const response = await fetch('/api/chat', { ... })
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--amika-white)' }}>
      <header className="bg-gradient-to-r p-6" style={{ background: `linear-gradient(135deg, var(--amika-orange), var(--amika-pink))` }}>
        <h1 className="text-3xl font-bold text-white">AskAmika</h1>
        <p className="text-white/80">C-Level Decision Support</p>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg max-w-2xl ${
                msg.role === 'user'
                  ? 'ml-auto'
                  : 'mr-auto'
              }`}
              style={{
                backgroundColor: msg.role === 'user' ? 'var(--amika-orange)' : 'var(--amika-gray-light)',
                color: msg.role === 'user' ? 'white' : 'black'
              }}
            >
              {msg.content}
            </div>
          ))}
        </div>
      </main>

      <footer className="p-6 border-t" style={{ borderColor: 'var(--amika-gray-light)' }}>
        <QuestionInput onSubmit={handleQuestionSubmit} isLoading={isLoading} />
      </footer>
    </div>
  )
}
```

- [ ] **Step 4: Update home page**

Replace `src/app/page.tsx`:
```typescript
'use client'

import { useIsAuthenticated } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'
import Login from '@/components/Login'

export default function Home() {
  const isAuthenticated = useIsAuthenticated()
  const router = useRouter()

  if (!isAuthenticated) {
    return <Login />
  }

  return <ChatInterface />
}
```

- [ ] **Step 5: Create placeholder Login component**

Create `src/components/Login.tsx`:
```typescript
'use client'

import { useMsal } from '@azure/msal-react'
import { msalConfig, loginRequest } from '@/lib/auth'

export default function Login() {
  const { instance } = useMsal()

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--amika-white)' }}>
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--amika-orange)' }}>
          AskAmika
        </h1>
        <p className="text-lg mb-8" style={{ color: 'var(--amika-gray-text)' }}>
          Sign in with your company account
        </p>
        <button
          onClick={handleLogin}
          className="btn-primary"
        >
          Sign In
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components src/lib/types.ts src/app/page.tsx
git commit -m "feat: build chat interface with question input and message display"
```

---

### Task 4: Question Analysis Service (Haiku Classification)

**Files:**
- Create: `src/lib/mcp/analyzer.ts`
- Create: `tests/lib/mcp/analyzer.test.ts`

- [ ] **Step 1: Write failing tests for question analysis**

Create `tests/lib/mcp/analyzer.test.ts`:
```typescript
import { analyzeQuestion } from '@/lib/mcp/analyzer'

describe('Question Analyzer', () => {
  test('should classify business question', async () => {
    const result = await analyzeQuestion('How many units of Product X did we sell to Customer Y this quarter?')
    expect(result.isBusinessContext).toBe(true)
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  test('should classify general question', async () => {
    const result = await analyzeQuestion('What is quantum computing?')
    expect(result.isBusinessContext).toBe(false)
  })

  test('should extract entities from business question', async () => {
    const result = await analyzeQuestion('What is our revenue from ACME Corp in Q3?')
    expect(result.entities).toContain('ACME Corp')
    expect(result.entities).toContain('revenue')
    expect(result.entities).toContain('Q3')
  })
})
```

> Note: `fabricQuery` extraction is deferred along with Fabric MCP. The `isBusinessContext` flag is preserved (logged but not branched on) so it can drive Fabric routing once the connector ships.

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/mcp/analyzer.test.ts
```

Expected: FAIL - "analyzeQuestion is not defined"

- [ ] **Step 3: Implement question analyzer**

Create `src/lib/mcp/analyzer.ts`:
```typescript
import { Anthropic } from '@anthropic-ai/sdk'
import { QuestionAnalysis } from '@/lib/types'

const client = new Anthropic()

const ANALYSIS_PROMPT = `You are a question classifier. Analyze the following question and determine:
1. Is it about business/company data? (yes/no)
2. Confidence level (0-1)
3. Key entities mentioned (list)

Respond in JSON format:
{
  "isBusinessContext": boolean,
  "confidence": number,
  "entities": ["entity1", "entity2"]
}

Question: {question}`

export async function analyzeQuestion(question: string): Promise<QuestionAnalysis> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: ANALYSIS_PROMPT.replace('{question}', question)
      }
    ]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const analysis = JSON.parse(content.text)
  
  return {
    isBusinessContext: analysis.isBusinessContext,
    confidence: analysis.confidence,
    entities: analysis.entities || []
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/mcp/analyzer.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mcp/analyzer.ts tests/lib/mcp/analyzer.test.ts
git commit -m "feat: implement question analysis with Haiku classifier"
```

---

## Phase 3: Model Integration & Routing (Days 6-10)

### Task 5: LLM Client Abstractions

**Files:**
- Create: `src/lib/llm/clients/claude.ts`
- Create: `src/lib/llm/clients/openai.ts`
- Create: `src/lib/llm/types.ts`
- Create: `tests/lib/llm/clients/claude.test.ts`

> Gemini and Grok clients are deferred. The `LLMClient` interface allows them to be added later without changes to the router or chat API.

- [ ] **Step 1: Define LLM client interface**

Create `src/lib/llm/types.ts`:
```typescript
export interface LLMClient {
  name: string
  model: string
  capabilities: string[]
  
  stream(messages: Array<{ role: 'user' | 'assistant', content: string }>): AsyncIterable<string>
  complete(messages: Array<{ role: 'user' | 'assistant', content: string }>): Promise<string>
}

export interface ModelConfig {
  id: string
  name: string
  provider: 'anthropic' | 'openai'
  capabilities: ('analysis' | 'creative' | 'research' | 'code')[]
  rateLimit: number
}
```

- [ ] **Step 2: Write failing tests for Claude client**

Create `tests/lib/llm/clients/claude.test.ts`:
```typescript
import { ClaudeClient } from '@/lib/llm/clients/claude'

describe('Claude Client', () => {
  test('should stream response text', async () => {
    const client = new ClaudeClient('claude-sonnet-4-6')
    const messages = [{ role: 'user' as const, content: 'Say hello' }]
    
    let fullText = ''
    for await (const chunk of client.stream(messages)) {
      fullText += chunk
    }
    
    expect(fullText).toContain('hello')
  })

  test('should complete message', async () => {
    const client = new ClaudeClient('claude-sonnet-4-6')
    const messages = [{ role: 'user' as const, content: 'Count to 3' }]
    
    const response = await client.complete(messages)
    expect(response).toContain('1')
  })
})
```

- [ ] **Step 3: Implement Claude client**

Create `src/lib/llm/clients/claude.ts`:
```typescript
import { Anthropic } from '@anthropic-ai/sdk'
import { LLMClient } from '../types'

export class ClaudeClient implements LLMClient {
  name = 'Claude'
  model: string
  capabilities = ['analysis', 'creative', 'research', 'code']
  
  private client: Anthropic

  constructor(model: string) {
    this.model = model
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
  }

  async *stream(messages: Array<{ role: 'user' | 'assistant', content: string }>) {
    const stream = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages,
      stream: true
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }
    }
  }

  async complete(messages: Array<{ role: 'user' | 'assistant', content: string }>): Promise<string> {
    let fullText = ''
    for await (const chunk of this.stream(messages)) {
      fullText += chunk
    }
    return fullText
  }
}
```

- [ ] **Step 4: Implement OpenAI client**

Create `src/lib/llm/clients/openai.ts`:
```typescript
import OpenAI from 'openai'
import { LLMClient } from '../types'

export class OpenAIClient implements LLMClient {
  name = 'OpenAI'
  model: string
  capabilities = ['analysis', 'creative', 'research', 'code']
  
  private client: OpenAI

  constructor(model: string) {
    this.model = model
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async *stream(messages: Array<{ role: 'user' | 'assistant', content: string }>) {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      max_tokens: 4096
    })

    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        yield chunk.choices[0].delta.content
      }
    }
  }

  async complete(messages: Array<{ role: 'user' | 'assistant', content: string }>): Promise<string> {
    let fullText = ''
    for await (const chunk of this.stream(messages)) {
      fullText += chunk
    }
    return fullText
  }
}
```

- [ ] **Step 5: Run tests**

```bash
npm test -- tests/lib/llm/clients/claude.test.ts
```

Expected: PASS (with valid API key)

- [ ] **Step 6: Commit**

```bash
git add src/lib/llm/clients tests/lib/llm/clients
git commit -m "feat: implement Claude and OpenAI LLM client abstractions"
```

---

### Task 6: Model Routing Logic

**Files:**
- Create: `src/lib/llm/router.ts`
- Create: `src/lib/constants.ts`
- Create: `tests/lib/llm/router.test.ts`

- [ ] **Step 1: Define model configuration**

Create `src/lib/constants.ts`:
```typescript
export const MODELS = [
  {
    id: 'claude-opus',
    name: 'Claude Opus',
    provider: 'anthropic' as const,
    model: 'claude-opus-4-7',
    capabilities: ['analysis', 'complex-reasoning', 'code'] as const,
    speed: 'slow',
    cost: 'high'
  },
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet',
    provider: 'anthropic' as const,
    model: 'claude-sonnet-4-6',
    capabilities: ['analysis', 'balanced', 'code'] as const,
    speed: 'medium',
    cost: 'medium'
  },
  {
    id: 'claude-haiku',
    name: 'Claude Haiku',
    provider: 'anthropic' as const,
    model: 'claude-haiku-4-5-20251001',
    capabilities: ['fast', 'classification'] as const,
    speed: 'very-fast',
    cost: 'low'
  },
  {
    id: 'openai-flagship',
    name: 'OpenAI Flagship',
    provider: 'openai' as const,
    model: 'TODO-confirm-current-openai-model-id',  // TODO: confirm current OpenAI model ID at implementation time
    capabilities: ['analysis', 'multimodal', 'code'] as const,
    speed: 'medium',
    cost: 'high'
  }
]

// Future milestone: Gemini and Grok will be added when API keys are provisioned. The LLMClient interface supports them.

export const AMIKA_COLORS = {
  orange: '#FF6B26',
  orangeBright: '#FF7A00',
  pink: '#FB63C0',
  hotPink: '#EC008C',
  yellow: '#FFBF00',
  blue: '#38B6FF',
  lime: '#C9E167',
  coral: '#FF5555',
  black: '#000000',
  white: '#FFFFFF',
  grayLight: '#DDDDDD',
  grayText: '#6A6A6A'
}
```

- [ ] **Step 2: Write failing tests for router**

Create `tests/lib/llm/router.test.ts`:
```typescript
import { selectBestModel } from '@/lib/llm/router'

describe('Model Router', () => {
  test('should select Opus for complex analysis', () => {
    const model = selectBestModel({
      isBusinessContext: true,
      confidence: 0.9,
      entities: ['revenue', 'customer', 'quarterly analysis']
    }, {})
    
    expect(model.id).toBe('claude-opus')
  })

  test('should select Haiku for simple general questions', () => {
    const model = selectBestModel({
      isBusinessContext: false,
      confidence: 0.95,
      entities: []
    }, {})
    
    expect(['claude-haiku', 'openai-flagship']).toContain(model.id)
  })

  test('should respect user override', () => {
    const model = selectBestModel({
      isBusinessContext: true,
      confidence: 0.9,
      entities: ['revenue']
    }, { overrideModelId: 'claude-sonnet' })
    
    expect(model.id).toBe('claude-sonnet')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- tests/lib/llm/router.test.ts
```

Expected: FAIL - "selectBestModel is not defined"

- [ ] **Step 4: Implement router**

Create `src/lib/llm/router.ts`:
```typescript
import { MODELS } from '@/lib/constants'
import { QuestionAnalysis } from '@/lib/types'

export interface RoutingContext {
  overrideModelId?: string
}

export function selectBestModel(analysis: QuestionAnalysis, context: RoutingContext) {
  // If user overrides, respect it
  if (context.overrideModelId) {
    const model = MODELS.find(m => m.id === context.overrideModelId)
    if (model) return model
  }

  // Score models based on question characteristics
  let scores: Record<string, number> = {}
  
  MODELS.forEach(model => {
    scores[model.id] = 0
    
    // Bonus for confidence
    scores[model.id] += analysis.confidence * 10
    
    // Business context routing
    if (analysis.isBusinessContext) {
      if (model.capabilities.includes('analysis')) {
        scores[model.id] += 5
      }
      if (analysis.entities.length > 3) {
        // Complex business question -> Opus
        if (model.id === 'claude-opus') scores[model.id] += 8
      } else {
        // Simple business question -> Sonnet
        if (model.id === 'claude-sonnet') scores[model.id] += 7
      }
    } else {
      // General knowledge
      if (model.speed === 'fast' || model.speed === 'very-fast') {
        scores[model.id] += 4
      }
      if (model.capabilities.includes('creative')) {
        scores[model.id] += 3
      }
    }
  })

  // Return highest scoring model
  const selected = Object.entries(scores).sort(([, a], [, b]) => b - a)[0]
  return MODELS.find(m => m.id === selected[0])!
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- tests/lib/llm/router.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/llm/router.ts src/lib/constants.ts tests/lib/llm/router.test.ts
git commit -m "feat: implement intelligent model routing with configurable selection logic"
```

---

### Task 7: Chat API Route with Streaming

**Files:**
- Create: `src/app/api/chat/route.ts`
- Modify: `src/components/ChatInterface.tsx`

- [ ] **Step 1: Create chat API route**

Create `src/app/api/chat/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { analyzeQuestion } from '@/lib/mcp/analyzer'
import { selectBestModel } from '@/lib/llm/router'
import { MODELS } from '@/lib/constants'
import { ClaudeClient } from '@/lib/llm/clients/claude'
import { OpenAIClient } from '@/lib/llm/clients/openai'

export async function POST(request: NextRequest) {
  const { question, overrideModelId } = await request.json()

  if (!question) {
    return NextResponse.json({ error: 'No question provided' }, { status: 400 })
  }

  try {
    // Step 1: Analyze question (logs isBusinessContext for future Fabric routing)
    const analysis = await analyzeQuestion(question)
    console.log('Question analysis:', analysis)

    // Step 2: Select best model
    const selectedModel = selectBestModel(analysis, { overrideModelId })

    // Step 3: Get appropriate LLM client
    let client
    if (selectedModel.provider === 'anthropic') {
      client = new ClaudeClient(selectedModel.model)
    } else if (selectedModel.provider === 'openai') {
      client = new OpenAIClient(selectedModel.model)
    } else {
      return NextResponse.json({ error: 'Model not supported' }, { status: 400 })
    }

    // Step 4: Stream response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of client.stream([
            { role: 'user', content: question }
          ])) {
            controller.enqueue(encoder.encode(chunk))
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Update ChatInterface to use streaming API**

Modify `src/components/ChatInterface.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Message } from '@/lib/types'
import QuestionInput from './QuestionInput'

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleQuestionSubmit = async (question: string) => {
    setIsLoading(true)
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])

    // Stream response
    const assistantId = (Date.now() + 1).toString()
    let assistantContent = ''

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let messageAdded = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        assistantContent += chunk

        // Add/update assistant message in UI
        if (!messageAdded) {
          const assistantMessage: Message = {
            id: assistantId,
            role: 'assistant',
            content: assistantContent,
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, assistantMessage])
          messageAdded = true
        } else {
          // Update existing message
          setMessages(prev => prev.map(m => 
            m.id === assistantId ? { ...m, content: assistantContent } : m
          ))
        }
      }
    } catch (error) {
      console.error('Failed to get response:', error)
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: 'Error: Failed to get response. Please try again.',
        timestamp: new Date(),
      }])
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--amika-white)' }}>
      <header className="bg-gradient-to-r p-6" style={{ background: `linear-gradient(135deg, var(--amika-orange), var(--amika-pink))` }}>
        <h1 className="text-3xl font-bold text-white">AskAmika</h1>
        <p className="text-white/80">C-Level Decision Support</p>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg max-w-2xl ${
                msg.role === 'user'
                  ? 'ml-auto'
                  : 'mr-auto'
              }`}
              style={{
                backgroundColor: msg.role === 'user' ? 'var(--amika-orange)' : 'var(--amika-gray-light)',
                color: msg.role === 'user' ? 'white' : 'black'
              }}
            >
              {msg.content}
            </div>
          ))}
        </div>
      </main>

      <footer className="p-6 border-t" style={{ borderColor: 'var(--amika-gray-light)' }}>
        <QuestionInput onSubmit={handleQuestionSubmit} isLoading={isLoading} />
      </footer>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat src/components/ChatInterface.tsx
git commit -m "feat: implement streaming chat API with intelligent model routing"
```

---

## Phase 4: Advanced Features (Days 11-15)

### Task 8: Artifact Detection & Rendering

**Files:**
- Create: `src/lib/artifacts/detector.ts`
- Create: `src/lib/artifacts/generator.ts`
- Create: `src/components/ArtifactPanel.tsx`
- Create: `tests/lib/artifacts/detector.test.ts`

- [ ] **Step 1: Write artifact detector tests**

Create `tests/lib/artifacts/detector.test.ts`:
```typescript
import { detectArtifacts } from '@/lib/artifacts/detector'

describe('Artifact Detector', () => {
  test('detects substantial fenced code blocks', () => {
    const text = "Here's the code:\n```python\ndef greet(name):\n    print(f\"Hello, {name}\")\n    return True\n```"
    const artifacts = detectArtifacts(text)
    expect(artifacts).toHaveLength(1)
    expect(artifacts[0].type).toBe('code')
    expect(artifacts[0].language).toBe('python')
  })

  test('skips trivial one-line code blocks', () => {
    const text = "Run this:\n```bash\nls\n```"
    expect(detectArtifacts(text)).toEqual([])
  })

  test('detects fenced JSON as data even if short', () => {
    const text = 'Here is the data:\n```json\n{"name": "John"}\n```'
    const artifacts = detectArtifacts(text)
    expect(artifacts).toHaveLength(1)
    expect(artifacts[0].type).toBe('data')
  })

  test('does NOT extract a multi-heading prose response as a document', () => {
    const text = '# Report\n## Section 1\nContent here\n## Section 2\nMore content'
    expect(detectArtifacts(text)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/lib/artifacts/detector.test.ts
```

- [ ] **Step 3: Implement artifact detector**

Create `src/lib/artifacts/detector.ts`:
```typescript
import { Artifact } from '@/lib/types'

const DATA_LANGUAGES = new Set(['json', 'csv', 'yaml', 'yml', 'toml', 'xml'])

const FENCE_REGEX = /```(\w+)?\n([\s\S]*?)\n```/g
const TABLE_REGEX = /^(\|.+\|\n\|[-:|\s]+\|(?:\n\|.+\|)+)/m

const MIN_CODE_LINES = 3
const MIN_CODE_CHARS = 80
const MIN_TABLE_DATA_ROWS = 2

function isSubstantialBlock(content: string): boolean {
  const trimmed = content.trim()
  const lineCount = trimmed.split('\n').length
  return lineCount >= MIN_CODE_LINES || trimmed.length >= MIN_CODE_CHARS
}

function tableDataRowCount(table: string): number {
  // total rows minus 2 (header + separator)
  return table.trim().split('\n').length - 2
}

export function detectArtifacts(text: string): Artifact[] {
  const artifacts: Artifact[] = []

  let match: RegExpExecArray | null
  while ((match = FENCE_REGEX.exec(text)) !== null) {
    const [, rawLang, content] = match
    const language = rawLang || 'text'
    const isData = DATA_LANGUAGES.has(language.toLowerCase())

    // Always extract structured data (JSON/CSV/etc), even if short.
    // For code, only extract if it's substantial enough to warrant a side panel.
    if (!isData && !isSubstantialBlock(content)) continue

    artifacts.push({
      id: `${isData ? 'data' : 'code'}-${artifacts.length}`,
      type: isData ? 'data' : 'code',
      language,
      content: content.trim(),
      title: isData ? 'Structured Data' : `${language} Block`,
    })
  }

  const tableMatch = text.match(TABLE_REGEX)
  if (tableMatch && tableDataRowCount(tableMatch[1]) >= MIN_TABLE_DATA_ROWS) {
    artifacts.push({
      id: `table-${artifacts.length}`,
      type: 'data',
      content: tableMatch[1].trim(),
      title: 'Data Table',
    })
  }

  return artifacts
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/artifacts/detector.test.ts
```

- [ ] **Step 5: Implement artifact renderer**

Create `src/lib/artifacts/generator.ts`:
```typescript
import { Artifact } from '@/lib/types'

export function generateArtifactHTML(artifact: Artifact): string {
  switch (artifact.type) {
    case 'code':
      return generateCodeHTML(artifact)
    case 'data':
      return generateDataHTML(artifact)
    case 'document':
      return generateDocumentHTML(artifact)
    default:
      return `<pre>${artifact.content}</pre>`
  }
}

function generateCodeHTML(artifact: Artifact): string {
  return `
    <div class="artifact-code">
      <div class="artifact-header">
        <span class="language-badge">${artifact.language}</span>
        <button class="copy-btn">Copy</button>
      </div>
      <pre><code class="language-${artifact.language}">${escapeHtml(artifact.content)}</code></pre>
    </div>
  `
}

function generateDataHTML(artifact: Artifact): string {
  return `
    <div class="artifact-data">
      <pre><code>${escapeHtml(artifact.content)}</code></pre>
    </div>
  `
}

function generateDocumentHTML(artifact: Artifact): string {
  return `
    <div class="artifact-document">
      <div class="document-content">${artifact.content}</div>
    </div>
  `
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
```

- [ ] **Step 6: Create ArtifactPanel component**

Create `src/components/ArtifactPanel.tsx`:
```typescript
'use client'

import { Artifact } from '@/lib/types'
import { generateArtifactHTML } from '@/lib/artifacts/generator'

interface ArtifactPanelProps {
  artifacts: Artifact[]
  isOpen: boolean
  onClose: () => void
}

export default function ArtifactPanel({ artifacts, isOpen, onClose }: ArtifactPanelProps) {
  if (!isOpen || artifacts.length === 0) return null

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="fixed right-0 top-0 h-screen w-2/5 bg-white shadow-lg overflow-y-auto z-50">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold">Artifacts</h2>
        <button onClick={onClose} className="text-2xl">&times;</button>
      </div>

      <div className="p-4 space-y-4">
        {artifacts.map(artifact => (
          <div key={artifact.id} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">{artifact.title}</h3>
            <div 
              className="bg-gray-100 rounded p-2 text-sm overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: generateArtifactHTML(artifact) }}
            />
            <button
              onClick={() => handleCopy(artifact.content)}
              className="mt-2 text-sm px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--amika-orange)', color: 'white' }}
            >
              Copy
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/artifacts src/components/ArtifactPanel.tsx tests/lib/artifacts
git commit -m "feat: implement artifact detection and rendering system"
```

---

### Task 9: Council Feature (3 Models + Orchestrator)

**Files:**
- Create: `src/app/api/council/route.ts`
- Create: `src/lib/llm/orchestrator.ts`
- Create: `src/components/CouncilView.tsx`
- Create: `src/components/OrchestratorSummary.tsx`
- Modify: `src/components/ChatInterface.tsx`

- [ ] **Step 1: Create council API route**

Create `src/app/api/council/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { analyzeQuestion } from '@/lib/mcp/analyzer'
import { selectBestModel } from '@/lib/llm/router'
import { MODELS } from '@/lib/constants'
import { ClaudeClient } from '@/lib/llm/clients/claude'
import { OpenAIClient } from '@/lib/llm/clients/openai'
import { synthesizeResponses } from '@/lib/llm/orchestrator'

export async function POST(request: NextRequest) {
  const { question, modelIds } = await request.json()

  if (!question) {
    return NextResponse.json({ error: 'No question provided' }, { status: 400 })
  }

  try {
    // Get 3+ models (user-specified or auto-selected)
    const selectedModelIds = modelIds || [
      'claude-opus',
      'claude-sonnet',
      'openai-flagship'
    ]

    const selectedModels = MODELS.filter(m => selectedModelIds.includes(m.id))
    if (selectedModels.length < 3) {
      return NextResponse.json({ error: 'Need at least 3 models' }, { status: 400 })
    }

    // Get clients for each model
    const responses: string[] = []

    for (const model of selectedModels) {
      let client
      if (model.provider === 'anthropic') {
        client = new ClaudeClient(model.model)
      } else if (model.provider === 'openai') {
        client = new OpenAIClient(model.model)
      } else {
        continue
      }

      let response = ''
      for await (const chunk of client.stream([
        { role: 'user', content: question }
      ])) {
        response += chunk
      }
      responses.push(response)
    }

    // Get orchestrator summary
    const orchestratorClient = new ClaudeClient('claude-opus-4-7')
    const summaryPrompt = `You are synthesizing responses from 3 different AI models. Your task is to:
1. Identify key points of agreement
2. Highlight important disagreements
3. Extract the most valuable insights
4. Provide a recommendation if applicable

Model 1 Response:\n${responses[0]}\n\nModel 2 Response:\n${responses[1]}\n\nModel 3 Response:\n${responses[2]}\n\nProvide a concise synthesis.`

    let summary = ''
    for await (const chunk of orchestratorClient.stream([
      { role: 'user', content: summaryPrompt }
    ])) {
      summary += chunk
    }

    return NextResponse.json({
      responses: selectedModels.map((m, i) => ({
        model: m.name,
        response: responses[i]
      })),
      orchestratorSummary: summary
    })
  } catch (error) {
    console.error('Council error:', error)
    return NextResponse.json(
      { error: 'Failed to get council responses' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Create orchestrator synthesis logic**

Create `src/lib/llm/orchestrator.ts`:
```typescript
export interface CouncilSynthesis {
  agreements: string[]
  disagreements: string[]
  keyInsights: string[]
  recommendation?: string
}

export async function synthesizeResponses(
  responses: string[],
  question: string
): Promise<CouncilSynthesis> {
  // Parse responses to extract key points
  // This is a simplified version - in production, use Claude to extract structured data
  
  return {
    agreements: [],
    disagreements: [],
    keyInsights: responses.map(r => r.substring(0, 100) + '...'),
    recommendation: responses[0].substring(0, 50)
  }
}
```

- [ ] **Step 3: Create CouncilView component**

Create `src/components/CouncilView.tsx`:
```typescript
'use client'

import { useState } from 'react'
import OrchestratorSummary from './OrchestratorSummary'

interface CouncilViewProps {
  question: string
  isVisible: boolean
}

export default function CouncilView({ question, isVisible }: CouncilViewProps) {
  const [councilData, setCouncilData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerateCouncil = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          modelIds: ['claude-opus', 'claude-sonnet', 'openai-flagship']
        })
      })

      const data = await response.json()
      setCouncilData(data)
    } catch (error) {
      console.error('Failed to generate council:', error)
    }
    setIsLoading(false)
  }

  if (!isVisible) return null

  return (
    <div className="mt-6 p-4 border-t" style={{ borderColor: 'var(--amika-gray-light)' }}>
      <h2 className="text-2xl font-bold mb-4">Council</h2>

      {!councilData ? (
        <button
          onClick={handleGenerateCouncil}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Generating Council...' : 'Get Council Perspective'}
        </button>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {councilData.responses.map((r: any, i: number) => (
              <div key={i} className="border rounded-lg p-4">
                <h3 className="font-bold mb-2">{r.model}</h3>
                <div className="text-sm bg-gray-100 p-2 rounded max-h-64 overflow-y-auto">
                  {r.response}
                </div>
              </div>
            ))}
          </div>

          <OrchestratorSummary summary={councilData.orchestratorSummary} />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create OrchestratorSummary component**

Create `src/components/OrchestratorSummary.tsx`:
```typescript
'use client'

interface OrchestratorSummaryProps {
  summary: string
}

export default function OrchestratorSummary({ summary }: OrchestratorSummaryProps) {
  return (
    <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--amika-orange)', color: 'white' }}>
      <h3 className="text-xl font-bold mb-3">Orchestrator Synthesis</h3>
      <p className="leading-relaxed">{summary}</p>
    </div>
  )
}
```

- [ ] **Step 5: Add Council button to ChatInterface**

Modify `src/components/ChatInterface.tsx` to include Council toggle:
```typescript
// Add state for council visibility
const [showCouncil, setShowCouncil] = useState(false)

// Add button in main content:
<div className="flex gap-2 mb-4">
  <button
    onClick={() => setShowCouncil(!showCouncil)}
    className="btn-primary"
  >
    {showCouncil ? 'Hide Council' : 'Show Council'}
  </button>
</div>

// Add CouncilView before footer:
{showCouncil && messages.length > 0 && (
  <CouncilView 
    question={messages[messages.length - 1].content}
    isVisible={true}
  />
)}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/council src/lib/llm/orchestrator.ts src/components/Council*.tsx
git commit -m "feat: implement Council feature with 3-model comparison and orchestrator synthesis"
```

---

### Task 10: localStorage Session History

> Cosmos DB persistence is a follow-up milestone. localStorage is sufficient for the solo internal pilot. The `SessionDocument` schema below is identical to what Cosmos will use, so the future swap is a one-file change in `src/lib/storage/sessions.ts`.

**Files:**
- Create: `src/lib/storage/sessions.ts`
- Create: `src/lib/storage/schemas.ts`
- Create: `tests/lib/storage/sessions.test.ts`
- Modify: `src/components/ChatInterface.tsx`

- [ ] **Step 1: Define session schemas**

Create `src/lib/storage/schemas.ts`:
```typescript
export interface SessionDocument {
  id: string
  userId: string
  title: string
  messages: MessageDocument[]
  createdAt: string
  updatedAt: string
  metadata: {
    modelUsed: string
    questionsAsked: number
  }
}

export interface MessageDocument {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  model?: string
  artifacts?: ArtifactDocument[]
}

export interface ArtifactDocument {
  id: string
  type: 'code' | 'document' | 'data' | 'visual'
  language?: string
  content: string
  title?: string
}

export function createSessionDocument(userId: string, title: string = 'New Chat'): SessionDocument {
  const now = new Date().toISOString()
  return {
    id: `session-${Date.now()}`,
    userId,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
    metadata: {
      modelUsed: '',
      questionsAsked: 0
    }
  }
}
```

- [ ] **Step 2: Write failing tests for localStorage session store**

Create `tests/lib/storage/sessions.test.ts`:
```typescript
import { saveSession, getSession, listSessions } from '@/lib/storage/sessions'
import { createSessionDocument } from '@/lib/storage/schemas'

beforeEach(() => {
  localStorage.clear()
})

describe('localStorage session store', () => {
  test('should save and retrieve a session by id', () => {
    const session = createSessionDocument('user-1', 'Test session')
    saveSession(session)
    expect(getSession(session.id)).toEqual(session)
  })

  test('should list all sessions for a user', () => {
    const a = createSessionDocument('user-1', 'A')
    const b = createSessionDocument('user-1', 'B')
    const c = createSessionDocument('user-2', 'C')
    saveSession(a); saveSession(b); saveSession(c)
    const list = listSessions('user-1')
    expect(list).toHaveLength(2)
  })
})
```

- [ ] **Step 3: Implement localStorage session store**

Create `src/lib/storage/sessions.ts`:
```typescript
import { SessionDocument } from './schemas'

const KEY_PREFIX = 'askamika.session.'

export function saveSession(session: SessionDocument): void {
  session.updatedAt = new Date().toISOString()
  localStorage.setItem(KEY_PREFIX + session.id, JSON.stringify(session))
}

export function getSession(sessionId: string): SessionDocument | null {
  const raw = localStorage.getItem(KEY_PREFIX + sessionId)
  return raw ? (JSON.parse(raw) as SessionDocument) : null
}

export function listSessions(userId: string): SessionDocument[] {
  const sessions: SessionDocument[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(KEY_PREFIX)) continue
    const raw = localStorage.getItem(key)
    if (!raw) continue
    const session = JSON.parse(raw) as SessionDocument
    if (session.userId === userId) sessions.push(session)
  }
  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function deleteSession(sessionId: string): void {
  localStorage.removeItem(KEY_PREFIX + sessionId)
}
```

- [ ] **Step 4: Wire ChatInterface to persist sessions**

Modify `src/components/ChatInterface.tsx`:
```typescript
import { useEffect, useState } from 'react'
import { saveSession } from '@/lib/storage/sessions'
import { createSessionDocument, SessionDocument } from '@/lib/storage/schemas'

const [session, setSession] = useState<SessionDocument | null>(null)

useEffect(() => {
  // Replace 'pilot-user' with the authenticated user's id once auth is wired in
  setSession(createSessionDocument('pilot-user'))
}, [])

useEffect(() => {
  if (!session) return
  saveSession({
    ...session,
    messages: messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
      model: m.model
    }))
  })
}, [messages, session])
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage src/components/ChatInterface.tsx tests/lib/storage
git commit -m "feat: add localStorage session history (Cosmos swap-in later)"
```

---

## Phase 5: Testing & Deployment (Days 16-21)

### Task 11: Integration Tests & Error Handling

- [ ] **Step 1: Write end-to-end chat flow test**

Create `tests/integration/chat-flow.test.ts`:
```typescript
import { analyzeQuestion } from '@/lib/mcp/analyzer'
import { selectBestModel } from '@/lib/llm/router'
import { detectArtifacts } from '@/lib/artifacts/detector'

describe('Full Chat Flow', () => {
  test('should handle complete business question flow', async () => {
    const question = 'How many units of Product A did we sell to Client B in Q3?'
    
    // Analyze
    const analysis = await analyzeQuestion(question)
    expect(analysis.isBusinessContext).toBe(true)
    
    // Route
    const model = selectBestModel(analysis, {})
    expect(model).toBeDefined()
    
    // Response would be streamed from model
    // then artifacts would be detected
  })
})
```

- [ ] **Step 2: Write error scenario tests**

```typescript
describe('Error Handling', () => {
  test('should handle model timeout', async () => {
    // Test timeout handling
  })

  test('should handle auth failures', async () => {
    // Test auth error handling
  })
})
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

- [ ] **Step 4: Commit**

```bash
git add tests/integration
git commit -m "test: add comprehensive integration and error scenario tests"
```

---

### Task 12: Azure Deployment Setup

**Files:**
- Create: `azure-deploy.yml` (GitHub Actions)
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Create Dockerfile**

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

- [ ] **Step 2: Create GitHub Actions deploy workflow**

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t askamika:latest .
      
      - name: Deploy to Azure
        env:
          AZURE_APP_NAME: askamika
        run: |
          az containerapp up \
            --name $AZURE_APP_NAME \
            --resource-group AskAmikaRG \
            --image askamika:latest
```

- [ ] **Step 3: Create Azure Key Vault configuration**

Create `.github/workflows/keyvault-setup.md`:
```markdown
# Azure Key Vault Setup

1. Create Key Vault:
   az keyvault create --name AskAmikaKV --resource-group AskAmikaRG

2. Add secrets:
   az keyvault secret set --vault-name AskAmikaKV --name ANTHROPIC-API-KEY --value <key>
   az keyvault secret set --vault-name AskAmikaKV --name OPENAI-API-KEY --value <key>
   az keyvault secret set --vault-name AskAmikaKV --name GOOGLE-API-KEY --value <key>
   az keyvault secret set --vault-name AskAmikaKV --name COSMOS-KEY --value <key>

3. Configure App Service to access Key Vault with Managed Identity
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .github/workflows/deploy.yml .dockerignore
git commit -m "feat: add Docker configuration and Azure deployment pipeline"
```

---

### Task 13: Final Integration & Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
npm run build
```

- [ ] **Step 2: Deploy to staging**

```bash
npm run deploy:staging
```

- [ ] **Step 3: Smoke tests in staging**

- Verify Entra ID login works
- Submit test question
- Check response streaming
- Verify artifacts generate
- Check Council feature works

- [ ] **Step 4: Deploy to production**

```bash
git push origin main
# GitHub Actions automatically deploys
```

- [ ] **Step 5: Final commit**

```bash
git commit --allow-empty -m "docs: AskAmika MVP complete - ready for production"
```

---

## Success Criteria Checklist

- [ ] Users can login via Entra ID
- [ ] Questions are analyzed and routed to best model
- [ ] Responses stream in real-time (<5 sec)
- [ ] Artifacts auto-generate for code/documents
- [ ] Council feature shows 3 models + orchestrator
- [ ] Session history persists in localStorage (Cosmos DB swap-in is a follow-up milestone)
- [ ] Error handling graceful with user messaging
- [ ] All tests passing
- [ ] Deployed to Azure App Service
- [ ] Performance baseline established
- [ ] C-Level pilot user testing passed

---

## Notes for Implementation

- **Model fallback chains:** If primary model fails, automatically retry with backup model
- **Rate limiting:** Implement exponential backoff for API calls
- **Caching:** When Fabric is wired in (follow-up milestone), cache queries with a 5 min TTL to avoid redundant data calls
- **Analytics:** Log all questions + model selections for future optimization
- **Security:** Never log full responses or API keys, validate all user input
- **Monitoring:** Set up Azure Application Insights for performance tracking
```

Now let me commit this plan to git and prepare for execution:

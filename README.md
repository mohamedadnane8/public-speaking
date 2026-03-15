# Impromptu Speaking App

A minimalist impromptu speaking training app designed with an editorial, high-whitespace aesthetic. Practice structured speaking with timed thinking and speaking phases, self-reflection, and session persistence.

> **Core Philosophy:** This is not a gamified speaking app. It is a disciplined speaking practice environment — structured, intentional, reflective, and minimal. No dashboards, no badges, no streak fireworks. Just practice → reflection → reset.

---

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite 7
- **Styling:** Tailwind CSS 3.4 + shadcn/ui components
- **Backend:** Next.js API Routes (Node.js 20)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Build

```bash
npm run build
npm run preview
```

---

## Screen Flow

1. **Home** — Select mode, view timing settings, spin for a word
2. **Word Reveal** — Display generated word, option to spin again or start
3. **Think** — Countdown timer for preparation (mode-specific duration)
4. **Speak** — Auto-recording countdown timer for speaking
5. **Session Complete (Playback)** — Review recording, continue to reflection
6. **Reflect** — Self-rate on 4-7 criteria (opening, structure, ending, confidence, etc.)
7. **Score Summary** — View overall score (0-10), start new session

---

## Modes

| Mode | Think (s) | Speak (s) | Description |
|------|-----------|-----------|-------------|
| EXPLANATION | 30 | 60 | Explain a concept clearly |
| STORY | 30 | 60 | Tell a compelling narrative |
| DEBATE | 20 | 60 | Argue a position |
| ELEVATOR | 15 | 45 | Quick pitch format |
| SPEED | 10 | 45 | Rapid thinking challenge |

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth.js authentication handlers |

### User

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/me` | Get current user profile |
| `PATCH` | `/api/me` | Update user profile |

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sessions` | List user's sessions (paginated) |
| `POST` | `/api/sessions` | Create a new session |
| `GET` | `/api/sessions/:id` | Get session details |
| `PATCH` | `/api/sessions/:id` | Update session (ratings, status, notes) |
| `DELETE` | `/api/sessions/:id` | Delete a session |

### Words

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/words/random` | Get a random word for a session |

### Audio

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sessions/:id/audio` | Upload audio recording |
| `GET` | `/api/sessions/:id/audio` | Get audio recording |
| `DELETE` | `/api/sessions/:id/audio` | Delete audio recording |

---

## Data Models

### Session

```typescript
interface Session {
  id: string;
  createdAt: string;
  completedAt?: string;

  mode: "EXPLANATION" | "STORY" | "DEBATE" | "ELEVATOR" | "SPEED";
  word: string;

  thinkSeconds: number;
  speakSeconds: number;

  status: "COMPLETED" | "CANCELLED" | "FAILED";
  cancelReason?: string;

  ratings?: {
    opening: 1 | 2 | 3 | 4 | 5;
    structure: 1 | 2 | 3 | 4 | 5;
    ending: 1 | 2 | 3 | 4 | 5;
    confidence: 1 | 2 | 3 | 4 | 5;
    clarity?: 1 | 2 | 3 | 4 | 5;
    authenticity?: 1 | 2 | 3 | 4 | 5;
    languageExpression?: 1 | 2 | 3 | 4 | 5;
  };

  overallScore?: number; // 0-10, 1 decimal
  notes?: string;

  audio?: {
    available: boolean;
    fileUri?: string;
    durationMs?: number;
  };

  transcript?: string;
}
```

---

## Score Calculation

Each rating is 1–5. Converted to 0–10 scale:

```
converted = (rating / 5) * 10
overallScore = average(converted ratings) // rounded to 1 decimal
```

**Example:**
- Opening: 4 → 8.0
- Structure: 3 → 6.0
- Ending: 5 → 10.0
- Confidence: 4 → 8.0
- **Overall: 8.0**

---

## Project Structure

```
├── app/                    # Next.js API routes
│   └── api/
│       ├── auth/          # NextAuth configuration
│       ├── me/            # User profile endpoints
│       └── sessions/      # Session CRUD endpoints
├── api/                   # Backend source
│   ├── prisma/           # Database schema
│   └── src/
├── src/
│   ├── screens/          # App screens (Home, Think, Speak, etc.)
│   ├── components/       # UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities
│   └── types/            # TypeScript definitions
├── types/                # Shared type definitions
├── tailwind.config.js    # Tailwind configuration
└── vite.config.ts        # Vite configuration
```

---

## Design Principles

- **No gamification** — No points, badges, or leaderboards
- **No dashboards** — Clean, focused interface
- **No clutter** — High whitespace, editorial aesthetic
- **One primary action per screen** — Clear, intentional flow
- **Calm experience** — Minimal distractions

---

## License

Private — All rights reserved.

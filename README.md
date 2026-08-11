# lurisa — Stage 5: Scale Polish & Export (Production Ready)

A memory-first personal intelligence built with Next.js 14, Neon PostgreSQL, Redis, and OpenAI.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 3. Push database schema
npx prisma db push

# 4. Seed demo data
npx prisma db seed

# 5. Run development server
npm run dev

# 6. (Optional) Run background workers in separate terminals
npm run worker:memory
npm run worker:notification
```

## 🏗️ Architecture Overview

### Services
- **App (`npm run dev`)**: Next.js 14 App Router, API routes, UI
- **Memory Worker (`npm run worker:memory`)**: Async memory extraction pipeline
- **Notification Worker (`npm run worker:notification`)**: Scheduled intent processing
- **Consolidation Worker (`npm run worker:consolidation`)**: Periodic memory cleanup

### Database (Neon PostgreSQL)
- Serverless connection pooling via `@prisma/adapter-neon`
- pgvector extension for embeddings (Stage 2+)
- All tables sharded by `user_id` for horizontal scaling

### Cache (Redis)
- Session management
- Rate limiting (sliding window)
- Notification budget tracking
- Context assembly caching
- Edge caching for API responses

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login, Register
│   ├── (dashboard)/              # Chat, Memories, Goals, Timeline, Insights, Notifications, Settings
│   ├── admin/                    # Admin dashboard
│   ├── api/                      # API routes
│   │   ├── auth/                 # NextAuth
│   │   ├── chat/                 # Chat + Streaming
│   │   ├── memories/             # CRUD
│   │   ├── goals/                # CRUD
│   │   ├── timeline/             # Read
│   │   ├── insights/             # Generate + Read
│   │   ├── notifications/        # Read + Manage
│   │   ├── user/                 # Profile, Export, Delete
│   │   ├── admin/                # Stats, Users
│   │   ├── health/               # Health check
│   │   └── metrics/              # Prometheus metrics
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                       # Primitive components
│   ├── auth/                     # Login/Register forms
│   ├── landing/                  # Landing page
│   ├── dashboard/                # All dashboard pages
│   └── admin/                    # Admin dashboard
├── lib/
│   ├── db.ts                     # Prisma + Neon pooling
│   ├── redis.ts                  # Redis client + helpers
│   ├── cache.ts                  # Edge caching layer
│   ├── auth.ts                   # NextAuth config
│   ├── encryption.ts             # Per-user encryption
│   ├── rate-limit.ts             # Rate limiting
│   ├── audit.ts                  # Audit logging
│   ├── validation.ts             # Zod schemas
│   ├── llm/                      # LLM Gateway
│   │   ├── gateway.ts
│   │   ├── prompts.ts
│   │   └── guardrails.ts
│   └── ai/                       # AI Services
│       ├── context-assembly.ts
│       ├── memory-service.ts
│       └── follow-up-engine.ts
├── workers/
│   ├── memory-worker.ts
│   ├── notification-worker.ts
│   └── consolidation-worker.ts
├── monitoring/
│   └── health-check.ts
└── middleware.ts                 # Security headers + rate limiting
```

## 🔐 Security Features

- Short-lived JWT tokens (15 min) + rotating refresh tokens
- Device trust model with new device detection
- Per-user data encryption with envelope encryption
- Rate limiting on all endpoints (auth, API, chat)
- Suspicious activity detection + IP blocking
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- Input validation with Zod on all APIs
- Strict user_id scoping on all data queries
- Audit logging for all sensitive operations

## 📊 Monitoring

- **Health Check**: `GET /api/health`
- **Prometheus Metrics**: `GET /api/metrics`
- **Admin Dashboard**: `/admin` (requires ADMIN_EMAIL)

## 🐳 Production Deployment

### Docker Compose
```bash
cp .env.example .env
# Fill in all production values
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables
```env
DATABASE_URL=postgresql://...neon.tech/lurisa?sslmode=require
DIRECT_URL=postgresql://...neon.tech/lurisa?sslmode=require
REDIS_URL=redis://redis:6379
NEXTAUTH_SECRET=your-super-secret-32-char-min
NEXTAUTH_URL=https://your-domain.com
MASTER_KEY=your-master-encryption-key-32-char-min
OPENAI_API_KEY=sk-...
ADMIN_EMAIL=admin@your-domain.com
```

## 🎯 Stage 5 Deliverables

- ✅ Neon serverless connection pooling
- ✅ Edge caching with Redis (user-scoped, tag-based invalidation)
- ✅ Admin dashboard with user analytics
- ✅ Health checks + Prometheus metrics
- ✅ Memory consolidation worker (prevents unbounded growth)
- ✅ Full dark mode implementation
- ✅ Production Docker setup (multi-stage build)
- ✅ Security hardening (headers, suspicious activity detection)
- ✅ Streaming chat responses
- ✅ GDPR/CCPA-compliant data export
- ✅ Cryptographic account deletion

## 📈 Scaling to 1000+ Users

- **Database**: Neon auto-scales; connection pooling handles bursts
- **Redis**: Caches hot context, sessions, rate limits
- **Workers**: Run independently of web tier; scale horizontally
- **Static Generation**: Landing page is fully static
- **API Caching**: 5-minute TTL on read-heavy endpoints
- **Connection Pooling**: Prisma + Neon adapter for serverless

## 🧪 Demo Credentials

- **Email**: `demo@lurisa.app`
- **Password**: `demopassword123`

---

Built with care. lurisa exists to remember what matters.

# EDGAR Answer Engine

**Intelligent natural language interface for SEC EDGAR filings with evidence-grounded citations**

[![Status](https://img.shields.io/badge/Status-In%20Development-yellow)]()
[![License](https://img.shields.io/badge/License-MIT-blue)]()
[![Node](https://img.shields.io/badge/Node-20+-green)]()

## 🎯 Overview

EDGAR Answer Engine is a cloud-hosted web application that enables users to ask natural language questions about SEC EDGAR filings and receive accurate, citation-backed answers. Built with Next.js and powered by LLMs with a tool-first architecture, it provides instant access to complex financial data without mirroring SEC databases.

### Key Features

- **🔍 Natural Language Queries**: Ask questions in plain English about any SEC filing
- **📊 Evidence-Grounded Answers**: Every response includes direct citations to source documents
- **⚡ Real-Time Processing**: Streaming responses with progressive loading of results
- **🏢 Company Intelligence**: Automatic company resolution and filing history
- **📈 Multi-Form Support**: Works with 10-K, 10-Q, 8-K, S-1, 20-F, and more
- **🔗 Direct SEC Links**: All citations link directly to official SEC.gov documents
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile

### Example Queries

```
"What were Apple's risk factors in their latest 10-K?"

"Show me all 8-K filings about revenue corrections in the last 6 months"

"Compare quarterly revenue trends for NVIDIA over the past year"

"Find examples of goodwill impairment triggering events"
```

## 🏗️ Architecture

```
Browser (Next.js) → /api/chat → Query Router → MCP Tools → SEC APIs
                                      ↓
                   Evidence Store (PostgreSQL + pgvector + Blob)
                                      ↓
                   RAG Pipeline → Answer Composer → Citations
```

**Core Principles:**
- **Accuracy First**: Every claim backed by retrieved evidence
- **No EDGAR Mirroring**: Fetch on-demand with short TTL caching
- **Tool-First**: LLM orchestrates; tools provide facts
- **Compliance**: Proper User-Agent, rate limiting, backoff

---

## 📚 Documentation Map

> **For Agents & Developers**: Use this map to find specific information quickly

### 🚀 Getting Started
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete environment setup and installation
  - *When to use*: Setting up local development or production deployment
  - *Contains*: Prerequisites, step-by-step setup, environment variables, troubleshooting

### 🗺️ Project Planning
- **[PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md)** - Development timeline with phases
  - *When to use*: Understanding project scope, planning sprints, tracking progress
  - *Contains*: Phase breakdown, validation gates, critical path, team allocation

### 🏛️ System Design
- **[ARCHITECTURE_REFERENCE.md](./ARCHITECTURE_REFERENCE.md)** - Complete technical architecture
  - *When to use*: Understanding system components, data flow, API contracts
  - *Contains*: Component diagrams, database schema, API specs, performance targets

### 👨‍💻 Implementation
- **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** - Code examples and implementation details
  - *When to use*: Writing code, implementing features, debugging issues
  - *Contains*: Monorepo structure, code examples, testing strategies, development workflow

### 🎨 User Interface
- **[UX_DESIGN_SPECIFICATION.md](./UX_DESIGN_SPECIFICATION.md)** - Complete UI/UX design system
  - *When to use*: Building UI components, styling, responsive design, accessibility
  - *Contains*: Design tokens, component library, interaction patterns, mobile layouts

### ✅ Quality Assurance
- **[VALIDATION_CHECKLIST.md](./VALIDATION_CHECKLIST.md)** - Acceptance criteria for each phase
  - *When to use*: Testing features, validating phase completion, production readiness
  - *Contains*: Phase checklists, acceptance tests, performance benchmarks, sign-off criteria

### 🛠️ Technical Reference
- **[technical_guide.md](./technical_guide.md)** - Deep technical implementation guide
  - *When to use*: Understanding SEC API details, sectionizer patterns, RAG pipeline
  - *Contains*: SEC endpoints, form-specific parsing, search algorithms, citation formats

---

## 🚦 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- PostgreSQL with pgvector
- Redis (Upstash)
- LLM API key (OpenAI/Anthropic)

### Installation

```bash
# Clone and setup
git clone <repository-url>
cd edgar-query
pnpm install

# Setup environment (see SETUP_GUIDE.md for details)
cp apps/web/.env.example apps/web/.env.local
# Fill in your environment variables

# Setup database
cd apps/web
pnpm prisma db push
pnpm prisma generate

# Start development
cd ../..
pnpm dev
```

### Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Should return: {"status":"ok","db":true,"redis":true,"blob":true}
```

---

## 🏃‍♂️ Development Workflow

### Current Phase: Foundation
See [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) for detailed phase breakdown.

### Daily Development
```bash
# Start development servers
pnpm dev

# Run tests
pnpm test

# Check types
pnpm typecheck

# Lint code
pnpm lint
```

### Phase Completion
Each phase has specific validation gates in [VALIDATION_CHECKLIST.md](./VALIDATION_CHECKLIST.md). Complete all checklist items before proceeding to the next phase.

---

## 🛠️ Technology Stack

### Core Framework
- **Next.js 14+** (App Router) - React framework with serverless functions
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling framework
- **Vercel** - Hosting and deployment platform

### Data & AI
- **PostgreSQL + pgvector** - Vector database for embeddings
- **Prisma** - Database ORM and migrations
- **OpenAI/Anthropic APIs** - LLM for query processing
- **MCP (Model Context Protocol)** - Tool orchestration layer

### Infrastructure
- **Upstash Redis** - Rate limiting and caching
- **Vercel Blob** - File storage for cached filings
- **Vercel Analytics** - Performance monitoring

### Search & RAG
- **BM25** - Keyword search algorithm
- **Vector Embeddings** - Semantic search
- **Hybrid Ranking** - Combined keyword + semantic scoring

---

## 📊 Project Status

### ✅ Completed
- [x] Complete documentation suite
- [x] Architecture design and technical specifications
- [x] UI/UX design system and component specifications
- [x] Development environment setup guide

### 🚧 In Progress (Phase 1: Foundation)
- [ ] Monorepo structure setup
- [ ] Database schema and migrations
- [ ] Basic API endpoints
- [ ] Rate limiting implementation
- [ ] SEC utilities and company resolution

### 📋 Planned
- **Phase 2**: MCP Tool Layer (1-2 days)
- **Phase 3**: Sectionizers (2-3 days) 
- **Phase 4**: RAG Pipeline (1-2 days)
- **Phase 5**: API & UI (2-3 days)
- **Phase 6**: Enhancements (ongoing)

---

## 🧪 Testing

### Test Categories
- **Unit Tests**: Individual components and utilities
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Full user workflows
- **Performance Tests**: Response times and load handling

### Running Tests
```bash
# All tests
pnpm test

# Specific test suite
pnpm test -- --grep "SEC utilities"

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

---

## 🚀 Deployment

### Production Environment
- **Vercel** - Primary hosting platform
- **Neon/Supabase** - Managed PostgreSQL
- **Upstash** - Global Redis
- **Custom Domain** - edgar.yourdomain.com

### Deployment Process
```bash
# Deploy to Vercel
vercel --prod

# Run database migrations
pnpm db:migrate

# Verify deployment
curl https://edgar.yourdomain.com/api/health
```

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed deployment instructions.

---

## 🤝 Contributing

### Development Standards
- **Code Style**: Prettier + ESLint configuration
- **Commits**: Conventional commit format
- **Branches**: Feature branches from `main`
- **Testing**: All features require tests
- **Documentation**: Update relevant docs with changes

### Pull Request Process
1. Create feature branch: `feature/description`
2. Implement changes with tests
3. Update documentation if needed
4. Submit PR with clear description
5. Pass all CI checks and reviews

### Phase-Based Development
Follow the phase structure in [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md):
- Complete validation gates before proceeding
- Update [VALIDATION_CHECKLIST.md](./VALIDATION_CHECKLIST.md) progress
- Coordinate with other developers on dependencies

---

## 🆘 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check connection string format
echo $DATABASE_URL

# Test connection
pnpm prisma db pull
```

#### Rate Limiting Problems
```bash
# Check Redis connection
redis-cli ping

# Monitor rate limit status
curl http://localhost:3000/api/health
```

#### SEC API Errors
- Verify User-Agent is set correctly
- Check rate limiting (10 req/sec max)
- Confirm SEC endpoints are accessible

### Getting Help
1. Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) troubleshooting section
2. Review [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) debugging guide
3. Search existing issues
4. Create new issue with reproduction steps

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🔗 Key Links

- **Live Demo**: *Coming soon*
- **Documentation**: All `.md` files in this repository
- **SEC API Documentation**: [SEC Developer Resources](https://www.sec.gov/developer)
- **Issues**: GitHub Issues tab
- **Vercel Dashboard**: [Project Dashboard](https://vercel.com)

---

## 🎯 Agent Quick Reference

**For AI agents working on this project:**

1. **Starting new work?** → Read [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) current phase
2. **Need technical details?** → Check [ARCHITECTURE_REFERENCE.md](./ARCHITECTURE_REFERENCE.md) 
3. **Writing code?** → Use [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) examples
4. **Building UI?** → Follow [UX_DESIGN_SPECIFICATION.md](./UX_DESIGN_SPECIFICATION.md)
5. **Testing features?** → Use [VALIDATION_CHECKLIST.md](./VALIDATION_CHECKLIST.md)
6. **Setting up environment?** → Follow [SETUP_GUIDE.md](./SETUP_GUIDE.md)

**Current Focus**: Complete Phase 1 Foundation tasks as outlined in the roadmap.

---

*Last Updated: 2024 | Next Review: After Phase 1 Completion*
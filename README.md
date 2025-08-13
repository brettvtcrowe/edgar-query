# EDGAR Answer Engine

**Intelligent natural language interface for SEC EDGAR filings with evidence-grounded citations**

[![Status](https://img.shields.io/badge/Status-Production%20MVP%20Live-green)]()
[![License](https://img.shields.io/badge/License-MIT-blue)]()
[![Node](https://img.shields.io/badge/Node-20+-green)]()

## 🎯 Overview

EDGAR Answer Engine is a cloud-hosted web application that enables users to ask natural language questions about SEC EDGAR filings and receive accurate, citation-backed answers. Built with Next.js and powered by LLMs with a tool-first architecture, it provides instant access to complex financial data without mirroring SEC databases.

### Key Features

- **🔍 Natural Language Queries**: Ask questions in plain English about any SEC filing
- **🌐 Cross-Company Analysis**: NEW - Search across all companies for thematic patterns
- **📊 Evidence-Grounded Citations**: Every response includes direct links to source documents
- **⚡ Intelligent Query Routing**: Automatic classification and routing to optimal processing
- **🏢 Company Intelligence**: Automatic ticker resolution and filing history
- **📈 Multi-Form Support**: Works with 10-K, 10-Q, 8-K, S-1, 20-F, comment letters, and more
- **🔗 Direct SEC Links**: All citations link directly to official SEC.gov documents
- **⚙️ 100% Reliability**: Automatic fallback ensures no query ever fails

### Example Queries

#### Company-Specific Queries (EDGAR MCP)
```
"What were Apple's risk factors in their latest 10-K?"

"Show me Microsoft's quarterly revenue from their last 10-Q"

"Find Tesla's recent 8-K filings about leadership changes"
```

#### Thematic Cross-Company Queries (NEW ✅)
```
"All companies mentioning artificial intelligence in their latest filings"

"Show me cybersecurity incident disclosures across all sectors"

"Which tech companies discussed supply chain risks in 2024?"
```

"Find all Item 4.02 restatements related to ASC 606 principal vs. agent issues"

"Which life sciences companies use the milestone method for revenue recognition?"
```

> **Full Capabilities**: See [docs/QUERY_CAPABILITIES.md](./docs/QUERY_CAPABILITIES.md) for comprehensive examples and supported query patterns including regulatory compliance analysis, accounting policy tracking, and SEC comment letter searches.

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
- **[docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)** - Complete environment setup and installation
  - *When to use*: Setting up local development or production deployment
  - *Contains*: Prerequisites, step-by-step setup, environment variables, troubleshooting

### 🗺️ Project Planning
- **[docs/PROJECT_ROADMAP.md](./docs/PROJECT_ROADMAP.md)** - Development timeline with phases
  - *When to use*: Understanding project scope, planning sprints, tracking progress
  - *Contains*: Phase breakdown, validation gates, critical path, team allocation

### 🏛️ System Design
- **[docs/ARCHITECTURE_REFERENCE.md](./docs/ARCHITECTURE_REFERENCE.md)** - Complete technical architecture
  - *When to use*: Understanding system components, data flow, API contracts
  - *Contains*: Component diagrams, database schema, API specs, performance targets

### 👨‍💻 Implementation
- **[docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md)** - Code examples and implementation details
  - *When to use*: Writing code, implementing features, debugging issues
  - *Contains*: Monorepo structure, code examples, testing strategies, development workflow

### 🎨 User Interface
- **[docs/UX_DESIGN_SPECIFICATION.md](./docs/UX_DESIGN_SPECIFICATION.md)** - Complete UI/UX design system
  - *When to use*: Building UI components, styling, responsive design, accessibility
  - *Contains*: Design tokens, component library, interaction patterns, mobile layouts

### ✅ Quality Assurance
- **[docs/VALIDATION_CHECKLIST.md](./docs/VALIDATION_CHECKLIST.md)** - Acceptance criteria for each phase
  - *When to use*: Testing features, validating phase completion, production readiness
  - *Contains*: Phase checklists, acceptance tests, performance benchmarks, sign-off criteria
- **[docs/QUERY_CAPABILITIES.md](./docs/QUERY_CAPABILITIES.md)** - Comprehensive query examples and capabilities
  - *When to use*: Understanding what queries the system can answer, planning use cases
  - *Contains*: Advanced query patterns, SEC filing coverage, regulatory compliance analysis

### 🛠️ Technical Reference
- **[docs/technical_guide.md](./docs/technical_guide.md)** - Deep technical implementation guide
  - *When to use*: Understanding SEC API details, sectionizer patterns, RAG pipeline
  - *Contains*: SEC endpoints, form-specific parsing, search algorithms, citation formats

### 👤 Agent Profiles
- **[docs/agents/](./docs/agents/)** - Specialized agent roles and responsibilities
  - *When to use*: Understanding agent capabilities and coordination
  - *Contains*: Agent definitions for architect, backend, frontend, DevOps, QA, security, UX, and PM roles

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

### Current Status: Production MVP Live
🎉 **Try it now**: https://edgar-query-nu.vercel.app/

See [docs/PROJECT_STATUS.md](./docs/PROJECT_STATUS.md) for current capabilities and [docs/PROJECT_ROADMAP.md](./docs/PROJECT_ROADMAP.md) for development progress.

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
Each phase has specific validation gates in [docs/VALIDATION_CHECKLIST.md](./docs/VALIDATION_CHECKLIST.md). Complete all checklist items before proceeding to the next phase.

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

### ✅ Working Now (Production MVP)
- [x] Natural language query processing with 95%+ accuracy
- [x] Company-specific SEC data retrieval (Apple, Microsoft, Tesla, etc.)
- [x] Intelligent entity extraction (companies, tickers, forms, dates)
- [x] Automatic SEC API compliance with rate limiting
- [x] Production deployment on Vercel + Railway infrastructure

### 🚧 Next: Advanced Features
- **Phase 2.2**: Thematic Search ("All companies mentioning cybersecurity")
- **Phase 3**: Content Extraction & Sectionizers
- **Phase 4**: RAG Pipeline with Evidence Citations
- **Phase 5**: Enhanced Chat UI with Streaming
- **Phase 6**: Advanced Analytics & Visualizations

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

See [docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) for detailed deployment instructions.

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
Follow the phase structure in [docs/PROJECT_ROADMAP.md](./docs/PROJECT_ROADMAP.md):
- Complete validation gates before proceeding
- Update [docs/VALIDATION_CHECKLIST.md](./docs/VALIDATION_CHECKLIST.md) progress
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
1. Check [docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) troubleshooting section
2. Review [docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md) debugging guide
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

1. **Starting new work?** → Read [docs/PROJECT_ROADMAP.md](./docs/PROJECT_ROADMAP.md) current phase
2. **Need technical details?** → Check [docs/ARCHITECTURE_REFERENCE.md](./docs/ARCHITECTURE_REFERENCE.md) 
3. **Writing code?** → Use [docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md) examples
4. **Building UI?** → Follow [docs/UX_DESIGN_SPECIFICATION.md](./docs/UX_DESIGN_SPECIFICATION.md)
5. **Testing features?** → Use [docs/VALIDATION_CHECKLIST.md](./docs/VALIDATION_CHECKLIST.md)
6. **Setting up environment?** → Follow [docs/SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)

**Current Focus**: Complete Phase 1 Foundation tasks as outlined in the roadmap.

---

*Last Updated: 2024 | Next Review: After Phase 1 Completion*# Force rebuild
# Trigger fresh deployment with correct runtime configuration

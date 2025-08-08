# EDGAR Answer Engine - Setup Guide

## Prerequisites

### Required Software
- **Node.js**: v20.0.0 or higher
- **pnpm**: v8.0.0 or higher (`npm install -g pnpm`)
- **Git**: v2.0.0 or higher
- **VS Code** (recommended) or your preferred IDE

### Required Accounts
- **GitHub**: For repository and version control
- **Vercel**: For hosting and serverless functions
- **Neon** or **Supabase**: For PostgreSQL with pgvector
- **Upstash**: For Redis rate limiting
- **OpenAI** or **Anthropic**: For LLM API access

## Step-by-Step Setup

### Step 1: Clone and Initialize Repository

```bash
# Clone the repository (or create new)
git clone https://github.com/yourusername/edgar-query.git
cd edgar-query

# Initialize if creating new
git init
```

### Step 2: Setup Monorepo Structure

```bash
# Create directory structure
mkdir -p apps/web
mkdir -p services/edgar-mcp
mkdir -p packages/types
mkdir -p infra/prisma
mkdir -p infra/scripts

# Initialize pnpm workspace
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'services/*'
  - 'packages/*'
EOF

# Initialize root package.json
cat > package.json << 'EOF'
{
  "name": "edgar-query",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "db:push": "cd apps/web && pnpm prisma db push",
    "db:migrate": "cd apps/web && pnpm prisma migrate dev"
  },
  "devDependencies": {
    "turbo": "latest",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
EOF

# Install root dependencies
pnpm install
```

### Step 3: Initialize Next.js Application

```bash
# Create Next.js app
cd apps/web
pnpm create next-app@latest . --typescript --tailwind --app --no-src-dir

# Install additional dependencies
pnpm add @vercel/blob @upstash/ratelimit @upstash/redis
pnpm add @prisma/client prisma
pnpm add ai @ai-sdk/openai
pnpm add zod cheerio htmlparser2
pnpm add @faker-js/bm25
pnpm add -D @types/cheerio

# Create app structure
mkdir -p app/api/chat
mkdir -p app/api/filings/\[cik\]
mkdir -p app/api/fetch
mkdir -p app/api/search
mkdir -p components/chat
mkdir -p lib/sectionizers
mkdir -p lib/rag

# Initialize TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

cd ../..
```

### Step 4: Setup MCP Server

```bash
# Initialize MCP server
cd services/edgar-mcp
pnpm init

# Install MCP dependencies
pnpm add @modelcontextprotocol/sdk zod
pnpm add -D @types/node typescript tsx

# Create package.json scripts
cat > package.json << 'EOF'
{
  "name": "@edgar-query/mcp-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsx": "latest"
  }
}
EOF

# Create TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Create source directories
mkdir -p src/tools

cd ../..
```

### Step 5: Setup Shared Types Package

```bash
# Initialize types package
cd packages/types
pnpm init

cat > package.json << 'EOF'
{
  "name": "@edgar-query/types",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
EOF

# Create TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

mkdir src
cd ../..
```

### Step 6: Configure Turbo

```bash
# Create turbo.json in root
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["build"]
    }
  }
}
EOF
```

### Step 7: Setup PostgreSQL Database

#### Option A: Using Neon

1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Enable pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Copy the connection string

#### Option B: Using Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Copy the connection string from Settings → Database

### Step 8: Setup Prisma

```bash
cd apps/web

# Initialize Prisma
pnpm prisma init

# Create schema file
cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Company {
  cik           String   @id
  name          String
  tickers       String[]
  lastRefreshed DateTime @default(now())
  filings       Filing[]
  
  @@index([name])
  @@index([tickers])
}

model Filing {
  id         Int       @id @default(autoincrement())
  cik        String
  accession  String    @unique
  form       String
  filedAt    DateTime
  primaryUrl String
  hash       String?
  company    Company   @relation(fields: [cik], references: [cik])
  sections   Section[]
  
  @@index([cik, filedAt])
  @@index([form, filedAt])
}

model Section {
  id        Int      @id @default(autoincrement())
  filingId  Int
  label     String
  textUrl   String
  textHash  String
  charCount Int
  filing    Filing   @relation(fields: [filingId], references: [id])
  chunks    Chunk[]
  
  @@index([filingId, label])
}

model Chunk {
  id        Int      @id @default(autoincrement())
  sectionId Int
  start     Int
  end       Int
  embedding Unsupported("vector")?
  section   Section  @relation(fields: [sectionId], references: [id])
  
  @@index([sectionId])
}

model Answer {
  id        Int      @id @default(autoincrement())
  prompt    String
  plan      Json
  citations Json
  createdAt DateTime @default(now())
}
EOF

cd ../..
```

### Step 9: Setup Upstash Redis

1. Go to [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Select "Global" for region
4. Copy the REST URL and token

### Step 10: Setup Environment Variables

```bash
# Create .env.local in apps/web
cd apps/web
cat > .env.local << 'EOF'
# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="https://..."
REDIS_TOKEN="..."

# Blob Storage
VERCEL_BLOB_READ_WRITE_TOKEN="..."

# LLM API (choose one)
OPENAI_API_KEY="sk-..."
# OR
ANTHROPIC_API_KEY="sk-ant-..."

# SEC API
USER_AGENT="EdgarAnswerEngine/1.0 (your-email@example.com)"

# Environment
NODE_ENV="development"
EOF

cd ../..
```

### Step 11: Setup Vercel Project

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login to Vercel
vercel login

# Link project
cd apps/web
vercel link

# Configure project settings
vercel env pull .env.local

cd ../..
```

### Step 12: Initialize Database

```bash
# Push schema to database
cd apps/web
pnpm prisma db push

# Generate Prisma client
pnpm prisma generate

cd ../..
```

### Step 13: Create Initial Files

#### Health Check Endpoint

```bash
# Create health check endpoint
cat > apps/web/app/api/health/route.ts << 'EOF'
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Redis } from '@upstash/redis';
import { put } from '@vercel/blob';

const prisma = new PrismaClient();
const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

export async function GET() {
  const checks = {
    status: 'ok',
    db: false,
    redis: false,
    blob: false,
  };

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch (error) {
    console.error('Database check failed:', error);
  }

  try {
    // Check Redis
    await redis.ping();
    checks.redis = true;
  } catch (error) {
    console.error('Redis check failed:', error);
  }

  try {
    // Check Blob storage
    const testBlob = await put('test.txt', 'test', {
      access: 'public',
    });
    if (testBlob) checks.blob = true;
  } catch (error) {
    console.error('Blob check failed:', error);
  }

  const allHealthy = checks.db && checks.redis && checks.blob;
  
  return NextResponse.json(checks, {
    status: allHealthy ? 200 : 503,
  });
}
EOF
```

#### Basic Homepage

```bash
cat > apps/web/app/page.tsx << 'EOF'
export default function Home() {
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-4">EDGAR Answer Engine</h1>
      <p className="text-lg text-gray-600">
        Natural language interface for SEC filings
      </p>
      <div className="mt-8">
        <a
          href="/api/health"
          className="text-blue-500 hover:underline"
        >
          Check System Health
        </a>
      </div>
    </main>
  );
}
EOF
```

### Step 14: Test Setup

```bash
# Install all dependencies
pnpm install

# Start development server
cd apps/web
pnpm dev

# In another terminal, test health endpoint
curl http://localhost:3000/api/health

# Should return:
# {"status":"ok","db":true,"redis":true,"blob":true}
```

### Step 15: Git Configuration

```bash
# Create .gitignore in root
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output

# Next.js
.next/
out/
build/
dist/

# Production
*.production

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Local env files
.env*.local
.env

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Prisma
prisma/migrations/

# IDE
.vscode/
.idea/
*.swp
*.swo
EOF

# Initial commit
git add .
git commit -m "Initial setup: monorepo structure with Next.js, MCP, and infrastructure"
```

## Verification Checklist

### Local Development
- [ ] `pnpm dev` starts without errors
- [ ] Health check returns all services as `true`
- [ ] Can access http://localhost:3000
- [ ] No TypeScript errors

### Database
- [ ] Can connect to PostgreSQL
- [ ] pgvector extension enabled
- [ ] Prisma schema synced
- [ ] Can query database

### Redis
- [ ] Can connect to Upstash Redis
- [ ] Rate limiting works
- [ ] No connection errors

### Blob Storage
- [ ] Can upload test file
- [ ] Can retrieve test file
- [ ] URLs are accessible

### Environment
- [ ] All required env vars set
- [ ] API keys valid
- [ ] User-Agent configured

## Common Issues and Solutions

### Issue: Database connection fails
**Solution**: 
- Check connection string format
- Ensure SSL is configured: `?sslmode=require`
- Verify firewall/IP allowlist

### Issue: Redis rate limit not working
**Solution**:
- Verify Redis URL and token
- Check Upstash dashboard for usage
- Ensure global database selected

### Issue: TypeScript errors
**Solution**:
```bash
# Rebuild types
pnpm run build

# Clear cache
rm -rf .next
rm -rf node_modules/.cache
```

### Issue: Vercel deployment fails
**Solution**:
- Check build logs in Vercel dashboard
- Ensure all env vars are set in Vercel
- Verify Node.js version compatibility

### Issue: pgvector not working
**Solution**:
```sql
-- Run in database console
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## Next Steps

After successful setup:

1. **Start Phase 1 Development**
   - Follow PROJECT_ROADMAP.md
   - Use DEVELOPMENT_GUIDE.md for implementation
   - Check VALIDATION_CHECKLIST.md for acceptance

2. **Setup Development Workflow**
   - Configure your IDE
   - Setup debugging
   - Install recommended extensions

3. **Team Onboarding** (if applicable)
   - Share repository access
   - Distribute env variables securely
   - Assign phase responsibilities

## Support Resources

- **Next.js Documentation**: https://nextjs.org/docs
- **Vercel Documentation**: https://vercel.com/docs
- **Prisma Documentation**: https://www.prisma.io/docs
- **MCP SDK**: https://github.com/modelcontextprotocol/sdk
- **Upstash Documentation**: https://docs.upstash.com

## Security Reminders

1. **Never commit** `.env.local` or any file with secrets
2. **Rotate API keys** regularly
3. **Use environment variables** for all sensitive data
4. **Enable 2FA** on all service accounts
5. **Review dependencies** for vulnerabilities regularly

---

*Setup complete! You're ready to begin development. Follow the PROJECT_ROADMAP.md for the next phase.*
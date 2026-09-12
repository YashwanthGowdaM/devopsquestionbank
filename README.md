
# DevOps Question Bank Management System

> Enterprise-grade technical interview question bank curation system with multi-model AI taxonomy classification, semantic duplicate detection, split & merge workflows, real-time analytics, and automated Supabase database hosting.

---

## 🌟 Key Features

- **Multi-Model AI Classification Cascade**: Integrates Google Gemini (`gemini-3.8-flash` → `gemini-3.6-flash` → `gemini-3.1-flash-lite`) with a 4-tier resilience cascade and local panelist heuristic fallbacks so the ingestion parser never blocks.
- **Alphabetized Taxonomy**: 36 canonical technical domains arranged in strict alphabetical order across all selectors, review filters, and database triggers.
- **Deep Duplicate Detection**: Multi-tier deduplication engine combining exact normalization, Levenshtein distance, Jaccard token similarity, and technical keyword stemming.
- **Interactive Review & Curation**: Inline cell editing, compound question splitting, multi-question merging, bulk status changes, and confidence score badges.
- **Direct Supabase Integration**: One-click and automated database synchronization to a hosted PostgreSQL `public.questions` table via Supabase SDK.
- **Multi-Format Export Suite**: Export verified question banks as Microsoft Excel (`.xlsx`), standard CSV, structured JSON payload, or complete PostgreSQL migration scripts (`.sql`).
- **Zero-Stub Database Integrity**: The application UI strictly reflects live database content—if the database is cleared, the workspace is clean.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + TypeScript (SPA) |
| **Styling & Icons** | Tailwind CSS + Lucide React |
| **Bundler & Dev Server** | Vite 6 |
| **Backend API Server** | Node.js Express + TypeScript (`tsx` dev runtime, `esbuild` production bundle) |
| **Database** | PostgreSQL hosted on **Supabase** (with GIN indexes, RLS, & triggers) |
| **AI Taxonomy Engine** | `@google/genai` (Gemini 3.8 Flash, Gemini 3.6 Flash, Gemini 3.1 Flash Lite) |
| **Spreadsheet Engine** | `xlsx` (SheetJS) |

---

## 📁 Repository Structure

```text
├── .env.example               # Environment variables template
├── .gitignore                  # Git ignore rules for node_modules, build, secrets
├── index.html                  # HTML entry point with metadata tags
├── metadata.json               # Application platform manifest
├── package.json                # Project dependencies and build scripts
├── server.ts                   # Express full-stack API server & Vite middleware
├── tsconfig.json               # TypeScript compiler configuration
├── vite.config.ts              # Vite configuration with Tailwind CSS plugin
├── supabase/
│   └── schema.sql              # Supabase PostgreSQL schema, indexes, RLS & triggers
└── src/
    ├── main.tsx                # React application entry point
    ├── App.tsx                 # Main layout, view routing & global state
    ├── types.ts                # TypeScript interfaces, enums, & alphabetized taxonomy
    ├── components/
    │   ├── Navbar.tsx                  # Navigation header with mode switching
    │   ├── IngestionParser.tsx         # Raw transcript input & AI panelist parser
    │   ├── ReviewTable.tsx             # Curated questions review queue with inline edit
    │   ├── QuestionBrowser.tsx         # Bank catalog with card/table views & filters
    │   ├── DashboardAnalytics.tsx      # Domain coverage & taxonomy statistics
    │   ├── ExportSupabaseView.tsx      # Export hub & Supabase sync center
    │   ├── SupabaseSetupModal.tsx      # 1-Click interactive SQL setup dialog
    │   ├── EditQuestionModal.tsx       # Single-question comprehensive editor
    │   ├── QuestionDetailModal.tsx     # Question detail & rationale modal
    │   ├── MergeSplitModal.tsx         # Compound question split & merge tool
    │   └── CustomEnumSelect.tsx        # Dynamic enum dropdown with custom input
    └── utils/
        ├── analyzer.ts         # Heuristic rule-based panelist analyzer
        └── exportUtils.ts      # Excel, CSV, and JSON export utilities
```

---

## 📋 Prerequisites

Before running the application, make sure you have:

1. **Node.js**: Version 18.0.0 or higher (Node 20+ recommended).
2. **npm** (comes with Node) or **pnpm** / **yarn** / **bun**.
3. **Supabase Account**: A free project at [supabase.com](https://supabase.com).
4. **Google Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/apikey).

---

## 🚀 Step 1: Local Setup & Quickstart

### 1. Clone or download the project
```bash
git clone https://github.com/<YOUR_USERNAME>/devops-question-bank.git
cd devops-question-bank
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:
```env
# Gemini API Key for AI question analysis & taxonomy classification
GEMINI_API_KEY="your-gemini-api-key"

# Supabase Project Credentials
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_KEY="your-supabase-service-role-or-anon-key"
```

### 4. Start development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Step 2: Hosting the Database in Supabase

Host your production question bank on Supabase PostgreSQL in less than 2 minutes:

### 1. Create a Supabase Project
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Click **New Project**, choose an organization, set a project name (e.g. `devops-bank`), and set a strong database password.
3. Select the region closest to your users.

### 2. Execute the Database Schema
1. In your Supabase project dashboard, click the **SQL Editor** icon in the left sidebar.
2. Click **New Query**.
3. Open the file `supabase/schema.sql` in this repo, copy its contents, paste them into the SQL editor, and click **Run**.
4. The following table, indexes, and policies will be created:
   - `public.questions` table with UUID primary key.
   - GIN indexes for array searching on `tags` and `search_keywords`.
   - Full-text search index on question text and explanations.
   - Automatic `updated_at` trigger function.
   - Row Level Security (RLS) policies allowing public read, insert, update, and delete.

### 3. Copy API Credentials to `.env`
1. In the Supabase dashboard, click the gear icon (**Project Settings**) &rarr; **API**.
2. Copy the **Project URL** &rarr; paste as `SUPABASE_URL` in `.env`.
3. Copy the **service_role key** (recommended for server-side operations) or **anon public key** &rarr; paste as `SUPABASE_KEY` in `.env`.

### 4. Verify the Connection
1. Launch the app and navigate to the **Export & Supabase** tab.
2. The badge in the header will display **Connected to Supabase** with the live row count.
3. When questions are marked as **Review Completed** in the Review Queue, they automatically synchronize to your live Supabase database!

---

## 🐙 Step 3: Uploading Project to GitHub

Follow these steps to publish this repository to your GitHub account:

### 1. Create a new repository on GitHub
1. Go to [https://github.com/new](https://github.com/new).
2. Name the repository (e.g. `devops-question-bank`).
3. Set visibility to **Public** or **Private**.
4. **Do not** check "Initialize with README", `.gitignore`, or license (we already have them configured).
5. Click **Create repository**.

### 2. Push local code to GitHub
Run the following commands in your project root directory:

```bash
# Initialize git repository
git init

# Stage all files
git add .

# Commit files
git commit -m "feat: complete DevOps interview question bank management system with AI & Supabase sync"

# Rename branch to main
git branch -M main

# Link to your remote GitHub repository
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git

# Push code to GitHub
git push -u origin main
```

---

## ☁️ Step 4: Production Deployment

### Option A: Google Cloud Run / Container Deployment
The application includes a self-contained production bundle script:
```bash
# Production build
npm run build

# Start production server (listens on port 3000)
npm start
```

### Option B: Deploy to Render or Railway
1. Sign in to [Render.com](https://render.com) or [Railway.app](https://railway.app).
2. Create a new **Web Service** connected to your GitHub repository.
3. Configure the service settings:
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. In the **Environment Variables** tab, add:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `SUPABASE_URL`: Your Supabase Project URL
   - `SUPABASE_KEY`: Your Supabase API Key
   - `NODE_ENV`: `production`
5. Click **Deploy**.

### Option C: Docker Deployment
Create a `Dockerfile` in the root directory:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run with Docker:
```bash
docker build -t devops-question-bank .
docker run -p 3000:3000 -e GEMINI_API_KEY="your-key" -e SUPABASE_URL="your-url" -e SUPABASE_KEY="your-key" devops-question-bank
```

---

## 📊 Database Schema Reference (`public.questions`)

| Column | PostgreSQL Data Type | Description |
|---|---|---|
| `id` | `UUID PRIMARY KEY` | RFC4122 unique identifier (`gen_random_uuid()`) |
| `question` | `TEXT NOT NULL` | Full text of the interview question |
| `primary_topic` | `VARCHAR(100) NOT NULL` | Dominant technical domain (from 36 canonical topics) |
| `cross_topics` | `TEXT[] DEFAULT '{}'` | Secondary interrelated technical domains |
| `difficulty` | `VARCHAR(50) NOT NULL` | `Beginner`, `Intermediate`, `Advanced`, or `Expert` |
| `question_type` | `VARCHAR(50) NOT NULL` | `Theory`, `Scenario`, `Troubleshooting`, `Architecture`, `Incident`, etc. |
| `experience_level` | `VARCHAR(50) NOT NULL` | `0-2 Years`, `2-4 Years`, `4-7 Years`, `8+ Years` |
| `interview_round` | `VARCHAR(50) NOT NULL` | `Screening`, `L1`, `L2`, `Managerial` |
| `tags` | `TEXT[] DEFAULT '{}'` | Sub-topic keywords (e.g. `pod-lifecycle`, `ingress`, `helm-chart`) |
| `search_keywords` | `TEXT[] DEFAULT '{}'` | Normalized search tokens for elastic query matching |
| `confidence_score` | `INTEGER DEFAULT 90` | AI classifier confidence rating (0 to 100) |
| `duplicate_group` | `VARCHAR(50)` | Cluster ID linking semantically identical questions |
| `explanation` | `TEXT` | Panelist rationale, answer guidance, or architectural notes |
| `status` | `VARCHAR(50) DEFAULT 'Approved'` | `Approved`, `Pending Review`, or `Archived` |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | Last update timestamp (managed by Postgres trigger) |

---

## 🏷️ Alphabetized Taxonomy (36 Primary Topics)

The primary technical topics are maintained in strict alphabetical order:

1. **Ansible**
2. **Architecture**
3. **Automation**
4. **AWS**
5. **Azure**
6. **CI/CD**
7. **CloudWatch**
8. **Containerd**
9. **Database**
10. **DevSecOps**
11. **DNS**
12. **Docker**
13. **GCP**
14. **Git**
15. **GitHub**
16. **Grafana**
17. **Helm**
18. **IAM**
19. **Jenkins**
20. **Kubernetes**
21. **Linux**
22. **Monitoring**
23. **Networking**
24. **Observability**
25. **OCI**
26. **OpenShift**
27. **Others**
28. **Platform Engineering**
29. **Podman**
30. **Prometheus**
31. **Python**
32. **Security**
33. **Shell Scripting**
34. **SRE**
35. **Storage**
36. **Terraform**

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check and Gemini API key status |
| `POST` | `/api/analyze` | AI panelist question parsing with 4-tier model cascade |
| `GET` | `/api/supabase/status` | Checks Supabase credentials, connectivity & table presence |
| `GET` | `/api/supabase/questions` | Fetches live questions directly from `public.questions` table |
| `POST` | `/api/supabase/upload` | Upserts structured question records into Supabase |
| `POST` | `/api/supabase/update` | Updates a specific question by ID in Supabase |
| `POST` | `/api/supabase/delete` | Deletes one or more questions by ID from Supabase |
| `POST` | `/api/supabase-sql` | Generates a complete PostgreSQL DDL and seed INSERT script |

---

## 🛠️ Development Scripts

- `npm run dev` - Starts backend Express server with Vite middleware in development mode.
- `npm run build` - Compiles the frontend Vite SPA and bundles `server.ts` into a CommonJS production bundle (`dist/server.cjs`).
- `npm start` - Launches the compiled standalone Node.js production server.
- `npm run lint` - Type-checks the TypeScript codebase (`tsc --noEmit`).
- `npm run clean` - Cleans build output directories.

---

## 📄 License

MIT License. Feel free to use, modify, and distribute for personal, educational, or enterprise interview question bank management.

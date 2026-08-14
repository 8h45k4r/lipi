# Lipi (लिपि) - AI Document & Knowledge Management

Lipi is a state-of-the-art, AI-powered document extraction and knowledge management platform designed specifically for the Nepalese financial sector. Built with modern web technologies, Lipi addresses the critical pain points of manual data entry, complex legacy document formats, and regulatory compliance by leveraging localized AI models.

## 🚀 Key Features

### 1. Intelligent Localized Extraction
- **Bilingual Mastery**: Natively reads and processes both Devanagari and English texts.
- **Specialized Document Support**: Accurately extracts data from complex local documents including:
  - Nagarikta (Citizenship Certificates)
  - Lalpurja (Land Ownership Documents)
  - KYC and Account Opening Forms
  - Invoices and Stamped Vendor Bills
- **BS to AD Conversion**: Built-in support for processing and standardizing Bikram Sambat (BS) dates to Anno Domini (AD).

### 2. Deep Parsing & Content Structuring
- **Array Extraction**: Capable of deep-diving into long documents (like the Nepal Gazette) to extract repeating blocks of data (e.g., individual notices, laws, or announcements).
- **Agentic Chunking**: Intelligently handles massive, multi-page PDFs that would normally exceed the context windows of local AI models.

### 3. Human-in-the-Loop (HITL) Review Mode
- An intuitive side-by-side verification interface where operators can see the AI's extracted data alongside the source document.
- One-click accept, edit, or reject functionality with confidence scores down to the field level.

### 4. Centralized Knowledge Base & AI Copilot
- **Single Source of Truth**: Ingests and indexes internal SOPs, Credit Policies, and Nepal Rastra Bank (NRB) circulars.
- **Conversational Copilot**: A secure, internal conversational agent that answers compliance and operational questions grounded *strictly* in approved internal data, eliminating hallucinations.

## 🛠 Tech Stack

- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS, shadcn/ui, Lucide Icons.
- **Backend**: Next.js API Routes, Node.js (`pdf-parse` for OCR).
- **Database**: MySQL (via `mysql2`).
- **AI Engine**: Local LLM integration (Ollama / `gemma4:12b` placeholder).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL Database
- Ollama (running locally with the `gemma4:12b` model, or configured to your preferred model)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd lipi
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (optional for MAMP defaults):
   ```bash
   cp .env.example .env.local
   ```
   The defaults target MAMP's MySQL (`127.0.0.1:8889`, `root`/`root`, database `lipi_local`). Override `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` in `.env.local` for any other setup, and set a strong `SESSION_SECRET` (`openssl rand -base64 32`).

4. **Set up the Database** (creates all tables + a demo admin, idempotent):
   ```bash
   npm run setup
   ```
   This seeds a demo admin you can log in with immediately:
   - **Email:** `admin@lipi.ai`
   - **Password:** `admin123`

   > Change or override these with `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD` when running setup. Don't ship the demo credentials to production.

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```

6. **Open the Application**:
   Navigate to [http://localhost:3000](http://localhost:3000), log in with the demo admin, and you're in. You can also create additional accounts via the Sign Up page.

## 📁 Project Structure

- `/src/app` - Next.js App Router pages and API routes.
- `/src/components` - Reusable UI components (shadcn, modals, layout).
- `/src/lib` - Core utilities, Database connection, and Ollama integration.
- `/public/uploads` - Local storage directory for ingested documents.

## ⚠️ Notes on Local AI Models
If running fully locally with an open-weight model like `gemma4:12b`, please note that the context window is typically limited (e.g., 4096 tokens). For massive documents (like 80-page PDFs), the system utilizes chunking pipelines or requires upgrading to models with larger context windows (like Gemini 1.5 Pro).

---
*Empowering Nepal's financial institutions with the speed of Artificial Intelligence.*

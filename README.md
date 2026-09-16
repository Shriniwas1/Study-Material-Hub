# Study Material Hub & AI Test Prep Platform

A full-stack, enterprise-grade **AI-Powered Test Preparation and Document Intelligence Platform** built using the MERN stack. Features a session-isolated **Retrieval-Augmented Generation (RAG)** architecture, asynchronous PDF processing pipeline, vector search, interactive AI study room, security hardening, and global study material sharing.

---

## Key Features

### 1. AI Study Room & RAG Engine
- **Session-Isolated Vector Ingestion**: Upload PDFs to dedicated study sessions. Documents are asynchronously parsed, page-chunked with SHA-256 deduplication, and indexed into vector embeddings.
- **Interactive AI Modes**:
  - **Ask**: Grounded QA answering questions strictly using uploaded study session PDFs.
  - **Explain**: Detailed conceptual breakdowns of complex topics in uploaded notes.
  - **Summarize**: High-level executive summaries of session PDFs.
  - **Test Me**: Interactive Multiple Choice Quiz (MCQ) generation with real-time scoring.
- **Backend-Derived Citations**: Clickable citation badges linking directly back to original PDF source documents and page numbers.

### 2. Asynchronous Document Processing Pipeline
- **HTTP 202 Accepted Async Workflow**: Uploads return immediately while background jobs extract text via `PDFParse` and generate embeddings via Google Gemini / OpenAI with local fallback.
- **Cloudinary Basic Auth Proxy**: Bypasses raw resource access restrictions through authenticated backend streaming (`GET /api/materials/:id/pdf`).
- **Auto-Recovery**: Automatic background re-indexing and retry fallback for failed document processing.

### 3. Enterprise Security & Quota Hardening
- **Bcrypt Hashing & JWT Auth**: Secure password hashing with dual Bearer header & URL query token support for PDF previewing.
- **BOLA / IDOR Defense**: Strict user boundary validation on all session data and material actions.
- **Multi-Layer Rate Limiting**: Dedicated rate limiters for Auth, API, File Uploads, and AI Chat endpoints.
- **SSRF Guard**: Strict domain whitelist verification blocking private IP ranges (`127.0.0.1`, `169.254.169.254`, etc.).
- **Security Audit Logger**: Structured logging for unauthorized access attempts, prompt injections, and rate limit violations.
- **Resource Quotas**: Strict limits on active sessions, documents per session, max PDF file size (15MB), daily AI queries, and daily quiz generation.

### 4. Global Study Material Hub
- Upload, browse, and filter public study materials.
- In-page PDF Reader preview using object/iframe containers.
- Star rating system and material management.

---

## Tech Stack

### Backend
- **Node.js & Express 5**: Core API server architecture.
- **MongoDB & Mongoose**: Primary database storing users, sessions, documents, vector chunks, chat history, and quizzes.
- **Google GenAI SDK (`@google/genai`)**: Pluggable vector embedding generation & RAG chat intelligence.
- **Cloudinary SDK**: Cloud storage for uploaded PDFs and study documents.
- **Helmet, Cors, & Zod**: Production security headers, CORS policy enforcement, and request validation.

### Frontend
- **React 18 & Vite 7**: Modern, fast SPA frontend framework.
- **Tailwind CSS & Lucide Icons**: Modern responsive UI components with Glassmorphic aesthetic.
- **Axios & Sonner**: HTTP client with toast notifications.

---

## Environment Variables

Create a `.env` file inside the `Backend/` directory:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/study_hub
JWT_SECRET=your_jwt_secret_key_here

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_secret

# AI & Vector Embeddings
GEMINI_API_KEY=your_gemini_api_key_here
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=text-embedding-004

# Resource Quotas & Security
MAX_PDF_SIZE_MB=15
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

Create a `.env` file inside the `Frontend/` directory:

```env
VITE_APP_BACKEND_URL=http://localhost:5000
```

---

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/Shriniwas1/Study-Material-Hub.git
cd Study-Material-Hub
```

### 2. Backend Setup
```bash
cd Backend
npm install
npm run dev
```
*Backend API will run on `http://localhost:5000`*

### 3. Frontend Setup
```bash
cd ../Frontend
npm install
npm run dev
```
*Frontend application will run on `http://localhost:5173`*

---

## Application UI Preview

---

<img width="1918" height="962" alt="Dashboard" src="https://github.com/user-attachments/assets/d1d20263-385f-4725-801e-332ae7d26e2d" />

---

<img width="1918" height="972" alt="Material Viewer" src="https://github.com/user-attachments/assets/700f61ae-f9ff-42e4-bc58-970cfc9e4aee" />

---

<img width="1918" height="966" alt="Upload Material" src="https://github.com/user-attachments/assets/f0f5f0b3-c128-4cca-bd96-6acca2110f94" />
---
<img width="1880" height="911" alt="image" src="https://github.com/user-attachments/assets/45cea34e-1027-4d80-b244-ae1f63a451ac" />
---
<img width="1916" height="907" alt="image" src="https://github.com/user-attachments/assets/701a582b-ad29-42a0-b7b9-9f82fe1155fb" />
---

<img width="1917" height="912" alt="image" src="https://github.com/user-attachments/assets/1f9c224d-8d20-4b97-a18c-a6677f793747" />


---

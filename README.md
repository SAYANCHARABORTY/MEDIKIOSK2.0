# MediKiosk (with NIRVANA AI)

> **Next-Generation Multilingual AI Healthcare & OPD Case-Taking Kiosk Platform**

MediKiosk is an intelligent, bilingual/multilingual healthcare kiosk platform designed for modern hospitals and rural/community health centers. Built with a high-fidelity 3D interactive interface (Spline), full global i18n localization (English, हिन्दी, বাংলা), and the unified **NIRVANA** AI healthcare suite.

---

## 🌟 Key Features

1. **NIRVANA Healthcare Intelligence Suite**:
   - 💬 **Chat with NIRVANA**: Conversational medical query assistant powered by Groq Clinical Llama 3.
   - 🎤 **Talk to NIRVANA**: Voice-interactive clinical assistant powered by Google Gemini Audio understanding.
   - 📄 **Analyze Medical Document**: Multi-modal document and prescription analysis powered by Google Gemini Vision.
2. **Global Multilingual Architecture (i18n)**:
   - Full end-to-end interface translation across **English**, **हिन्दी (Hindi)**, and **বাংলা (Bengali)**.
   - Reactive translation covering all screens, forms, alerts, navigation, and clinical tables.
3. **Clinical Case-Taking & Review of Systems (ROS)**:
   - Multilingual intake flows capturing Chief Complaints, HPI, Past History, Medications, Allergies, Family History, and 12-system ROS.
   - AYUSH assessment support (Ayurveda, Homeopathy, Unani, Siddha).
4. **Physician & OPD Workflow**:
   - Real-time token queue with priority triage (Routine, Urgent, Emergency).
   - Doctor View with verified summaries, investigation tracking, and prescription audits.
5. **ABDM & FHIR R4 Integration**:
   - FHIR R4 standard bundle exports.
   - ABDM Milestones 1–3 sandbox compliance and secure time-limited token-based record sharing.
6. **Genuine High-Resolution JPEG Medical Report Export**:
   - Client-side and server-side pixel-perfect JPEG generation for extracted lab reports and summaries.

---

## 🏗️ Tech Stack & Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Spline 3D, HTML2Canvas.
- **Backend**: Node.js 22, Express, TypeScript, SQLite (`node:sqlite` DatabaseSync with WAL and automatic schema initialization).
- **Deployment**: Vercel Serverless Functions (`api/index.ts`), Single-Page Application rewrites (`vercel.json`).
- **AI Providers**:
  - **Groq API**: High-speed conversational AI and structured clinical synthesis.
  - **Google Gemini API**: Document vision OCR and audio transcription/speech synthesis.

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/<your-username>/medikiosk.git
cd medikiosk

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory (refer to `.env.example`):

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Security
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_key_here
ENCRYPTION_KEY=your_32_byte_encryption_key_here

# AI Credentials
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run Development Servers

In terminal 1 (Backend Server):
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

In terminal 2 (Frontend Client):
```bash
cd client
npm run dev
# Frontend runs on http://localhost:5173
```

---

## 🚢 Deploying to Vercel

MediKiosk is pre-configured for seamless 1-click or CLI deployment on **Vercel**.

### Step 1: Push Code to GitHub

```bash
# Set main branch
git branch -M main

# Add your GitHub repository as remote
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# Push the codebase
git push -u origin main
```

### Step 2: Import into Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **"Add New..."** → **"Project"**.
3. Import your GitHub repository.
4. Vercel will automatically detect `vercel.json` settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `client/dist`
5. Configure Environment Variables in the Vercel Project Settings:
   - `GROQ_API_KEY` = your Groq API key
   - `GEMINI_API_KEY` = your Gemini API key
   - `JWT_SECRET` = your secure secret
6. Click **Deploy**.

---

## 👥 Default Demo Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| **Doctor** | `doctor` | `Doctor@MediKiosk2026` |
| **Administrator** | `admin` | `Admin@MediKiosk2026` |
| **Nurse** | `nurse` | `Nurse@MediKiosk2026` |
| **OPD Staff** | `staff` | `Staff@MediKiosk2026` |

---

## 📄 License

MIT License © 2026 MediKiosk.

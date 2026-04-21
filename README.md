# 🚀 LinkedIn Content Pipeline Automation

An autonomous, AI-powered system that transforms rough thoughts in Google Sheets into polished, branded LinkedIn posts with AI-generated images. Now includes a **Premium Desktop Dashboard**.

---

## 🌟 Key Features

*   **Google Sheets Integration**: Automatically fetches draft posts and marks them as "Posted" upon success.
*   **AI Content Polishing**: Uses **NVIDIA NIM (Llama 3.3 70B)** to turn rough notes into professional, high-engagement LinkedIn copy.
*   **AI Image Generation**: Generates cinematic, high-quality images using **FLUX.1-schnell** via NVIDIA NIM.
*   **Dynamic Branding**: Automatically overlays titles, bullet points, and corporate branding onto generated images using the **Sharp** engine.
*   **LinkedIn Publishing**: One-click (or scheduled) publishing directly to your LinkedIn personal profile or company page.
*   **Desktop Dashboard**: A sleek, dark-mode Electron app to monitor progress and trigger posts with a single click.

---

## 🛠️ Tech Stack

*   **Runtime**: Node.js (ESM)
*   **Desktop App**: Electron
*   **AI Models**: NVIDIA NIM (Llama 3.3 70B & FLUX.1-schnell)
*   **APIs**: Google Sheets API v4, LinkedIn REST API
*   **Image Processing**: Sharp (Native C++ image compositor)
*   **Logging**: Pino + Pino-Pretty (detailed real-time execution logs)

---

## 🚀 Getting Started

### 1. Prerequisites
*   Node.js (v18+)
*   NVIDIA NIM API Key ([Get one here](https://build.nvidia.com/))
*   Google Cloud Service Account ([Setup Guide](https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication))
*   LinkedIn Developer App with `w_member_social` permissions.

### 2. Installation
```powershell
git clone https://github.com/readercoder/personal_post_generator.git
cd personal_post_generator
npm install
```

### 3. Configuration
Copy `.env.example` to `.env` and fill in your credentials:
```bash
# General
DRY_RUN=false
LOG_LEVEL=info

# Google Sheets
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./credentials/google-service-account.json

# NVIDIA NIM
NVIDIA_API_KEY=nvapi-xxxxxxx

# LinkedIn
LINKEDIN_ACCESS_TOKEN=your_token
LINKEDIN_PERSON_URN=urn:li:person:xxxxxx
```

---

## 🖥️ Usage

### Desktop App (Recommended)
Launch the premium dashboard to see real-time log streaming and a step-by-step progress bar.
```powershell
npm run desktop
```

### CLI Run
Run a single pipeline execution directly in your terminal.
```powershell
# Real run
npm run run-once

# Dry run (test everything without actually posting)
$env:DRY_RUN="true"; npm run run-once
```

### Automated Scheduling
The pipeline includes a built-in cron scheduler (default: 8 AM daily).
```powershell
npm start
```

---

## 📁 Project Structure

```text
├── electron/          # Desktop app main process and UI
├── n8n/               # Legacy n8n workflow archives (for reference)
├── src/
│   ├── lib/           # Shared clients (Google, LinkedIn, NVIDIA)
│   ├── scripts/       # Auth helpers (getLinkedInToken.mjs)
│   ├── steps/         # Individual pipeline steps (Step 1 - Step 7)
│   └── pipeline.mjs   # The main orchestrator
├── .env               # Private credentials (ignored by git)
└── package.json
```

---

## 🛡️ Security

This is a **Local-First** application. 
*   **No Cloud Storage**: Your API keys and tokens never leave your machine.
*   **Git-Safe**: Sensitive files are pre-configured in `.gitignore`.
*   **OAuth Security**: Uses standard LinkedIn OAuth2 flow for secure session management.

---

## 📄 License
MIT License - Created by [readercoder](https://github.com/readercoder)

# CHAKEN Sub 🎙️ ➔ 🇹🇭

**CHAKEN Sub** is a high-precision, real-time English-to-Thai meeting subtitle translation web application inspired by Felo Subtitles. It translates spoken English from Zoom, Google Meet, Microsoft Teams, and YouTube into natural Thai in real-time.

---

## ✨ Features

- **⚡ Real-time Bilingual / Thai Subtitles:** Word-by-word streaming English speech recognition with instant low-latency Thai translation (< 300ms).
- **🎛️ Dual Audio Sources:**
  - 🎙️ **Microphone (Web Speech API):** Live speech recognition from your microphone.
  - 💻 **Meeting Tab Audio:** Capture audio directly from Google Meet, Zoom, MS Teams, or YouTube tabs.
- **🖥️ Picture-in-Picture (PiP) Floating Subtitle Bar:**
  - Always-on-top floating subtitle overlay over Zoom / Meet windows using Document PiP and Canvas Video PiP.
- **📚 Custom Terminology Dictionary:**
  - Map English tech & business terms (e.g. `Sprint`, `PR`, `KPI`, `Backend`, `Deploy`) to custom Thai translations.
- **📝 AI Meeting Minutes (Smart Summary):**
  - Instant Thai executive summary, key points, action items (with owners & deadlines), and agreed decisions with 1-click Markdown export.
- **📤 Export & Sharing:**
  - Download `.srt` subtitle files with accurate timestamps, `.txt` transcripts, or `.json`.
  - QR Code and live sharing link for mobile second-screen viewing.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/piromc-rgb/pirom_cksub.git
cd pirom_cksub

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in Google Chrome or Microsoft Edge.

---

## 🛠️ Tech Stack

- **Frontend:** React 19 / 18, TypeScript, Vite
- **Styling:** Tailwind CSS, Glassmorphism UI
- **Icons:** Lucide React
- **Translation:** Local Vite proxy middleware via Google Chrome Extension Dictionary API (`clients5.google.com`)
- **Overlay:** Document Picture-in-Picture API & HTML5 Canvas Video PiP

---

## 📄 License
MIT License

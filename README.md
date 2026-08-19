<div align="center">

# 📖 Quran Audio Tracker (PWA)

**A lightweight, cross-platform, battery-optimized Quran recitation tracker with real-time multi-device cloud synchronization.**

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge)](LICENSE)

[Live Demo](#) • [Features](#-features) • [Installation](#-getting-started) • [Firebase Setup](#-firebase-configuration) • [PWA Guide](#-pwa-installation)

</div>

---

## 🌟 Overview

**Quran Audio Tracker** is a high-performance Progressive Web Application (PWA) designed to solve the problem of losing your listening position across devices. Whether you listen on your smartphone during your commute or on your laptop at home, your playback position, active Surah, and reciter preferences stay seamlessly synchronized.

Built with a **zero-overhead architecture**, it uses pure HTML5 hardware audio decoding and throttled Firestore writes to ensure ultra-low battery consumption and fluid performance even on older mobile devices.

---

## 🏗️ Architecture & Tech Stack

```
   ┌────────────────────────────────────────────────────────┐
   │             Frontend: React 19 + TypeScript            │
   │   - Vite 8 & vite-plugin-pwa (Standalone App)          │
   │   - Hardware-Accelerated HTML5 <audio> Engine          │
   │   - MediaSession API (Lock-screen & Background Audio)  │
   │   - Obsidian & Emerald Glassmorphic Design System      │
   └───────────────┬────────────────────────┬───────────────┘
                   │                        │
       1. Stream Quran / SoundCloud    2. Sync timestamps & bookmarks
                   │                        │
                   ▼                        ▼
       ┌───────────────────────┐  ┌────────────────────────┐
       │   High-Speed Audio    │  │  Firebase Cloud        │
       │   CDNs & SoundCloud   │  │  Firestore (Modular v9)│
       │   (114 Surahs)        │  │  + Offline Local Cache │
       └───────────────────────┘  └────────────────────────┘
```

- **Frontend Core:** React 19, TypeScript, Vite
- **Mobile Engine:** Progressive Web App (PWA) with Service Worker offline caching
- **Database & Sync:** Cloud Firestore (Modular Web SDK v9) with instant LocalStorage fallback
- **Audio Engine:** Native HTML5 Audio + `navigator.mediaSession`
- **Styling:** Bespoke Obsidian & Emerald Glassmorphic CSS Design System

---

## ✨ Features

- 📱 **Zero-Overhead Mobile PWA:** Installs directly to iOS and Android home screens as a native-feeling standalone app without app store bloat.
- 🔄 **Cross-Device Progress Sync:** Automatically remembers your exact second and Surah across phone, tablet, and desktop.
- ⚡ **Battery & Data Optimized:** Hardware-accelerated audio streaming with throttled background database sync (only saves on pause, track end, or periodic checkpoints).
- 🔒 **Lock-Screen & Background Playback:** Full integration with Android Notifications, iOS Control Center, and lock-screen media controls via the `MediaSession` API.
- 🎙️ **8 Curated World-Class Reciters:**
  - Sheikh Mishary Rashid Alafasy (مشاري بن راشد العفاسي)
  - Sheikh Abdul Rahman Al-Sudais (عبد الرحمن السديس)
  - Sheikh Maher Al-Muaiqly (ماهر المعيقلي)
  - Sheikh Yasser Al-Dosari (ياسر الدوسري)
  - Sheikh Abu Bakr Al-Shatri (أبو بكر الشاطري)
  - Sheikh Saad Al-Ghamdi (سعد الغامدي)
  - Sheikh Mahmoud Khalil Al-Husary (محمود خليل الحصري)
  - Sheikh Abdulbasit Abdulsamad (عبد الباسط عبد الصمد)
- 📜 **Full 114 Surahs Catalog:** Complete with Arabic calligraphy typography, English transliteration, English meaning, verse count, and Meccan/Medinan tags.
- 🔍 **Instant Real-Time Search & Filtering:** Filter Surahs by number, Arabic title, English name, Meccan/Medinan classification, or "In-Progress" status.
- 🎛️ **Full Player Controls:** Variable playback speed (0.75x – 2.0x), quick ±10s seek, repeat track/playlist modes, and time scrubber.
- 🔗 **Custom Stream & SoundCloud Importer:** Paste custom direct MP3/AAC audio streams or import SoundCloud playlists by ID.
- 🛡️ **Graceful Offline Mode:** Fully functional out-of-the-box using local storage persistence even without configuring Firebase keys.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.0 or higher)
- `npm`, `pnpm`, or `yarn`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/quran-audio-tracker.git
   cd quran-audio-tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

4. **Build for production:**
   ```bash
   npm run build
   ```

---

## ⚙️ Firebase Configuration

The app works in **Offline Local Mode** by default. To enable cross-device cloud sync with Cloud Firestore:

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Create a project**.
3. Enable **Cloud Firestore** in test mode or production mode.

### 2. Firestore Security Rules
Add the following rules in your Firestore Rules tab:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /listening_progress/{document} {
      allow read, write: if true; // Or restrict to authenticated users
    }
  }
}
```

### 3. Connect Keys
You can configure Firebase in two ways:

#### Option A: In-App Settings Modal (Easiest)
Click the **Settings (⚙️)** icon in the app header and paste your Firebase API Key, Project ID, and App ID.

#### Option B: Environment Variables (`.env`)
Create a `.env` file in the root folder:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_SOUNDCLOUD_CLIENT_ID=optional_soundcloud_client_id
```

---

## 📱 PWA Installation

### On iOS (iPhone / iPad)
1. Open the deployed web app URL in **Safari**.
2. Tap the **Share** icon (square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.

### On Android
1. Open the web app URL in **Google Chrome**.
2. Tap the three-dot menu icon in the top right.
3. Tap **Install app** or **Add to Home screen**.

---

## 📂 Project Structure

```
quranPlayer/
├── public/
│   ├── favicon.svg              # App icon & SVG vector logo
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── AudioPlayer.tsx      # Native HTML5 player with MediaSession & autosave
│   │   ├── CustomStreamModal.tsx # MP3 & SoundCloud stream importer
│   │   ├── Header.tsx           # App navbar, Sync ID & status indicator
│   │   ├── ReciterSelector.tsx  # Reciter card carousel
│   │   ├── ResumeBanner.tsx     # Hero banner for one-tap playback resume
│   │   ├── SettingsModal.tsx    # Firebase & Sync ID manager modal
│   │   └── TrackList.tsx        # Surahs list with search & filter chips
│   ├── firebase/
│   │   └── config.ts            # Modular Firebase initialization
│   ├── services/
│   │   ├── quranData.ts         # Catalog of 114 Surahs & 8 reciters
│   │   ├── soundcloud.ts        # SoundCloud playlist fetcher & custom track builder
│   │   └── storage.ts           # Unified Firestore + LocalStorage sync layer
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces & models
│   ├── App.tsx                  # Root application component
│   ├── index.css                # Global design system & animations
│   └── main.tsx                 # React DOM mount point
├── index.html                   # HTML5 entry with PWA tags & Google Fonts
├── vite.config.ts               # Vite configuration with vite-plugin-pwa
├── tsconfig.json                # TypeScript project configuration
└── package.json                 # Project dependencies & scripts
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
  <sub>Made with ❤️ for the global Muslim community. May it bring benefit.</sub>
</div>

<div align="center">

# 📖 Quran Audio Tracker (PWA)

**A modern, lightweight, mobile-first Quran recitation player with real-time multi-device cloud synchronization, 100% offline playback, and native PWA support.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-quran--player.muslimhub.link-059669?style=for-the-badge&logo=cloudflare&logoColor=white)](https://quran-player.muslimhub.link)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite 8](https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge)](LICENSE)

[🌐 Live App](https://quran-player.muslimhub.link) • [✨ Features](#-key-features) • [📶 Offline Mode](#-100-offline-capability) • [🎨 Themes & Accents](#-theming--customization) • [⚙️ Setup](#-getting-started) • [📱 PWA & Lock-Screen Guide](#-mobile-installation--lock-screen-controls)

</div>

---

## 🌟 Overview

**Quran Audio Tracker** is a high-performance, battery-optimized Progressive Web Application (PWA) created to eliminate the frustration of losing your listening position across different devices. 

Whether you listen on your smartphone during your daily commute or on your laptop at home, your playback position, active Surah, favorites, and reciter preferences stay seamlessly synchronized across all your devices via Cloud Firestore.

---

## ✨ Key Features

### 🎛️ 1. Modern Audio Player Experience
- **Persistent Floating Mini-Player Bar:** Always visible and anchored at the bottom of the screen, pre-loaded with your last session so you can resume listening with a single tap.
- **Expandable Full-Screen Player Sheet:** Tap the mini-player pill to reveal a stunning full-screen Now-Playing sheet featuring:
  - Centerpiece gold Arabic calligraphy medallion.
  - Live animated audio equalizer waves.
  - High-precision timeline scrubber with formatted timestamps.
  - Hero playback controls (`Play / Pause`, `±10s Seek`, `Next / Prev`).
  - **🌙 Sleep Timer:** Automatic shut-off after 15m, 30m, 45m, 60m, or at the End of Surah.
  - **⚡ Variable Playback Speed:** 0.75x, 1.0x, 1.25x, 1.5x, 1.75x, 2.0x.
  - **⭐ 1-Tap Favorites:** Star Surahs to pin and easily filter your favorite recitations.
  - **📤 Native Share:** Share the currently playing Surah directly to WhatsApp, Telegram, or social media.

### 📶 2. 100% Offline Capability (Airplane Mode)
- **Automatic Smart Caching:** Streams are automatically cached via Workbox `CacheFirst` runtime caching.
- **📥 1-Tap Manual Download for Offline:** Tap the download icon in the Full-Screen player to download and store any Surah into your browser's persistent `CacheStorage` for zero-data listening on flights or travels.
- **Complete App Shell Offline:** The entire 114 Surahs catalog, Arabic typography, and tracker interface work completely without an internet connection.

### ☁️ 3. Seamless Multi-Device Email Sync
- **No Passwords Required:** Simply enter your email address in Settings to instantly link and sync your listening timestamps, favorites, and settings across your phone, tablet, and computer.
- **Zero Data Loss:** Offline updates are stored locally and automatically pushed to Cloud Firestore the moment internet connectivity returns.

### 🎙️ 4. 8 World-Class Reciters & Recitation Styles
- **Story-Style Reciter Carousel:** Horizontal story avatars with style filter chips (*All*, *Murattal*, *Mujawwad*, *Haram Makkah*):
  1. Sheikh Mishary Rashid Alafasy (مشاري بن راشد العفاسي)
  2. Sheikh Abdul Rahman Al-Sudais (عبد الرحمن السديس)
  3. Sheikh Maher Al-Muaiqly (ماهر المعيقلي)
  4. Sheikh Yasser Al-Dosari (ياسر الدوسري)
  5. Sheikh Abu Bakr Al-Shatri (أبو بكر الشاطري)
  6. Sheikh Saad Al-Ghamdi (سعد الغامدي)
  7. Sheikh Mahmoud Khalil Al-Husary (محمود خليل الحصري)
  8. Sheikh Abdulbasit Abdulsamad (عبد الباسط عبد الصمد)

### 📜 5. Full 114 Surahs Catalog & Instant Search
- **Islamic Geometry Badges:** Octagonal calligraphy numbers with live soundwave animations on active tracks.
- **Quick Filters:** Filter by *All*, *Favorites (⭐)*, *In Progress (⏳)*, *Meccan (مكية)*, or *Medinan (مدنية)*.
- **Live Search:** Instant fuzzy search across Surah numbers, English names, and Arabic calligraphy.

### 📏 6. Slim & Compact "Resume Recitation" Banner
- Space-efficient, single-row banner showing your last active Surah, reciter, timestamp, and completion percentage without cluttering your screen.

---

## 🎨 Theming & Customization

Switch seamlessly between Light and Dark themes, paired with 4 curated accent colors:

| Accent Palette | Primary Color | Description |
| :--- | :--- | :--- |
| **Emerald Oasis** (Default) | `#059669` | Classic Islamic architectural emerald green |
| **Royal Gold** | `#d97706` | Warm, radiant gilded amber |
| **Royal Indigo** | `#4f46e5` | Deep, serene nocturnal indigo |
| **Sapphire Blue** | `#0284c7` | Crisp, modern ocean sapphire |

---

## 📱 Mobile Installation & Lock-Screen Controls

### Installing as a Native PWA App:
- **On Android (Chrome / Samsung Internet):**
  1. Open [https://quran-player.muslimhub.link](https://quran-player.muslimhub.link).
  2. Tap the `⋮` menu ➔ **"Install app"** (or **"Add to Home screen"**).
- **On iOS (iPhone / iPad - Safari):**
  1. Open the URL in **Safari**.
  2. Tap the **Share** button ➔ **"Add to Home Screen"**.
- **On Windows (Chrome / Edge):**
  1. Open the URL ➔ click the **"Install" icon** in the browser address bar.
  2. Runs as a standalone frameless Windows app pinned to your Taskbar.

### 🎛️ Lock-Screen & Drop-Down Menu Controls:
The app integrates with the **HTML5 MediaSession API** to provide background playback and lock-screen controls:
- **Notification Drop-Down Shade:** Play, pause, scrub timestamps, and skip Surahs.
- **Lock Screen:** High-res Surah artwork medallion, title, and scrubber.

> [!TIP]
> **Android Notification Settings:** On Android 13+, ensure that notifications for your browser or the installed PWA are enabled in **Android Settings ➔ Apps ➔ Chrome/Quran Player ➔ Notifications (Allowed)** so Android displays the media control card.

---

## 🏗️ Architecture & Tech Stack

```
   ┌────────────────────────────────────────────────────────┐
   │             Frontend: React 19 + TypeScript            │
   │   - Vite 8 & vite-plugin-pwa (Standalone App)          │
   │   - Hardware-Accelerated HTML5 <audio> Engine          │
   │   - MediaSession API (Lock-screen & Background Audio)  │
   │   - Mobile-First Glassmorphic CSS Design System        │
   │   - Workbox Offline Runtime Audio CacheStorage         │
   └───────────────┬────────────────────────┬───────────────┘
                   │                        │
       1. Stream MP3Quran CDN / Custom  2. Real-time timestamp sync
                   │                        │
                   ▼                        ▼
       ┌───────────────────────┐  ┌────────────────────────┐
       │  High-Speed Quran     │  │  Firebase Cloud        │
       │  Audio CDN Servers    │  │  Firestore (Modular v9)│
       │  (114 Surahs)         │  │  + Offline LocalStorage│
       └───────────────────────┘  └────────────────────────┘
```

- **Frontend Core:** React 19, TypeScript, Vite 8
- **PWA & Offline:** `vite-plugin-pwa`, Workbox Service Worker, Browser Cache API
- **Database & Sync:** Cloud Firestore with automatic `localStorage` fallback
- **Audio Engine:** Native HTML5 Audio + `navigator.mediaSession`
- **Icons & Typography:** Lucide React, Google Amiri & Plus Jakarta Sans fonts

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0 or higher)
- `npm` / `pnpm` / `yarn`

### Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mahmoud-ferig/Quran-Audio-Tracker-PWA-.git
   cd quranPlayer
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

4. **Build and test for production:**
   ```bash
   npm run build
   ```

---

## ⚙️ Cloud Firestore Deployment & Security Rules

To configure your own Firebase backend:
1. Create a project on the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Cloud Firestore**.
3. Deploy the following security rules from `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /listening_progress/{document} {
      allow read, write: if true;
    }
    match /user_favorites/{document} {
      allow read, write: if true;
    }
    match /user_settings/{document} {
      allow read, write: if true;
    }
  }
}
```

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
  <sub>Made with ❤️ for the global Muslim community. May it bring benefit and blessings.</sub>
</div>

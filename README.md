# NaviKid - School Van Tracker

Real-time school van tracking system with three applications:
- **Mobile App** (React Native / Expo) — Parent & Driver portals
- **Admin Web** (React / Vite) — Admin dashboard
- **Backend** (Express.js) — REST API with Firebase

## Prerequisites

- Node.js 18+
- npm

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npm start
```

Server runs on `http://localhost:3001`

### 2. Mobile App (Expo)

```bash
cd Frontend/admin
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `w` for web.

### 3. Admin Web Dashboard

```bash
cd Frontend/admin-web
npm install
npm run dev
```

Opens on `http://localhost:5173`

## Environment Variables

All environment configs are pre-configured in `.env.example` files. They are automatically copied to `.env` on `npm install` if `.env` doesn't already exist.

If you need to customize, edit the `.env` file in each project folder.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native, Expo Router, React Native Maps |
| Web Admin | React, Vite, Leaflet |
| Backend | Express.js, Firebase Admin SDK |
| Database | Cloud Firestore |
| Auth | Firebase Authentication |
| Notifications | Expo Push Notifications |

# 🚀 Railway Deployment Guide — Campus Resource Hub

This guide details how to deploy the **Campus Resource Hub** (React + Vite, Node.js + Express, Socket.IO, MongoDB Atlas, and Cloudinary) as a **single unified production service** on [Railway](https://railway.app).

---

## 🏗️ Architecture Overview

The application is architected as a full-stack monorepo designed to build and deploy in a single Railway service container:
1. **Frontend Build**: The React SPA is built into `/client/dist` via Vite.
2. **Static Asset Serving**: Express serves `/client/dist` directly at `/` and handles client-side routing via a Single Page Application (SPA) catch-all fallback.
3. **API & Real-time WebSockets**: Express routes `/api/*` and Socket.IO real-time channels run on the same HTTP server and port, eliminating cross-origin issues in production.

---

## 📋 Prerequisites

Before deploying, ensure you have:
1. A **GitHub account** with access to this repository.
2. A **Railway account** ([railway.app](https://railway.app)).
3. A **MongoDB Atlas** cluster with your database connection URI.
4. A **Cloudinary** account with your Cloud Name, API Key, and API Secret.

---

## ⚙️ Step 1: Connect GitHub Repository to Railway

1. Log in to [Railway](https://railway.app) and open your dashboard.
2. Click **"New Project"** → select **"Deploy from GitHub repo"**.
3. Choose the `campus-resource-hub` repository.
4. Click **"Deploy Now"**.

> **Note**: Railway will automatically detect the root `package.json` and use the unified build pipeline:
> - **Build Command**: `npm run build` (installs client dependencies, builds the Vite production bundle to `client/dist`, and installs server dependencies).
> - **Start Command**: `npm start` (runs `node server/server.js`).

---

## 🔑 Step 2: Configure Environment Variables in Railway

In your Railway project dashboard:
1. Click on the newly created service.
2. Navigate to the **"Variables"** tab.
3. Click **"New Variable"** or **"Raw Editor"** and add the following keys:

| Variable Name | Required | Example / Description |
|---|---|---|
| `NODE_ENV` | **Yes** | `production` |
| `PORT` | **Yes** | `5000` *(or let Railway inject its default port)* |
| `MONGODB_URI` | **Yes** | `mongodb+srv://<username>:<password>@cluster0.mongodb.net/campus-resource-hub?retryWrites=true&w=majority` |
| `JWT_SECRET` | **Yes** | A secure random 64-character string (e.g. `c7e94f1b...`) |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | **Yes** | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | **Yes** | Your Cloudinary API secret |
| `CLIENT_URL` | Optional | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |

> [!IMPORTANT]
> **MongoDB Atlas Network Access**: In your MongoDB Atlas dashboard, navigate to **Network Access** and ensure IP `0.0.0.0/0` (Allow access from anywhere) is whitelisted so Railway containers can connect to your database.

---

## 🌐 Step 3: Generate a Public Domain

1. In your Railway service settings, go to the **"Settings"** tab.
2. Scroll down to the **"Networking"** section.
3. Under **Public Networking**, click **"Generate Domain"** (e.g. `campus-resource-hub-production.up.railway.app`).
4. (Optional) You can attach a custom domain if desired.

---

## 🌱 Step 4: Seed Database (Courses & QC Curriculum)

To populate the academic courses (`CSE-QC`, `CSE`, `AIE`, `AIDS`, `CCE`, `ECE`) and the full 8-semester Quantum Computing curriculum:

### Option A: Via Railway One-off Command / CLI
Run the seed script in your Railway environment:
```bash
railway run npm run seed
```

### Option B: Via Railway Web Terminal
1. Open your service in Railway.
2. Go to the **"Exec"** or **"Terminal"** tab.
3. Run:
   ```bash
   npm run seed
   ```

---

## 🔄 Step 5: Continuous Deployment (Auto-deploy on Git Push)

Railway automatically sets up webhook integrations with GitHub:
- Whenever you push new commits to the `main` branch (`git push origin main`), Railway automatically triggers a fresh build and performs a **zero-downtime deployment**.
- You can inspect real-time deployment logs under the **"Deployments"** tab in Railway.

---

## ✅ Step 6: Verifying the Live Deployment

Once the deployment status shows **Active / Success**:

1. **Health Check Endpoint**:
   - Open your browser or run:
     ```bash
     curl https://your-railway-domain.up.railway.app/api/health
     ```
   - Expected response:
     ```json
     {
       "status": "ok",
       "environment": "production",
       "uptime": 12.34,
       "timestamp": "2026-09-26T10:35:00.000Z"
     }
     ```

2. **Frontend UI & React Router**:
   - Visit `https://your-railway-domain.up.railway.app/`.
   - Verify the landing page loads cleanly with modern dark theme and navigation.

3. **User Authentication & Section Selection**:
   - Visit `/signup`.
   - Select a Course (e.g. `CSE-QC`, `CSE`, or `AIE`) and verify the **Section dropdown** populates dynamically (`A`, `B`, `C`).
   - Create a student account and verify auto-redirect to `/dashboard`.

4. **Real-time Class Group Chat & 1:1 Direct Messages**:
   - Navigate to `/chat`.
   - Verify the socket status indicator shows **"Online" / "Real-Time Active"**.
   - Check that the user's class group room (e.g. `CSE-QC · Class Group`) is pinned at the top.
   - Test sending messages and attaching study files/notes up to 20MB.

5. **Cloudinary Upload & File Previews**:
   - As a Lecturer or approved CR, visit `/upload`.
   - Upload a sample PDF notes/question paper.
   - Verify the document renders on `/resources` with preview and download counters.

---

## 🛠️ Troubleshooting & Diagnostics

- **Build Fails during `npm run build`**:
  - Ensure Node version is 18+ (`"node": ">=18.0.0"` in `package.json`).
- **MongoDB Connection Error**:
  - Check that `MONGODB_URI` does not have angle brackets around password/user, and Atlas Network Access allows `0.0.0.0/0`.
- **Chat Socket Disconnected**:
  - Ensure your Railway domain uses HTTPS/WSS (Railway handles SSL certificates automatically).

# 🎓 Campus Resource Hub

A unified academic resource repository and real-time campus collaboration platform built for engineering students and faculty. In many universities, critical study materials, mid-sem/end-sem question papers, and lab manuals are scattered across chaotic WhatsApp groups, expired Google Drive links, and personal chats. **Campus Resource Hub** solves this fragmentation by providing an organized Course → Semester → Subject hierarchy, role-based upload moderation, and a built-in real-time class group chat and 1:1 direct messaging system that connects students, Class Representatives (CRs), and lecturers seamlessly.

---

## 🌐 Live Deployment

- **Production URL:** [https://campus-resource-hub.up.railway.app](https://campus-resource-hub.up.railway.app) *(Railway)*
- **Health Check:** [https://campus-resource-hub.up.railway.app/api/health](https://campus-resource-hub.up.railway.app/api/health)

---

## 🏛️ System Architecture

```text
               +-------------------------------------------------------------+
               |                    CLIENT BROWSER                           |
               |  React 19 SPA + React Router + TailwindCSS + Socket.IO-Client |
               +-------------------------------------------------------------+
                                       |              ^
                        HTTP REST / JSON              | WebSocket Events
                                       v              |
               +-------------------------------------------------------------+
               |                  EXPRESS & SOCKET.IO SERVER                 |
               |                                                             |
               |  * JWT Handshake & RBAC Middleware (protect, requireRole)  |
               |  * REST Endpoints (/api/resources, /api/auth, /api/chat)    |
               |  * Real-Time Rooms (Group Broadcasts & 1:1 DMs)             |
               |  * Multer Memory Buffer Streamer                            |
               +-------------------------------------------------------------+
                               /                             \
                              /                               \
                             v                                 v
    +------------------------------------+         +------------------------------------+
    |         MONGODB ATLAS              |         |         CLOUDINARY CDN             |
    |  * Users & Pending CR Approvals    |         |  * PDFs, Docs, PPTX, Images        |
    |  * Courses, Semesters & Subjects   |         |  * Secure URLs & Byte Streaming    |
    |  * Resources, Download Metrics     |         |  * Chat Attachments                |
    |  * ChatRooms, Messages & DirectKeys|         |                                    |
    +------------------------------------+         +------------------------------------+
```

---

## 👥 User Roles & Access Matrix

| Role | Browse & Preview | Download Files | Class & 1:1 Chat | Upload Resources | Edit/Delete Resources | Approve/Reject CRs | Analytics & Feed |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Student** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Class Rep (CR)** | ✅ | ✅ | ✅ | ✅ *(After Approval)* | ✅ *(Own Class)* | ❌ | ❌ |
| **Lecturer** | ✅ | ✅ | ✅ | ✅ | ✅ *(All Classes)* | ✅ | ✅ |

- **Student**: Auto-approved at signup; accesses pre-filtered class materials and participates in class group chat & 1:1 direct messages.
- **Class Representative (CR)**: Created in pending state (`isApproved: false`); granted class-wide resource management once verified by a lecturer.
- **Lecturer / Faculty**: Auto-approved; exercises administrative oversight across all courses, approves/rejects pending CRs, conducts bulk deletions, and monitors weekly download metrics and audit logs.

---

## 🛠️ Tech Stack & Technology Justifications

- **React 19 & Vite**: Provides lightning-fast HMR and modular component state management for complex views like real-time chat and document previewers.
- **Tailwind CSS (v4)**: Enables responsive styling with custom color tokens per resource type and dark-mode ergonomics optimized for mobile screens between classes.
- **Node.js & Express**: Event-driven runtime with non-blocking I/O that powers both REST endpoints and the Socket.IO server on a single HTTP port.
- **Socket.IO**: Delivers low-latency bidirectional real-time communication for instant messaging and presence indicators.
- **MongoDB Atlas & Mongoose**: Flexible document model supporting multi-level hierarchies (`Course → Semester → Subject`) with compound indexes for fast queries.
- **Cloudinary**: Dedicated media CDN that offloads large binary files (PDFs/DOCXs up to 20MB) from the database and delivers high-speed asset streaming.
- **Railway**: Streamlines continuous integration and zero-downtime deployments from GitHub with containerized full-stack execution.

---

## 💡 Key Design Decisions

### 1. Why Store Files in Cloudinary Instead of the Database?
MongoDB document size is strictly capped at 16MB (BSON limit). While GridFS can chunk binary data across multiple documents, storing large files inside the database creates database bloat, degrades query caching, and consumes expensive database RAM during file transfers. Cloudinary provides global CDN edge delivery, automatic MIME detection, byte-range streaming for PDF previews, and offloads heavy I/O workloads from the application server.

### 2. Why Enforce Role Checks in Server Middleware Instead of Frontend?
Client-side conditional rendering (e.g. hiding an "Upload" button) is purely cosmetic and can easily be bypassed by spoofing HTTP requests or manipulating React state in developer tools. Server-side middleware (`protect` and `requireRole`) validates the cryptographically signed JWT and checks database permissions on **every single endpoint and WebSocket event**, ensuring zero-trust security.

### 3. Why Require Lecturer Approval for Class Representative (CR) Accounts?
CR accounts possess elevated privileges: they can publish study resources visible to the entire class and modify educational content. Self-assigning CR status without verification would allow bad actors to upload incorrect materials or spam the class repository. Requiring lecturer approval guarantees only legitimate student leaders hold moderation rights.

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **MongoDB Atlas** connection string or local MongoDB instance
- **Cloudinary** account credentials

---

### Step 1: Clone Repository
```bash
git clone https://github.com/gvschaturved2008-IKAI/campus-resource-hub.git
cd campus-resource-hub
```

---

### Step 2: Configure Environment Variables

Create a `.env` file in `/server` (you can copy from `server/.env.example`):
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/campus-resource-hub?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

### Step 3: Install Dependencies & Seed Database

```bash
# Install all dependencies (root, client, server)
npm run build

# Seed Courses (CSE-QC, CSE, AIE, etc.) and Quantum Computing Curriculum
npm run seed
```

---

### Step 4: Run Locally

You can run client and server simultaneously in separate terminals:

```bash
# Terminal 1: Backend Server & WebSockets (Port 5000)
npm run dev

# Terminal 2: Frontend Vite Development Server (Port 5173)
npm run client
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔮 What I'd Add Next (Future Roadmap)

1. **In-Browser Collaborative Annotations & Highlighting**:
   - Enable students and professors to add collaborative highlights, marginalia, and sticky notes directly onto PDF slides and shared question papers in real time.
2. **Offline-First Web Push Notifications**:
   - Implement the Service Worker Web Push API to alert students when a lecturer uploads an urgent question paper or when they receive an important 1:1 direct message while offline.
3. **AI-Powered Semantic Document Search**:
   - Integrate vector embeddings (via MongoDB Atlas Vector Search) to allow students to search for concepts across the text content of all uploaded PDFs rather than searching only by document title.

---

## 📜 License
This project is licensed under the [ISC License](LICENSE).

# Campus Resource Hub

A modern full-stack web application designed to help campus communities discover, share, and manage academic and campus resources effectively.

---

## 🛠️ Tech Stack

### Frontend (`/client`)
- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)

### Backend (`/server`)
- **Runtime:** [Node.js](https://nodejs.org/)
- **Framework:** [Express.js](https://expressjs.com/)
- **Database & ODM:** [MongoDB Atlas](https://www.mongodb.com/atlas) + [Mongoose](https://mongoosejs.com/)
- **Storage:** Cloudinary
- **Utilities:** `cors`, `dotenv`, `nodemon`

---

## 📁 Project Structure

```text
campus-resource-hub/
├── client/                     # Frontend React + Vite application
│   ├── public/                 # Static assets
│   ├── src/                    # React source code & Tailwind styles
│   │   ├── assets/             # Images, icons, and media
│   │   ├── App.jsx             # Root React component
│   │   ├── index.css           # Global stylesheet with Tailwind CSS
│   │   └── main.jsx            # Application entry point
│   ├── index.html              # HTML template
│   ├── package.json            # Client dependencies and scripts
│   └── vite.config.js          # Vite configuration with Tailwind plugin
│
├── server/                     # Backend Node.js + Express API
│   ├── config/                 # Database configuration (MongoDB Atlas connection)
│   ├── controllers/            # Request handlers / controllers
│   ├── middleware/             # Express middlewares (e.g. error handling)
│   ├── models/                 # Mongoose schemas (User, Resource, Class)
│   ├── routes/                 # API endpoint route definitions
│   ├── .env.example            # Sample environment variables
│   ├── package.json            # Server dependencies and scripts
│   └── server.js               # Server entry point
│
├── .gitignore                  # Root gitignore for client, server & dependencies
└── README.md                   # Project overview and setup instructions
```

---

## 🗄️ Database Schemas & Indexes

1. **User Schema (`models/User.js`)**
   - Fields: `name`, `email` (unique, lowercase, trimmed), `passwordHash`, `role` (`student`, `cr`, `lecturer`), `department`, `semester`, `classSection`, `createdAt`.
   - Indexes: Unique on `email`, compound index on `{ role: 1, department: 1, semester: 1, classSection: 1 }`.

2. **Resource Schema (`models/Resource.js`)**
   - Fields: `title`, `description`, `subject`, `semester`, `resourceType` (`notes`, `question-paper`, `lab-manual`, `link`, `other`), `fileUrl`, `fileType`, `uploadedBy` (ref: `User`), `classSection`, `downloadCount`, `createdAt`.
   - Indexes: Compound index on `{ subject: 1, semester: 1, resourceType: 1 }`, `{ semester: 1, classSection: 1 }`, `{ uploadedBy: 1 }`, and `{ createdAt: -1 }`.

3. **Class Schema (`models/Class.js`)**
   - Fields: `name`, `subject`, `semester`, `lecturer` (ref: `User`), `classReps` (array ref: `User`), `students` (array ref: `User`), `createdAt`.
   - Indexes: `{ subject: 1, semester: 1 }`, `{ lecturer: 1 }`, `{ classReps: 1 }`, and `{ students: 1 }`.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB Atlas** Account or local MongoDB instance
- **Git**

---

### 📦 Installation

Clone the repository:
```bash
git clone https://github.com/gvschaturved2008-IKAI/campus-resource-hub.git
cd campus-resource-hub
```

#### 1. Setup Client
```bash
cd client
npm install
```

#### 2. Setup Server
```bash
cd ../server
npm install
```

---

## 💻 Running Locally

You can run both client and server in separate terminal windows:

### Start Backend Server
```bash
cd server
# Copy environment file
cp .env.example .env

# Run in development mode (with hot reload)
npm run dev

# Or run in production mode
npm start
```
The server will run on `http://localhost:5000` (or the port defined in `.env`).  
Health check endpoint: `http://localhost:5000/api/health`

### Start Frontend Client
```bash
cd client
npm run dev
```
The Vite development server will run on `http://localhost:5173`.

---

## ⚙️ Environment Variables

### Server (`/server/.env`)
| Variable | Description | Required | Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Port for Express server | No (defaults to 5000) | `5000` |
| `NODE_ENV` | Environment mode (`development` / `production`) | No | `development` |
| `CLIENT_URL` | Allowed CORS origin for frontend | No | `http://localhost:5173` |
| `MONGODB_URI` | MongoDB Atlas connection string | **Yes** | `mongodb+srv://<user>:<pwd>@cluster.mongodb.net/campus_resource_hub` |
| `JWT_SECRET` | Secret key for JWT auth tokens | **Yes** | `your_secure_jwt_secret` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for resource storage | **Yes** | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | **Yes** | `your_api_key` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | **Yes** | `your_api_secret` |

---

## 📜 License
ISC

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
│   ├── config/                 # Database and environment configurations
│   ├── controllers/            # Request handlers / controllers
│   ├── middleware/             # Express middlewares (e.g. error handling)
│   ├── models/                 # Data schemas / models
│   ├── routes/                 # API endpoint route definitions
│   ├── .env.example            # Sample environment variables
│   ├── package.json            # Server dependencies and scripts
│   └── server.js               # Server entry point
│
├── .gitignore                  # Root gitignore for client, server & dependencies
└── README.md                   # Project overview and setup instructions
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
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
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Port for Express server | `5000` |
| `NODE_ENV` | Environment mode (`development` / `production`) | `development` |
| `MONGODB_URI` | Database connection URI | `mongodb://localhost:27017/campus-resource-hub` |
| `JWT_SECRET` | Secret key for token authentication | `your_jwt_secret_key_here` |
| `CLIENT_URL` | Allowed CORS origin for frontend | `http://localhost:5173` |

---

## 📜 License
ISC

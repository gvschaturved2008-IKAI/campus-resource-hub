import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Campus Resource Hub
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            React + Vite + Tailwind CSS Skeleton
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left space-y-2 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Client: React 19 + Vite</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            <span>Styles: Tailwind CSS configured</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
            <span>Server: Node.js + Express ready</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setCount((c) => c + 1)}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all duration-200 text-white font-medium text-sm shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            Counter Test: {count}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App

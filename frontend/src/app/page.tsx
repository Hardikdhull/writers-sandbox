import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-center px-4">
      <div className="max-w-3xl">
        <h1 className="text-5xl font-bold text-white mb-6">
          Writers' Sandbox
        </h1>
        <p className="text-xl text-gray-300 mb-8 leading-relaxed">
          A real-time collaborative writing environment built for authors. 
          Write with custom Work Skins, generate live mobile previews, and get inline feedback from your beta readers—no account required for them.
        </p>
        <div className="flex justify-center gap-4">
          <Link 
            href="/dashboard" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded shadow-lg transition-colors"
          >
            Open Dashboard
          </Link>
          <Link 
            href="/login" 
            className="bg-gray-800 border border-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded shadow-lg transition-colors"
          >
            Writer Login
          </Link>
        </div>
      </div>
    </div>
  );
}
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export default function Dashboard() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // New Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchChapters = async () => {
      const token = localStorage.getItem('token');
      if (!token) return router.push('/login');

      try {
        const response = await fetch(`${API_URL}/api/chapters`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Token expired');
        
        const data = await response.json();
        setChapters(data);
      } catch (error) {
        localStorage.removeItem('token');
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };
    fetchChapters();
  }, [router]);

  const handleCreateChapter = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/api/chapters`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ title: newTitle })
      });
      
      const data = await response.json();
      if (response.ok) {
        router.push(`/editor?chapterId=${data.chapterId}`);
      }
    } catch (error) {
      showToast("Failed to create chapter.", "error");
      setIsCreating(false);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8 relative overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-white">Your Sandbox</h1>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded shadow"
          >
            + New Chapter
          </button>
        </div>

        <div className="grid gap-4">
          {chapters.length === 0 ? (
            <p className="text-gray-400 italic">No drafts yet. Create one to get started!</p>
          ) : (
            chapters.map((chapter) => (
              <div key={chapter._id} className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex justify-between items-center shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-indigo-400 mb-1">{chapter.title}</h2>
                  <p className="text-sm text-gray-400">
                    Last updated: {new Date(chapter.last_updated).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/beta/${chapter.share_token}`);
                      showToast("Beta link copied to clipboard! 📋");
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded text-sm transition-colors"
                  >
                    Copy Beta Link
                  </button>
                  <button 
                    onClick={() => router.push(`/editor?chapterId=${chapter._id}`)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded text-sm transition-colors"
                  >
                    Open Editor
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chapter Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Create New Chapter</h2>
            <input 
              autoFocus
              type="text"
              placeholder="Chapter Title..."
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateChapter()}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateChapter}
                disabled={!newTitle.trim() || isCreating}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tailwind Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
          <div className={`px-6 py-3 rounded shadow-lg text-white font-bold ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
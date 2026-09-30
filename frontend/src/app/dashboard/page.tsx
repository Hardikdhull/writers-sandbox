'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export default function Dashboard() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchChapters = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/chapters`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Token expired');
        
        const data = await response.json();
        setChapters(data);
      } catch (error) {
        console.error(error);
        localStorage.removeItem('token');
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChapters();
  }, [router]);

  const createNewChapter = async () => {
    const token = localStorage.getItem('token');
    const title = prompt('Enter a title for your new chapter:');
    if (!title) return;

    try {
      const response = await fetch(`${API_URL}/api/chapters`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title })
      });
      
      const data = await response.json();
      if (response.ok) {
        // Send them directly to the sandbox with the new ID in the URL
        router.push(`/?chapterId=${data.chapterId}`);
      }
    } catch (error) {
      alert("Failed to create chapter");
    }
  };

  if (isLoading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-white">Your Sandbox</h1>
          <button 
            onClick={createNewChapter}
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
              <div key={chapter._id} className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex justify-between items-center shadow-sm hover:border-gray-600 transition-colors">
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
                      alert("Beta link copied to clipboard!");
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded text-sm transition-colors"
                  >
                    Copy Beta Link
                  </button>
                  <button 
                    onClick={() => router.push(`/?chapterId=${chapter._id}`)}
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
    </div>
  );
}
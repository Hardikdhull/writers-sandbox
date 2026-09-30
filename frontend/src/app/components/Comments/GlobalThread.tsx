'use client';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export default function GlobalThread({ comments, chapterId }: any) {
  const [globalText, setGlobalText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handlePostGlobal = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/chapters/${encodeURIComponent(chapterId.trim())}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'global',
          commentText: globalText,
        })
      });
      if (response.ok) setGlobalText('');
    } catch (error) {
      console.error('Failed to post global note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h3 className="font-bold text-gray-100 mb-4">Overall Feedback</h3>
      
      <div className="flex gap-4 mb-6">
        <textarea 
          className="flex-1 bg-gray-700 border-none rounded p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500"
          placeholder="Leave general feedback on pacing, CSS styling, etc..."
          value={globalText}
          onChange={(e) => setGlobalText(e.target.value)}
        />
        <button 
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-6 py-2 rounded font-bold h-fit"
          disabled={!chapterId.trim() || !globalText.trim() || isSaving}
          onClick={handlePostGlobal}
        >
          {isSaving ? 'Posting...' : 'Comment'}
        </button>
      </div>

      <div className="space-y-4">
        {comments.map((comment: any, index: number) => (
          <div key={index} className="bg-gray-800 p-4 rounded border border-gray-600">
            <p className="text-gray-200 text-sm">{comment.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
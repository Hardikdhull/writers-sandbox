'use client';
import { useState } from 'react';

// Central API route fallback retained from your config[cite: 2]
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export default function LateralSidebar({ comments, setComments, activeHighlight, setActiveHighlight, chapterId, setChapterId }: any) {
  // Loading and error states retained[cite: 2]
  const [commentText, setCommentText] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  const handlePostInline = async () => {
    setIsSavingComment(true);
    setCommentError('');
    try {
      // Integrated your exact fetch path and encode logic[cite: 2]
      const response = await fetch(`${API_URL}/api/chapters/${encodeURIComponent(chapterId.trim())}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'inline',
          highlightedText: activeHighlight.text,
          commentText,
          position: { top: activeHighlight.top, left: activeHighlight.left }
        })
      });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

      const newComment = {
        type: 'inline',
        highlighted_text: activeHighlight.text,
        comment: commentText,
        position: { top: activeHighlight.top, left: activeHighlight.left }
      };
      setComments((prev: any[]) => [...prev, newComment]);

      setActiveHighlight(null);
      setCommentText('');
    } catch (error) {
      console.error('Failed to post note:', error);
      setCommentError('Failed to post note. Check the chapter ID and backend connection.'); // Error handling string retained[cite: 2]
    } finally {
      setIsSavingComment(false);
    }
  };

  return (
    <div className="h-full relative p-4 text-gray-800">
      <div className="mb-4 pb-2 border-b flex justify-between items-center">
        <h3 className="font-bold">Inline Suggestions</h3>
        <input
          className="w-32 border border-gray-300 rounded px-2 py-1 text-sm text-gray-800"
          placeholder="Chapter ID"
          value={chapterId}
          onChange={(e) => setChapterId(e.target.value)}
        />
      </div>

      {comments.map((comment: any, index: number) => (
        <div 
          key={index} 
          className="absolute w-[90%] bg-yellow-50 border border-yellow-200 p-3 rounded shadow-sm text-sm"
          style={{ top: `${comment.position?.top}px` }}
        >
          <p className="italic text-gray-500 mb-1">"{comment.highlighted_text}"</p>
          <p>{comment.comment}</p>
        </div>
      ))}

      {activeHighlight && (
        <div 
          className="absolute w-[90%] bg-white border-2 border-indigo-500 p-3 rounded shadow-lg z-50"
          style={{ top: `${activeHighlight.top}px` }}
        >
          <p className="text-xs text-gray-500 italic mb-2 truncate">"{activeHighlight.text}"</p>
          <textarea 
            className="w-full text-gray-800 bg-gray-50 border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Suggest a change..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button className="text-gray-400 text-xs px-2" onClick={() => setActiveHighlight(null)}>Cancel</button>
            <button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded"
              disabled={!chapterId.trim() || !commentText.trim() || isSavingComment} // Disabled state logic retained[cite: 2]
              onClick={handlePostInline}
            >
              {isSavingComment ? 'Posting...' : 'Post Note'}
            </button>
          </div>
          {commentError && <p className="mt-2 text-xs text-red-600">{commentError}</p>}
        </div>
      )}
    </div>
  );
}
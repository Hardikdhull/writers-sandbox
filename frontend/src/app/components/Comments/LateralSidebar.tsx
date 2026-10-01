'use client';
import { useState, useRef, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export default function LateralSidebar({ 
  comments, 
  setComments, 
  activeHighlight, 
  setActiveHighlight, 
  chapterId,
  setChapterId 
}: any) {
  const [draftNote, setDraftNote] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- COLLISION AVOIDANCE ALGORITHM ---
  useEffect(() => {
    if (!containerRef.current) return;
    
    // 1. Select all comment cards AND the active compose box
    const cards = Array.from(containerRef.current.querySelectorAll('.sidebar-card')) as HTMLElement[];
    
    // 2. Sort them strictly by their intended vertical position (top to bottom)
    cards.sort((a, b) => {
      const topA = parseFloat(a.dataset.targetTop || '0');
      const topB = parseFloat(b.dataset.targetTop || '0');
      return topA - topB;
    });

    let nextAvailableTop = 0;
    const spacing = 16; // Minimum pixels of gap between cards

    // 3. Loop through and assign actual coordinates
    cards.forEach((card) => {
      const targetTop = parseFloat(card.dataset.targetTop || '0');
      
      // If the natural position is lower than the available space, use natural position.
      // If it is blocked, push it down to the next available space.
      const actualTop = Math.max(targetTop, nextAvailableTop);
      
      // Move the card via CSS transform (better performance than modifying 'top')
      card.style.transform = `translateY(${actualTop}px)`;
      
      // Update the boundary for the next card down the line
      nextAvailableTop = actualTop + card.offsetHeight + spacing;
    });
  }, [comments, activeHighlight, draftNote]); 
  // draftNote is included so the algorithm recalculates dynamically as the textarea expands!

  const handlePostNote = async () => {
    if (!draftNote.trim() || !activeHighlight) return;
    setIsPosting(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_URL}/api/chapters/${chapterId}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          type: 'inline',
          comment: draftNote,
          highlighted_text: activeHighlight.text,
          top: activeHighlight.top
        })
      });
      
      if (!response.ok) throw new Error('Failed to post');
      const newComment = await response.json();
      
      setComments((prev: any) => [...prev, newComment]);
      setActiveHighlight(null);
      setDraftNote('');
    } catch (error) {
      alert("Failed to post note. Check the backend connection.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="h-full relative overflow-y-auto bg-gray-50 border-l border-gray-300 p-4" ref={containerRef}>
      <h2 className="text-lg font-bold text-gray-800 mb-4 sticky top-0 bg-gray-50 z-10 py-2 border-b border-gray-200">
        Inline Suggestions
      </h2>
      
      {/* Container for absolute positioning. 'top-0' ensures the transform math starts accurately */}
      <div className="relative w-full top-0">
        
        {/* Render Existing Comments */}
        {comments.map((comment: any, index: number) => (
          <div 
            key={comment._id || index}
            className="sidebar-card absolute left-0 top-0 w-full bg-white border border-gray-200 shadow-sm rounded-lg p-3 transition-transform duration-200 ease-out"
            data-target-top={comment.top || 0}
          >
            {comment.highlighted_text && (
              <div className="text-xs text-gray-500 italic mb-2 px-2 border-l-2 border-indigo-400">
                "{comment.highlighted_text}"
              </div>
            )}
            <p className="text-sm text-gray-800">{comment.comment}</p>
          </div>
        ))}

        {/* Render the Active "Compose" Box */}
        {activeHighlight && (
          <div 
            className="sidebar-card absolute left-0 top-0 w-full bg-yellow-50 border-2 border-indigo-400 shadow-md rounded-lg p-3 transition-transform duration-200 ease-out z-10"
            data-target-top={activeHighlight.top}
          >
            <div className="text-xs text-gray-600 italic mb-2">
              "{activeHighlight.text}"
            </div>
            <textarea 
              autoFocus
              className="w-full bg-white border border-gray-300 rounded p-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px] resize-y"
              placeholder="Leave a suggestion..."
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => {
                  setActiveHighlight(null);
                  setDraftNote('');
                }}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1"
              >
                Cancel
              </button>
              <button 
                onClick={handlePostNote}
                disabled={isPosting || !draftNote.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white text-xs font-bold py-1 px-3 rounded transition-colors"
              >
                {isPosting ? 'Posting...' : 'Post Note'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

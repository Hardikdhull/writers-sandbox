'use client';
import { useState, useEffect } from 'react'; // Added useEffect

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export default function Sandbox() {
  // Pre-loaded with the Discord Thumb template for testing
  const [htmlContent, setHtmlContent] = useState('<div class="thumb-wrapper">\n  <div class="thumb-scroll-area">\n    <p>Paste AO3 text here...</p>\n  </div>\n</div>');
  const [cssContent, setCssContent] = useState('.thumb-wrapper { position: relative; width: 100%; max-width: 500px; margin: 20px auto; overflow: hidden; }\n.thumb-scroll-area { max-height: 400px; overflow-y: auto; padding: 15px; border: 2px solid #ccc; border-radius: 12px; }');

  // Add these new states for the beta reader UI
  const [activeHighlight, setActiveHighlight] = useState<{ text: string, top: number, left: number } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [commentError, setCommentError] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const highlight = activeHighlight;

  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.data.type === 'TEXT_HIGHLIGHTED') {
        setActiveHighlight({
          text: event.data.text,
          top: event.data.position.top,
          left: event.data.position.left
        });
      } else if (event.data.type === 'CLEAR_HIGHLIGHT') {
        setActiveHighlight(null);
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, []);
  
  // Dynamically wrap their inputs in the standard AO3 #workskin ID
  const combinedCode = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          ${cssContent}
        </style>
        <script>
          // Listen for a beta reader highlighting text
          document.addEventListener('mouseup', () => {
            const selection = window.getSelection();
            const text = selection.toString().trim();
            
            if (text.length > 0) {
              const range = selection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              
              // Broadcast the text and its exact coordinates to Next.js
              window.parent.postMessage({
                type: 'TEXT_HIGHLIGHTED',
                text: text,
                position: { 
                  top: rect.bottom + window.scrollY, 
                  left: rect.left + window.scrollX 
                }
              }, '*');
            } else {
              // Hide the comment box if they click away
              window.parent.postMessage({ type: 'CLEAR_HIGHLIGHT' }, '*');
            }
          });
        </script>
      </head>
      <body>
        <div id="workskin">
          ${htmlContent}
        </div>
      </body>
    </html>
  `;

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 relative">
      
      {/* Left Column: The Editor */}
      <div className="w-1/2 flex flex-col border-r border-gray-700">
        
        {/* HTML Editor */}
        <div className="flex-1 p-4 flex flex-col">
          <label className="font-bold mb-2 text-indigo-400">AO3 HTML Document</label>
          <textarea 
            className="flex-1 bg-gray-800 p-4 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            spellCheck="false"
          />
        </div>

        {/* CSS Editor */}
        <div className="flex-1 p-4 flex flex-col border-t border-gray-700">
          <label className="font-bold mb-2 text-pink-400">Work Skin CSS</label>
          <textarea 
            className="flex-1 bg-gray-800 p-4 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
            value={cssContent}
            onChange={(e) => setCssContent(e.target.value)}
            spellCheck="false"
          />
        </div>
      </div>

      {/* Right Column: Live Preview */}
      <div className="w-1/2 p-4 flex flex-col bg-gray-100 relative">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold text-gray-800">Live Mobile Preview</h2>
          <input
            className="w-56 border border-gray-300 rounded px-2 py-1 text-sm text-gray-800"
            aria-label="Chapter ID"
            placeholder="Chapter ID"
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
          />
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded text-sm shadow">
            Save Draft
          </button>
        </div>
        
        <iframe 
          className="flex-1 w-full bg-white border-2 border-gray-300 rounded-lg shadow-inner"
          srcDoc={combinedCode}
          title="AO3 Live Preview"
          sandbox="allow-scripts allow-same-origin"
        />

        {/* ADDED: The Floating Beta Reader Comment Box */}
        {highlight && (
          <div 
            className="absolute z-50 bg-white border border-gray-300 shadow-xl rounded-lg p-3 w-64 flex flex-col"
            style={{ 
              top: `${highlight.top + 50}px`, 
              left: `${highlight.left}px` 
            }}
          >
            <p className="text-xs text-gray-500 italic mb-2 truncate">
              "{highlight.text}"
            </p>
            <textarea 
              className="w-full text-gray-800 bg-gray-50 border border-gray-200 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
              placeholder="Add a suggestion..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button 
                className="text-gray-400 hover:text-gray-600 text-xs px-2"
                onClick={() => setActiveHighlight(null)}
              >
                Cancel
              </button>
              <button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded shadow"
                disabled={!chapterId.trim() || !commentText.trim() || isSavingComment}
                onClick={async () => {
                  setIsSavingComment(true);
                  setCommentError('');
                  try {
                    const response = await fetch(`${API_URL}/api/chapters/${encodeURIComponent(chapterId.trim())}/comments`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        highlightedText: highlight.text,
                        commentText,
                        position: { top: highlight.top, left: highlight.left }
                      })
                    });

                    if (!response.ok) {
                      throw new Error(`Request failed with status ${response.status}`);
                    }

                    setActiveHighlight(null);
                    setCommentText('');
                  } catch (error) {
                    console.error('Failed to post note:', error);
                    setCommentError('Failed to post note. Check the chapter ID and backend connection.');
                  } finally {
                    setIsSavingComment(false);
                  }
                }}
              >
                {isSavingComment ? 'Posting...' : 'Post Note'}
              </button>
            </div>
            {commentError && <p className="mt-2 text-xs text-red-600">{commentError}</p>}
          </div>
        )}
      </div>

    </div>
  );
}
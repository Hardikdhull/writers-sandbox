'use client';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

interface LiveIframeProps {
  html: string;
  css: string;
  setActiveHighlight: (highlight: { text: string, top: number, left: number } | null) => void;
  chapterId: string;
  isBetaMode?: boolean; // Added optional flag
}

export default function LiveIframe({ html, css, setActiveHighlight, chapterId, isBetaMode = false }: LiveIframeProps) {
  const [isSaving, setIsSaving] = useState(false);
  
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
  }, [setActiveHighlight]);

  const handleSaveDraft = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      alert("You must be logged in to save drafts.");
      return;
    }
    if (!chapterId.trim()) {
      alert("No active chapter ID found.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/chapters/${encodeURIComponent(chapterId.trim())}/save`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newIncomingHtml: html })
      });

      if (!response.ok) throw new Error('Failed to save draft.');
      alert("Draft saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save draft. Please try logging in again.");
    } finally {
      setIsSaving(false);
    }
  };

  const combinedCode = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          ${css}
        </style>
        <script>
          document.addEventListener('mouseup', () => {
            const selection = window.getSelection();
            const text = selection.toString().trim();
            
            if (text.length > 0) {
              const range = selection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              
              window.parent.postMessage({
                type: 'TEXT_HIGHLIGHTED',
                text: text,
                position: { 
                  top: rect.bottom + window.scrollY, 
                  left: rect.left + window.scrollX 
                }
              }, '*');
            } else {
              window.parent.postMessage({ type: 'CLEAR_HIGHLIGHT' }, '*');
            }
          });
        </script>
      </head>
      <body>
        <div id="workskin">
          ${html}
        </div>
      </body>
    </html>
  `;

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold text-gray-800">
          {isBetaMode ? 'Live Preview' : 'Live Mobile Preview'}
        </h2>
        {/* Only render the save button if we are NOT in beta mode */}
        {!isBetaMode && (
          <button 
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-1 rounded text-sm shadow transition-colors"
            onClick={handleSaveDraft}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
        )}
      </div>
      
      <iframe 
        className="flex-1 w-full bg-white border-2 border-gray-300 rounded-lg shadow-inner"
        srcDoc={combinedCode}
        title="AO3 Live Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
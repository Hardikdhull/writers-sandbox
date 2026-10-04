'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import CodePanes from '../components/Editor/CodePanes';
import LiveIframe from '../components/Preview/LiveIframe';
import LateralSidebar from '../components/Comments/LateralSidebar';
import GlobalThread from '../components/Comments/GlobalThread';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

function EditorWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [chapterId, setChapterId] = useState(searchParams.get('chapterId') || '');
  
  const [htmlContent, setHtmlContent] = useState('<div class="thumb-wrapper">\n  <div class="thumb-scroll-area">\n    <p>Paste AO3 text here...</p>\n  </div>\n</div>');
  const [cssContent, setCssContent] = useState('.thumb-wrapper { position: relative; width: 100%; max-width: 500px; margin: 20px auto; overflow: hidden; }\n.thumb-scroll-area { max-height: 400px; overflow-y: auto; padding: 15px; border: 2px solid #ccc; border-radius: 12px; color: black; }');
  
  const [comments, setComments] = useState<any[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<{ text: string, top: number, left: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debouncing States for Iframe Lag Fix
  const [debouncedHtml, setDebouncedHtml] = useState(htmlContent);
  const [debouncedCss, setDebouncedCss] = useState(cssContent);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHtml(htmlContent);
      setDebouncedCss(cssContent);
    }, 800);
    return () => clearTimeout(timer);
  }, [htmlContent, cssContent]);

  useEffect(() => {
    const loadChapter = async () => {
      if (!chapterId) {
        setIsLoading(false);
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const response = await fetch(`${API_URL}/api/chapters/${chapterId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load draft');
        
        const data = await response.json();
        
        if (data.current_content) setHtmlContent(data.current_content);
        if (data.css_content) setCssContent(data.css_content); 
        if (data.comments) setComments(data.comments);
        if (data.history) setHistory(data.history);
        
      } catch (error) {
        console.error(error);
        alert("Could not load chapter data. Are you logged in?");
      } finally {
        setIsLoading(false);
      }
    };
    loadChapter();
  }, [chapterId, router]);

  const handleRestore = (historicalContent: string) => {
    if (window.confirm("Are you sure you want to replace your current draft with this older version?")) {
      setHtmlContent(historicalContent);
      setShowHistory(false);
    }
  };

  const inlineComments = comments.filter(c => c.type === 'inline');
  const globalComments = comments.filter(c => c.type === 'global');

  if (isLoading) {
    return <div className="h-screen bg-gray-900 text-white flex items-center justify-center">Loading draft...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100 overflow-x-hidden">
      
      {/* NAVIGATION HEADER */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 px-6 flex justify-between items-center shadow-md z-10 sticky top-0">
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold"
        >
          <span>← Back to Dashboard</span>
        </button>
        
        <div className="flex items-center gap-4">
          <div className="text-indigo-400 font-bold tracking-wider">Editor Workspace</div>
          <button 
            onClick={() => setShowHistory(true)}
            className="bg-gray-700 hover:bg-gray-600 text-xs px-3 py-1.5 rounded text-white transition-colors shadow"
          >
            View History ({history.length})
          </button>
        </div>
        
        <div className="w-32"></div>
      </div>

      {/* MAIN WORKSPACE - Fixed height so it takes up most of the screen, but lets you scroll past it */}
      <div className="flex w-full h-[85vh] relative">
        <div className="w-1/3 border-r border-gray-700">
          <CodePanes
            html={htmlContent} setHtml={setHtmlContent}
            css={cssContent} setCss={setCssContent}
          />
        </div>
        
        <div className="w-1/3 bg-gray-100 relative">
          <LiveIframe
            html={debouncedHtml}
            css={debouncedCss}
            setActiveHighlight={setActiveHighlight}
            chapterId={chapterId}
          />
        </div>
        
        <div className="w-1/3 bg-white relative border-l border-gray-300">
          <LateralSidebar
            comments={inlineComments}
            setComments={setComments}
            activeHighlight={activeHighlight}
            setActiveHighlight={setActiveHighlight}
            chapterId={chapterId}
            setChapterId={setChapterId}
          />
        </div>
      </div>
      
      {/* OVERALL FEEDBACK - Natural scroll layout at the bottom */}
      <div className="bg-gray-800 p-10 border-t-4 border-gray-900 flex-1">
        <div className="max-w-4xl mx-auto">
          <GlobalThread
            comments={globalComments}
            setComments={setComments}
            chapterId={chapterId}
          />
        </div>
      </div>

      {/* VERSION HISTORY MODAL */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 text-gray-900 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Version History</h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-red-500 font-bold text-xl">✕</button>
            </div>
            
            {history.length === 0 ? (
              <p className="text-gray-500">No previous versions saved yet.</p>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-4 pr-2">
                {history.map((h, index) => (
                  <div key={index} className="border border-gray-200 p-4 rounded bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm text-indigo-600">
                        Saved: {new Date(h.timestamp).toLocaleString()}
                      </span>
                      <button 
                        onClick={() => handleRestore(h.content)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs transition-colors"
                      >
                        Restore This Version
                      </button>
                    </div>
                    {/* Tiny preview of the text stripped of HTML */}
                    <div className="text-sm text-gray-600 truncate opacity-70">
                      {h.content.replace(/<[^>]+>/g, '').substring(0, 120)}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WritersSandbox() {
  return (
    <Suspense fallback={<div className="h-screen bg-gray-900 text-white flex items-center justify-center">Loading editor...</div>}>
      <EditorWorkspace />
    </Suspense>
  );
}
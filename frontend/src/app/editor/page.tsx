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

  const [chapterId, setChapterId] = useState(searchParams.get('chapterId') || '');
  
  const [htmlContent, setHtmlContent] = useState('<div class="thumb-wrapper">\n  <div class="thumb-scroll-area">\n    <p>Paste AO3 text here...</p>\n  </div>\n</div>');
  const [cssContent, setCssContent] = useState('.thumb-wrapper { position: relative; width: 100%; max-width: 500px; margin: 20px auto; overflow: hidden; }\n.thumb-scroll-area { max-height: 400px; overflow-y: auto; padding: 15px; border: 2px solid #ccc; border-radius: 12px; }');
  
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
        if (data.css_content) setCssContent(data.css_content); // <-- CSS Loading applied here
        if (data.comments) setComments(data.comments);
        
      } catch (error) {
        console.error(error);
        alert("Could not load chapter data. Are you logged in?");
      } finally {
        setIsLoading(false);
      }
    };
    loadChapter();
  }, [chapterId, router]);

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
        <div className="text-indigo-400 font-bold tracking-wider">Editor Workspace</div>
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

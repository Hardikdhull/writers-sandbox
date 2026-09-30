'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CodePanes from './components/Editor/CodePanes';
import LiveIframe from './components/Preview/LiveIframe';
import LateralSidebar from './components/Comments/LateralSidebar';
import GlobalThread from './components/Comments/GlobalThread';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

function EditorWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Base states
  const [htmlContent, setHtmlContent] = useState('<div class="thumb-wrapper">\n  <div class="thumb-scroll-area">\n    <p>Paste AO3 text here...</p>\n  </div>\n</div>');
  const [cssContent, setCssContent] = useState('.thumb-wrapper { position: relative; width: 100%; max-width: 500px; margin: 20px auto; overflow: hidden; }\n.thumb-scroll-area { max-height: 400px; overflow-y: auto; padding: 15px; border: 2px solid #ccc; border-radius: 12px; }');
  
  // Read ID from URL, fallback to empty string
  const [chapterId, setChapterId] = useState(searchParams.get('chapterId') || '');
  
  const [comments, setComments] = useState<any[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<{ text: string, top: number, left: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Automatically fetch the chapter data when the page loads
  useEffect(() => {
    const loadChapter = async () => {
      if (!chapterId) {
        setIsLoading(false);
        return; // If there's no ID in the URL, just render the blank sandbox
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
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      
      <div className="flex flex-1 h-[80vh]">
        <div className="w-1/3 border-r border-gray-700">
          <CodePanes 
            html={htmlContent} setHtml={setHtmlContent} 
            css={cssContent} setCss={setCssContent} 
          />
        </div>

        <div className="w-1/3 bg-gray-100 relative">
          <LiveIframe 
            html={htmlContent} 
            css={cssContent} 
            setActiveHighlight={setActiveHighlight} 
            chapterId={chapterId}
          />
        </div>

        <div className="w-1/3 bg-white relative overflow-y-auto border-l border-gray-300">
          <LateralSidebar 
            comments={inlineComments} 
            activeHighlight={activeHighlight} 
            setActiveHighlight={setActiveHighlight}
            chapterId={chapterId}
            setChapterId={setChapterId}
          />
        </div>
      </div>

      <div className="h-[20vh] bg-gray-800 p-6 overflow-y-auto border-t border-gray-700">
        <GlobalThread 
          comments={globalComments} 
          chapterId={chapterId} 
        />
      </div>
    </div>
  );
}

// Next.js requires useSearchParams to be wrapped in a Suspense boundary
export default function WritersSandbox() {
  return (
    <Suspense fallback={<div className="h-screen bg-gray-900 text-white flex items-center justify-center">Loading editor...</div>}>
      <EditorWorkspace />
    </Suspense>
  );
}
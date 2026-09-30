'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import LiveIframe from '@/app/components/Preview/LiveIframe';
import LateralSidebar from '@/app/components/Comments/LateralSidebar';
import GlobalThread from '@/app/components/Comments/GlobalThread';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export default function BetaReaderView() {
  const params = useParams();
  const token = params.token as string;
  
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('/* Add Work Skin here */');
  const [chapterId, setChapterId] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<{ text: string, top: number, left: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadBetaChapter = async () => {
      try {
        const response = await fetch(`${API_URL}/api/beta/${token}`);
        
        if (!response.ok) {
          throw new Error('Invalid or expired beta link.');
        }
        
        const data = await response.json();
        
        setHtmlContent(data.current_content || '');
        setChapterId(data._id); // Save the actual DB ID for posting comments
        if (data.comments) setComments(data.comments);
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadBetaChapter();
  }, [token]);

  const inlineComments = comments.filter(c => c.type === 'inline');
  const globalComments = comments.filter(c => c.type === 'global');

  if (isLoading) return <div className="h-screen bg-gray-900 text-white flex items-center justify-center">Loading story...</div>;
  if (error) return <div className="h-screen bg-gray-900 text-red-400 flex items-center justify-center">{error}</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      {/* Beta Header */}
      <div className="bg-gray-800 p-4 text-center border-b border-gray-700">
        <h1 className="text-xl font-bold text-indigo-400">Beta Reader Mode</h1>
        <p className="text-sm text-gray-400">Highlight any text to leave a suggestion.</p>
      </div>

      <div className="flex flex-1 h-[70vh] justify-center max-w-7xl mx-auto w-full">
        {/* Center: Live AO3 Preview (Wider for reading) */}
        <div className="w-1/2 bg-gray-100 relative">
          <LiveIframe 
            html={htmlContent} 
            css={cssContent} 
            setActiveHighlight={setActiveHighlight} 
            chapterId={chapterId}
            isBetaMode={true}
          />
        </div>

        {/* Right: Google Docs Style Sidebar */}
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

      {/* Bottom: YouTube Style Global Thread */}
      <div className="h-[20vh] bg-gray-800 p-6 overflow-y-auto border-t border-gray-700">
        <GlobalThread 
          comments={globalComments} 
          chapterId={chapterId} 
        />
      </div>
    </div>
  );
}
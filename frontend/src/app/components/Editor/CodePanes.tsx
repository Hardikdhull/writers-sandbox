'use client';

interface CodePanesProps {
  html: string;
  setHtml: (val: string) => void;
  css: string;
  setCss: (val: string) => void;
}

export default function CodePanes({ html, setHtml, css, setCss }: CodePanesProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 flex flex-col">
        <label className="font-bold mb-2 text-indigo-400">AO3 HTML Document</label>
        <textarea 
          className="flex-1 bg-gray-800 p-4 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-100"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          spellCheck="false"
        />
      </div>

      <div className="flex-1 p-4 flex flex-col border-t border-gray-700">
        <label className="font-bold mb-2 text-pink-400">Work Skin CSS</label>
        <textarea 
          className="flex-1 bg-gray-800 p-4 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-100"
          value={css}
          onChange={(e) => setCss(e.target.value)}
          spellCheck="false"
        />
      </div>
    </div>
  );
}
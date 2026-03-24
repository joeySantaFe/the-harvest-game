import React from 'react';
import { LogEntry } from '../types';
import { Typewriter } from './Typewriter';
import { ChevronLeft, Database } from 'lucide-react';

interface LogViewerProps {
  log: LogEntry;
  onBack: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ log, onBack }) => {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-terminal-green/40 pb-4 mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-terminal-green hover:bg-terminal-green hover:text-terminal-black px-3 py-1 transition-colors text-sm font-mono uppercase"
        >
          <ChevronLeft className="w-4 h-4" />
          Return to Archive
        </button>
        <div className="flex items-center gap-2 text-terminal-green-dim text-xs">
          <Database className="w-4 h-4" />
          <span>READING FROM MAG-TAPE REEL #{log.id.toUpperCase()}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
        <div className="mb-8">
          <h2 className="text-3xl font-retro text-terminal-green mb-2 tracking-widest text-shadow-glow">
            {log.title}
          </h2>
          <div className="flex gap-6 text-sm font-mono text-terminal-green-dim border-l-2 border-terminal-green pl-3">
            <span>DATE: {log.date}</span>
            <span>AUTH: {log.author}</span>
            <span>REF: {log.chapter}-AF</span>
          </div>
        </div>

        <div className="font-mono text-lg leading-relaxed text-terminal-green/90 max-w-3xl">
          <Typewriter text={log.content} speed={20} />
        </div>
      </div>
      
      <div className="mt-4 pt-2 border-t border-terminal-green/20 text-[10px] text-terminal-green-dim flex justify-between uppercase">
         <span>End of File</span>
         <span className="animate-pulse">_CURSOR_ACTIVE</span>
      </div>
    </div>
  );
};
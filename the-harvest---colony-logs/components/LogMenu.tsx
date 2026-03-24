import React from 'react';
import { STORY_LOGS } from '../data/logs';
import { LogStatus } from '../types';
import { Lock, FileText, AlertTriangle } from 'lucide-react';

interface LogMenuProps {
  onSelectLog: (id: string) => void;
}

export const LogMenu: React.FC<LogMenuProps> = ({ onSelectLog }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-y-auto pr-2">
      {STORY_LOGS.map((log) => {
        const isLocked = log.status === LogStatus.LOCKED;
        
        return (
          <button
            key={log.id}
            onClick={() => !isLocked && onSelectLog(log.id)}
            disabled={isLocked}
            className={`
              group relative p-4 border border-terminal-green/30 text-left transition-all duration-300
              ${isLocked 
                ? 'opacity-50 cursor-not-allowed border-dashed' 
                : 'hover:bg-terminal-green/10 hover:border-terminal-green hover:shadow-[0_0_15px_rgba(51,255,51,0.2)] cursor-pointer'
              }
            `}
          >
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-terminal-green opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-terminal-green opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-terminal-green opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-terminal-green opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-terminal-green-dim font-mono">
                CH_{log.chapter.toString().padStart(2, '0')} // {log.date}
              </span>
              {isLocked ? (
                <Lock className="w-4 h-4 text-terminal-green-dim" />
              ) : (
                <FileText className="w-4 h-4 text-terminal-green group-hover:animate-pulse" />
              )}
            </div>

            <div className={`font-retro text-xl tracking-wide ${isLocked ? 'text-terminal-green-dim blur-[1px]' : 'text-terminal-green'}`}>
              {isLocked ? 'ENCRYPTED DATA' : log.title}
            </div>

            <div className="mt-4 flex justify-between items-end border-t border-terminal-green/20 pt-2">
              <span className="text-[10px] uppercase text-terminal-green-dim">
                AUTH: {log.author}
              </span>
              <span className={`text-[10px] uppercase ${isLocked ? 'text-red-500' : 'text-terminal-green'}`}>
                STATUS: {log.status}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
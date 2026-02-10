import React from 'react';
import { Lock, FileText } from 'lucide-react';
import { LogEntry, LogStatus } from './colonyLogTypes';
import { STORY_LOGS } from './logs';
import { CRTOverlay } from './CRTOverlay';

interface LogArchiveProps {
  unlockedChapters: number[];
  onSelectLog: (chapter: number) => void;
  onBack: () => void;
}

export const LogArchive: React.FC<LogArchiveProps> = ({ unlockedChapters, onSelectLog, onBack }) => {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: '#050505',
        fontFamily: '"Share Tech Mono", "Courier Prime", monospace',
        color: '#33ff33',
      }}
    >
      <CRTOverlay />

      <div
        className="relative z-10 w-full max-w-5xl mx-4 flex flex-col"
        style={{
          maxHeight: '90vh',
          border: '1px solid rgba(51, 255, 51, 0.3)',
          padding: '2rem 2.5rem',
          boxShadow: '0 0 20px rgba(51, 255, 51, 0.1)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '8px',
        }}
      >
        {/* Header */}
        <header
          className="flex justify-between items-end uppercase tracking-widest text-xs pb-2 mb-6"
          style={{ borderBottom: '2px solid #33ff33' }}
        >
          <div className="flex flex-col">
            <span style={{ color: '#1a801a', fontSize: '10px' }}>
              INTERFACE 2037 // MOTHER
            </span>
            <span className="text-xl font-bold mt-1">COLONY LOGS</span>
          </div>
          <div className="flex items-center gap-4" style={{ fontSize: '10px', color: '#1a801a' }}>
            <span>{unlockedChapters.length} / {STORY_LOGS.length} DECRYPTED</span>
          </div>
        </header>

        {/* Log Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2">
          {STORY_LOGS.map((log) => {
            const isLocked = !unlockedChapters.includes(log.chapter);

            return (
              <button
                key={log.id}
                onClick={() => !isLocked && onSelectLog(log.chapter)}
                disabled={isLocked}
                className="group relative p-4 text-left transition-all duration-300"
                style={{
                  border: `1px ${isLocked ? 'dashed' : 'solid'} rgba(51, 255, 51, 0.3)`,
                  opacity: isLocked ? 0.5 : 1,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  backgroundColor: 'transparent',
                  fontFamily: 'inherit',
                  color: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!isLocked) {
                    e.currentTarget.style.backgroundColor = 'rgba(51, 255, 51, 0.05)';
                    e.currentTarget.style.borderColor = '#33ff33';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(51, 255, 51, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(51, 255, 51, 0.3)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span style={{ fontSize: '11px', color: '#1a801a' }}>
                    CH_{String(log.chapter).padStart(2, '0')} // {log.date}
                  </span>
                  {isLocked ? (
                    <Lock style={{ width: '16px', height: '16px', color: '#1a801a' }} />
                  ) : (
                    <FileText style={{ width: '16px', height: '16px', color: '#33ff33' }} />
                  )}
                </div>

                <div
                  className="text-xl tracking-wide"
                  style={{
                    fontFamily: '"VT323", monospace',
                    color: isLocked ? '#1a801a' : '#33ff33',
                    filter: isLocked ? 'blur(1px)' : 'none',
                  }}
                >
                  {isLocked ? 'ENCRYPTED DATA' : log.title}
                </div>

                <div
                  className="mt-4 flex justify-between items-end pt-2"
                  style={{
                    borderTop: '1px solid rgba(51, 255, 51, 0.15)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                  }}
                >
                  <span style={{ color: '#1a801a' }}>AUTH: {log.author}</span>
                  <span style={{ color: isLocked ? '#f04' : '#33ff33' }}>
                    STATUS: {isLocked ? LogStatus.LOCKED : LogStatus.UNLOCKED}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 flex justify-between items-center" style={{ borderTop: '1px solid rgba(51, 255, 51, 0.2)' }}>
          <div className="flex gap-4" style={{ fontSize: '10px', color: '#1a801a' }}>
            <span>TERM: VT-100</span>
            <span>BAUD: 9600</span>
          </div>
          <button
            onClick={onBack}
            className="uppercase tracking-widest text-sm px-6 py-2 transition-all duration-300"
            style={{
              border: '1px solid #33ff33',
              color: '#33ff33',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontFamily: '"Share Tech Mono", monospace',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#33ff33';
              e.currentTarget.style.color = '#050505';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#33ff33';
            }}
          >
            &lt;&lt; BACK
          </button>
        </div>
      </div>
    </div>
  );
};

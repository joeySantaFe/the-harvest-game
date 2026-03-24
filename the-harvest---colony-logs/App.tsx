import React, { useState, useEffect } from 'react';
import { CRTOverlay } from './components/CRTOverlay';
import { SystemHeader } from './components/SystemHeader';
import { LogMenu } from './components/LogMenu';
import { LogViewer } from './components/LogViewer';
import { STORY_LOGS } from './data/logs';
import { SystemState } from './types';

export default function App() {
  const [state, setState] = useState<SystemState>({
    currentView: 'BOOT',
    selectedLogId: null,
  });

  const [bootProgress, setBootProgress] = useState(0);

  // Boot Sequence Effect
  useEffect(() => {
    if (state.currentView === 'BOOT') {
      const interval = setInterval(() => {
        setBootProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setState(s => ({ ...s, currentView: 'MENU' })), 500);
            return 100;
          }
          return prev + Math.floor(Math.random() * 15);
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [state.currentView]);

  const handleSelectLog = (id: string) => {
    setState({ currentView: 'READER', selectedLogId: id });
  };

  const handleBack = () => {
    setState({ currentView: 'MENU', selectedLogId: null });
  };

  const activeLog = STORY_LOGS.find(l => l.id === state.selectedLogId);

  return (
    <div className="min-h-screen bg-terminal-black text-terminal-green font-mono relative selection:bg-terminal-green selection:text-terminal-black overflow-hidden flex flex-col items-center justify-center p-4 md:p-8">
      
      {/* Visual Overlay Layers */}
      <CRTOverlay />
      
      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl h-[90vh] border border-terminal-green/50 p-6 md:p-10 shadow-[0_0_20px_rgba(51,255,51,0.15)] flex flex-col bg-black/80 backdrop-blur-sm rounded-xl">
        
        {/* Decorative Grid Lines */}
        <div className="absolute top-0 left-10 w-[1px] h-full bg-terminal-green/10 pointer-events-none" />
        <div className="absolute top-0 right-10 w-[1px] h-full bg-terminal-green/10 pointer-events-none" />
        <div className="absolute top-10 left-0 w-full h-[1px] bg-terminal-green/10 pointer-events-none" />
        <div className="absolute bottom-10 left-0 w-full h-[1px] bg-terminal-green/10 pointer-events-none" />

        {/* BOOT SCREEN */}
        {state.currentView === 'BOOT' && (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="text-2xl font-bold tracking-widest animate-pulse">SYSTEM BOOT</div>
            <div className="w-64 h-4 border border-terminal-green p-1">
              <div 
                className="h-full bg-terminal-green transition-all duration-100 ease-out"
                style={{ width: `${bootProgress}%` }}
              />
            </div>
            <div className="h-20 font-mono text-xs text-terminal-green-dim whitespace-pre text-center">
              {bootProgress < 30 && "LOADING KERNEL...\nVERIFYING CHECKSUMS..."}
              {bootProgress >= 30 && bootProgress < 70 && "MOUNTING DRIVES...\nDECRYPTING ARCHIVES..."}
              {bootProgress >= 70 && "ESTABLISHING UPLINK...\nWELCOME USER."}
            </div>
          </div>
        )}

        {/* MAIN INTERFACE */}
        {state.currentView !== 'BOOT' && (
          <>
            <SystemHeader />
            
            <main className="flex-1 overflow-hidden relative">
              {state.currentView === 'MENU' && (
                <LogMenu onSelectLog={handleSelectLog} />
              )}

              {state.currentView === 'READER' && activeLog && (
                <LogViewer log={activeLog} onBack={handleBack} />
              )}
            </main>

            <footer className="mt-6 border-t border-terminal-green/30 pt-4 flex justify-between items-center text-[10px] text-terminal-green-dim font-mono uppercase">
              <div className="flex gap-4">
                <span>TERM: VT-100</span>
                <span>BAUD: 9600</span>
              </div>
              <div className="animate-pulse">
                {state.currentView === 'MENU' ? 'AWAITING INPUT...' : 'PROCESSING STREAM...'}
              </div>
              <div>
                 COPYRIGHT 2084 WEYLAND-YUTANI CORP
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
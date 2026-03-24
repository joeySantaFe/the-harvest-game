import React, { useState, useEffect } from 'react';
import { RefreshCcw, Wifi } from 'lucide-react';

export const SystemHeader: React.FC = () => {
  const [randomCode, setRandomCode] = useState('3984-X');

  useEffect(() => {
    const interval = setInterval(() => {
      setRandomCode(Math.floor(Math.random() * 9999) + '-X');
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b-2 border-terminal-green pb-2 mb-6 flex justify-between items-end uppercase tracking-widest text-xs md:text-sm font-mono text-terminal-green shadow-[0_0_10px_rgba(51,255,51,0.3)]">
      <div className="flex flex-col">
        <span className="text-terminal-green-dim text-[10px]">INTERFACE 2037 // MOTHER</span>
        <h1 className="text-xl md:text-2xl font-bold mt-1 animate-pulse-fast">THE HARVEST_LOGS</h1>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex flex-col items-end text-[10px] text-terminal-green-dim">
          <span>MEM: 64TB FREE</span>
          <span>CPU: 12% LOAD</span>
        </div>
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 animate-pulse" />
          <span>NET: SECURE</span>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-terminal-green-dim">SESSION_ID</div>
          <div>{randomCode}</div>
        </div>
      </div>
    </header>
  );
};
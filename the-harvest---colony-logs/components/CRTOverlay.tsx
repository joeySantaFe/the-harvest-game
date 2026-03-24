import React from 'react';

export const CRTOverlay: React.FC = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden h-full w-full">
      {/* Scanlines */}
      <div 
        className="absolute inset-0 bg-repeat opacity-[0.07]"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.5))` ,
          backgroundSize: '100% 4px'
        }}
      />
      {/* RGB Shift / Flicker subtle effect - opacity controlled by keyframes now */}
      <div className="absolute inset-0 bg-terminal-green mix-blend-overlay animate-flicker pointer-events-none"></div>
      
      {/* Vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.4) 100%)'
        }}
      />
      
      {/* Screen Curvature border effect (optional, keeps it cleaner without actual 3d transform for now) */}
      <div className="absolute inset-0 border-[2px] border-terminal-green/20 rounded-lg pointer-events-none" />
    </div>
  );
};
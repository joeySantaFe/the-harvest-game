import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LogEntry } from './colonyLogTypes';
import { CRTOverlay } from './CRTOverlay';
import { Typewriter } from './Typewriter';
import { audioService } from '../../services/audioService';

type Phase = 'boot' | 'display' | 'complete';

interface ColonyLogScreenProps {
  log: LogEntry;
  onContinue: () => void;
}

export const ColonyLogScreen: React.FC<ColonyLogScreenProps> = ({ log, onContinue }) => {
  const [phase, setPhase] = useState<Phase>('boot');
  const [bootProgress, setBootProgress] = useState(0);
  const [showContinue, setShowContinue] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const mountedRef = useRef(true);

  // Start/stop terminal hum on mount/unmount
  useEffect(() => {
    audioService.init();
    audioService.playTerminalHum();
    return () => {
      mountedRef.current = false;
      audioService.stopTerminalHum();
      audioService.stopTypewriterTick();
    };
  }, []);

  // Boot sequence
  useEffect(() => {
    if (phase !== 'boot') return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setBootProgress(100);
        setTimeout(() => {
          if (mountedRef.current) setPhase('display');
        }, 400);
        return;
      }
      setBootProgress(progress);
    }, 120);

    return () => clearInterval(interval);
  }, [phase]);

  // When display phase starts: play startup blip, then start typewriter audio loop
  useEffect(() => {
    if (phase !== 'display') return;

    audioService.playTerminalBlip();
    // Small delay so startup sound is heard before text audio begins
    const timeout = setTimeout(() => {
      if (mountedRef.current) audioService.playTypewriterTick();
    }, 300);

    return () => clearTimeout(timeout);
  }, [phase]);

  const handleTypewriterComplete = useCallback(() => {
    audioService.stopTypewriterTick();
    setPhase('complete');
    setShowContinue(true);
  }, []);

  const handleContinueClick = useCallback(() => {
    if (fadingOut) return;
    audioService.playTerminalClick();
    setFadingOut(true);
    // Let the fade-out play, then transition
    setTimeout(() => {
      onContinue();
    }, 800);
  }, [fadingOut, onContinue]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: '#050505',
        fontFamily: '"Share Tech Mono", "Courier Prime", monospace',
        color: '#33ff33',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 700ms ease-out',
      }}
    >
      <CRTOverlay />

      <div
        className="relative z-10 w-full max-w-4xl mx-4 flex flex-col"
        style={{
          maxHeight: '90vh',
          border: '1px solid rgba(51, 255, 51, 0.3)',
          padding: '2rem 2.5rem',
          boxShadow: '0 0 20px rgba(51, 255, 51, 0.1)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '8px',
        }}
      >
        {/* Boot Phase */}
        {phase === 'boot' && (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: '300px' }}>
            <div
              className="text-2xl font-bold tracking-widest mb-6"
              style={{ animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
            >
              SYSTEM BOOT
            </div>
            <div
              style={{
                width: '16rem',
                height: '1rem',
                border: '1px solid #33ff33',
                padding: '2px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#33ff33',
                  width: `${bootProgress}%`,
                  transition: 'width 100ms ease-out',
                }}
              />
            </div>
            <div
              className="mt-4 text-xs text-center whitespace-pre"
              style={{ color: '#1a801a', height: '3rem' }}
            >
              {bootProgress < 30 && 'LOADING KERNEL...\nVERIFYING CHECKSUMS...'}
              {bootProgress >= 30 && bootProgress < 70 && 'MOUNTING DRIVES...\nDECRYPTING ARCHIVES...'}
              {bootProgress >= 70 && 'ESTABLISHING UPLINK...\nACCESS GRANTED.'}
            </div>
          </div>
        )}

        {/* Display Phase */}
        {phase !== 'boot' && (
          <>
            {/* System Header */}
            <header
              className="flex justify-between items-end uppercase tracking-widest text-xs pb-2 mb-6"
              style={{ borderBottom: '2px solid #33ff33' }}
            >
              <div className="flex flex-col">
                <span style={{ color: '#1a801a', fontSize: '10px' }}>
                  INTERFACE 2037 // MOTHER
                </span>
                <span className="text-xl font-bold mt-1">COLONY LOG</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden md:flex flex-col items-end" style={{ fontSize: '10px', color: '#1a801a' }}>
                  <span>CH_{String(log.chapter).padStart(2, '0')} // {log.date}</span>
                  <span>AUTH: {log.author}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#1a801a' }}>
                  REF: {log.chapter}-AF
                </div>
              </div>
            </header>

            {/* Log Title */}
            <div className="mb-6">
              <h2
                className="text-3xl tracking-widest mb-2"
                style={{
                  fontFamily: '"VT323", monospace',
                  textShadow: '0 0 10px rgba(51, 255, 51, 0.5)',
                }}
              >
                {log.title}
              </h2>
              <div
                className="flex gap-6 text-sm pl-3"
                style={{ borderLeft: '2px solid #33ff33', color: '#1a801a' }}
              >
                <span>DATE: {log.date}</span>
                <span>AUTH: {log.author}</span>
              </div>
            </div>

            {/* Content Area */}
            <div
              className="flex-1 overflow-y-auto pr-4"
              style={{ maxHeight: '50vh' }}
            >
              <div className="text-lg leading-relaxed" style={{ color: 'rgba(51, 255, 51, 0.9)' }}>
                <Typewriter
                  text={log.content}
                  speed={18}
                  onComplete={handleTypewriterComplete}
                />
              </div>
            </div>

            {/* Continue Button */}
            <div className="mt-6 pt-4 flex justify-between items-center" style={{ borderTop: '1px solid rgba(51, 255, 51, 0.2)' }}>
              <span style={{ fontSize: '10px', color: '#1a801a' }}>END OF FILE</span>
              {showContinue && (
                <button
                  onClick={handleContinueClick}
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
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(51, 255, 51, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#33ff33';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  CONTINUE &gt;&gt;
                </button>
              )}
              {!showContinue && (
                <span
                  style={{ fontSize: '10px', color: '#1a801a', animation: 'pulse 1s infinite' }}
                >
                  PROCESSING STREAM...
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

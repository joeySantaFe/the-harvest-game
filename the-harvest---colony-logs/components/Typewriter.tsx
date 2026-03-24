import React, { useState, useEffect } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export const Typewriter: React.FC<TypewriterProps> = ({ 
  text, 
  speed = 15, 
  onComplete,
  className = "" 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  
  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    
    // Simple recursive timeout for better control than interval
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeChar = () => {
      if (i < text.length) {
        setDisplayedText(text.substring(0, i + 1));
        i++;
        // Randomize speed slightly for "mechanical" feel
        const randomSpeed = speed + (Math.random() * 20 - 10); 
        timeoutId = setTimeout(typeChar, Math.max(5, randomSpeed));
      } else {
        if (onComplete) onComplete();
      }
    };

    timeoutId = setTimeout(typeChar, speed);

    return () => clearTimeout(timeoutId);
  }, [text, speed, onComplete]);

  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {displayedText}
      <span className="animate-pulse inline-block w-2 h-4 bg-terminal-green ml-1 align-middle"></span>
    </div>
  );
};
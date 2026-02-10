import React, { useState, useEffect, useRef } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  onCharacter?: () => void;
  className?: string;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  speed = 15,
  onComplete,
  onCharacter,
  className = '',
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onCharacterRef = useRef(onCharacter);

  // Keep refs current without triggering effect re-runs
  onCompleteRef.current = onComplete;
  onCharacterRef.current = onCharacter;

  useEffect(() => {
    setDisplayedText('');
    completedRef.current = false;
    let i = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeChar = () => {
      if (i < text.length) {
        setDisplayedText(text.substring(0, i + 1));
        onCharacterRef.current?.();
        i++;
        const randomSpeed = speed + (Math.random() * 20 - 10);
        timeoutId = setTimeout(typeChar, Math.max(5, randomSpeed));
      } else if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current?.();
      }
    };

    timeoutId = setTimeout(typeChar, speed);

    return () => clearTimeout(timeoutId);
  }, [text, speed]);

  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {displayedText}
      <span
        className="inline-block w-2 h-4 ml-1 align-middle"
        style={{
          backgroundColor: '#33ff33',
          animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }}
      />
    </div>
  );
};

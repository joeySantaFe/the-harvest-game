import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface TypewriterHandle {
  skip: () => void;
}

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  onCharacter?: () => void;
  className?: string;
}

export const Typewriter = forwardRef<TypewriterHandle, TypewriterProps>(({
  text,
  speed = 15,
  onComplete,
  onCharacter,
  className = '',
}, ref) => {
  const [displayedText, setDisplayedText] = useState('');
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onCharacterRef = useRef(onCharacter);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Keep refs current without triggering effect re-runs
  onCompleteRef.current = onComplete;
  onCharacterRef.current = onCharacter;

  useImperativeHandle(ref, () => ({
    skip: () => {
      if (!completedRef.current) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setDisplayedText(text);
        completedRef.current = true;
        onCompleteRef.current?.();
      }
    },
  }), [text]);

  useEffect(() => {
    setDisplayedText('');
    completedRef.current = false;
    let i = 0;

    const typeChar = () => {
      if (i < text.length) {
        setDisplayedText(text.substring(0, i + 1));
        onCharacterRef.current?.();
        i++;
        const randomSpeed = speed + (Math.random() * 20 - 10);
        timeoutRef.current = setTimeout(typeChar, Math.max(5, randomSpeed));
      } else if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current?.();
      }
    };

    timeoutRef.current = setTimeout(typeChar, speed);

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
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
});

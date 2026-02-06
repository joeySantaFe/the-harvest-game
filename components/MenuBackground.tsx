import React, { useRef, useEffect } from 'react';

// Abstract gameplay visualization for menu background
// Creates a dreamy, out-of-focus feel with gameplay elements

interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  color: string;
  type: 'ship' | 'enemy' | 'fuel' | 'bullet' | 'particle';
  life: number;
  size: number;
}

export const MenuBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entitiesRef = useRef<Entity[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize entities
    const W = canvas.width;
    const H = canvas.height;

    // Create initial entities
    const entities: Entity[] = [];

    // Add some "ships" (player-like triangles)
    for (let i = 0; i < 3; i++) {
      entities.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        angle: Math.random() * Math.PI * 2,
        color: '#0f0',
        type: 'ship',
        life: Infinity,
        size: 20,
      });
    }

    // Add some "enemies" (tank-like rectangles)
    for (let i = 0; i < 5; i++) {
      const colors = ['#f04', '#fa0', '#b0f'];
      entities.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        angle: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'enemy',
        life: Infinity,
        size: 18,
      });
    }

    // Add fuel cells
    for (let i = 0; i < 6; i++) {
      entities.push({
        x: W * 0.3 + Math.random() * W * 0.4,
        y: H * 0.3 + Math.random() * H * 0.4,
        vx: 0,
        vy: 0,
        angle: 0,
        color: '#0af',
        type: 'fuel',
        life: Infinity,
        size: 12,
      });
    }

    entitiesRef.current = entities;

    // Animation loop
    const loop = () => {
      const W = canvas.width;
      const H = canvas.height;

      // Motion blur trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, W, H);

      // Update and draw entities
      entitiesRef.current.forEach((e, i) => {
        // Update position
        e.x += e.vx;
        e.y += e.vy;

        // Wrap around screen
        if (e.x < -50) e.x = W + 50;
        if (e.x > W + 50) e.x = -50;
        if (e.y < -50) e.y = H + 50;
        if (e.y > H + 50) e.y = -50;

        // Gentle random movement for ships/enemies
        if (e.type === 'ship' || e.type === 'enemy') {
          e.angle += (Math.random() - 0.5) * 0.05;
          e.vx += Math.cos(e.angle) * 0.02;
          e.vy += Math.sin(e.angle) * 0.02;
          // Damping
          e.vx *= 0.99;
          e.vy *= 0.99;

          // Occasional shooting
          if (Math.random() < 0.005) {
            entitiesRef.current.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(e.angle) * 4,
              vy: Math.sin(e.angle) * 4,
              angle: e.angle,
              color: e.type === 'ship' ? '#0f0' : e.color,
              type: 'bullet',
              life: 60,
              size: 3,
            });
          }

          // Occasional particles (thrust)
          if (Math.random() < 0.1) {
            entitiesRef.current.push({
              x: e.x - Math.cos(e.angle) * e.size,
              y: e.y - Math.sin(e.angle) * e.size,
              vx: -Math.cos(e.angle) * 2 + (Math.random() - 0.5),
              vy: -Math.sin(e.angle) * 2 + (Math.random() - 0.5),
              angle: 0,
              color: e.type === 'ship' ? '#0ff' : '#f80',
              type: 'particle',
              life: 30 + Math.random() * 20,
              size: 2 + Math.random() * 2,
            });
          }
        }

        // Update life for temporary entities
        if (e.life !== Infinity) {
          e.life--;
        }

        // Draw based on type
        ctx.save();
        ctx.translate(e.x, e.y);

        // Glow effect
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 15;

        if (e.type === 'ship') {
          ctx.rotate(e.angle);
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(e.size, 0);
          ctx.lineTo(-e.size * 0.6, e.size * 0.5);
          ctx.lineTo(-e.size * 0.3, 0);
          ctx.lineTo(-e.size * 0.6, -e.size * 0.5);
          ctx.closePath();
          ctx.stroke();
        } else if (e.type === 'enemy') {
          ctx.rotate(e.angle);
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2;
          // Tank body
          ctx.strokeRect(-e.size * 0.7, -e.size * 0.4, e.size * 1.4, e.size * 0.8);
          // Turret
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(e.size, 0);
          ctx.stroke();
        } else if (e.type === 'fuel') {
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2;
          // Hexagon
          ctx.beginPath();
          for (let j = 0; j < 6; j++) {
            const angle = (Math.PI / 3) * j - Math.PI / 2;
            const px = e.size * Math.cos(angle);
            const py = e.size * Math.sin(angle);
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        } else if (e.type === 'bullet') {
          ctx.fillStyle = e.color;
          ctx.globalAlpha = e.life / 60;
          ctx.fillRect(-e.size / 2, -e.size / 2, e.size, e.size);
        } else if (e.type === 'particle') {
          ctx.fillStyle = e.color;
          ctx.globalAlpha = e.life / 50;
          ctx.fillRect(-e.size / 2, -e.size / 2, e.size, e.size);
        }

        ctx.restore();
      });

      // Remove dead entities
      entitiesRef.current = entitiesRef.current.filter(e => e.life > 0);

      animationRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ filter: 'blur(2px)', opacity: 0.6 }}
    />
  );
};

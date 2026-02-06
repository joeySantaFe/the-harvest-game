import React, { useRef, useEffect } from 'react';
import { ActInfo } from '../types';

interface ActThumbnailProps {
  act: ActInfo;
  isUnlocked: boolean;
  onClick: (event: React.MouseEvent) => void;
}

export const ActThumbnail: React.FC<ActThumbnailProps> = ({ act, isUnlocked, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw based on act
    switch (act.actNumber) {
      case 1: drawAct1Scene(ctx, canvas.width, canvas.height); break;
      case 2: drawAct2Scene(ctx, canvas.width, canvas.height); break;
      case 3: drawAct3Scene(ctx, canvas.width, canvas.height); break;
    }
  }, [act.actNumber]);

  const containerClasses = isUnlocked
    ? 'cursor-pointer transition-all duration-300 border-2 border-[#0f0] shadow-[0_0_15px_rgba(0,255,0,0.3)] hover:scale-105 hover:shadow-[0_0_30px_rgba(0,255,0,0.6)] hover:border-[#0f0]'
    : 'cursor-not-allowed opacity-50 grayscale border-2 border-[#444]';

  return (
    <div
      className={`relative flex flex-col items-center ${containerClasses}`}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        width={200}
        height={150}
        className="bg-black"
      />

      {/* Lock overlay for locked acts */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <span className="text-[#666] text-4xl">🔒</span>
        </div>
      )}

      {/* Title below canvas */}
      <div className="bg-black/90 w-full p-2 text-center border-t border-[#333]">
        <div className="text-[#0af] text-xs tracking-[2px] mb-1">ACT {act.actNumber}</div>
        <div className={`text-sm font-bold tracking-wider ${isUnlocked ? 'text-[#0f0]' : 'text-[#444]'}`}>
          {act.title}
        </div>
      </div>
    </div>
  );
};

// Drawing functions for each act thumbnail

function drawAct1Scene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Stars
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.5})`;
    ctx.fillRect(Math.random() * w, Math.random() * h * 0.7, 1, 1);
  }

  // Terrain
  ctx.strokeStyle = '#0af';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.8);
  ctx.lineTo(w * 0.2, h * 0.75);
  ctx.lineTo(w * 0.35, h * 0.72);
  ctx.lineTo(w * 0.42, h * 0.68);
  ctx.lineTo(w * 0.58, h * 0.68); // Landing pad
  ctx.lineTo(w * 0.65, h * 0.72);
  ctx.lineTo(w * 0.8, h * 0.78);
  ctx.lineTo(w, h * 0.85);
  ctx.stroke();

  // Landing pad highlight
  ctx.strokeStyle = '#0f0';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#0f0';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(w * 0.42, h * 0.68);
  ctx.lineTo(w * 0.58, h * 0.68);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Lander ship
  ctx.save();
  ctx.translate(w * 0.5, h * 0.4);

  // Flame first (behind ship)
  ctx.strokeStyle = '#0ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#0ff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(-4, 12);
  ctx.lineTo(0, 28);
  ctx.lineTo(4, 12);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Ship body
  ctx.fillStyle = '#c9a227';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-10, 10);
  ctx.lineTo(-12, 0);
  ctx.lineTo(-10, -8);
  ctx.lineTo(10, -8);
  ctx.lineTo(12, 0);
  ctx.lineTo(10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Legs
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 10); ctx.lineTo(-14, 18);
  ctx.moveTo(8, 10); ctx.lineTo(14, 18);
  ctx.stroke();

  // Feet
  ctx.beginPath();
  ctx.moveTo(-17, 18); ctx.lineTo(-11, 18);
  ctx.moveTo(11, 18); ctx.lineTo(17, 18);
  ctx.stroke();

  ctx.restore();
}

function drawAct2Scene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Grid background
  ctx.strokeStyle = '#0a0a0a';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 20) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Fuel cells in center
  ctx.strokeStyle = '#0af';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#0af';
  ctx.shadowBlur = 8;
  const fuelPositions = [
    { x: w * 0.45, y: h * 0.5 },
    { x: w * 0.55, y: h * 0.5 },
    { x: w * 0.5, y: h * 0.6 },
    { x: w * 0.5, y: h * 0.4 },
  ];
  fuelPositions.forEach(pos => drawHexagon(ctx, pos.x, pos.y, 10));
  ctx.shadowBlur = 0;

  // Player tank (bottom left, facing right-up)
  ctx.save();
  ctx.translate(w * 0.25, h * 0.7);
  ctx.rotate(-0.4);
  ctx.strokeStyle = '#0f0';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#0f0';
  ctx.shadowBlur = 10;
  // Tank body
  ctx.strokeRect(-10, -6, 20, 12);
  // Left tread
  ctx.strokeRect(-12, 6, 24, 3);
  // Right tread
  ctx.strokeRect(-12, -9, 24, 3);
  // Turret line
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(16, 0);
  ctx.stroke();
  // Turret base
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Enemy harvester (red, top right, approaching fuel)
  ctx.save();
  ctx.translate(w * 0.78, h * 0.3);
  ctx.rotate(2.2);
  ctx.strokeStyle = '#f04';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#f04';
  ctx.shadowBlur = 8;
  // Tank body
  ctx.strokeRect(-14, -9, 28, 18);
  // Front
  ctx.beginPath();
  ctx.moveTo(14, -6);
  ctx.lineTo(20, 0);
  ctx.lineTo(14, 6);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Bullet from player
  ctx.fillStyle = '#0f0';
  ctx.shadowColor = '#0f0';
  ctx.shadowBlur = 5;
  ctx.fillRect(w * 0.42, h * 0.55, 4, 4);
  ctx.fillRect(w * 0.38, h * 0.58, 4, 4);
  ctx.shadowBlur = 0;
}

function drawAct3Scene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const horizon = h * 0.45;

  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, horizon);
  grad.addColorStop(0, '#000');
  grad.addColorStop(1, '#001a00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, horizon);

  // Mountains
  ctx.strokeStyle = '#0f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(w * 0.1, horizon - 25);
  ctx.lineTo(w * 0.2, horizon - 10);
  ctx.lineTo(w * 0.35, horizon - 40);
  ctx.lineTo(w * 0.45, horizon - 15);
  ctx.lineTo(w * 0.55, horizon - 35);
  ctx.lineTo(w * 0.65, horizon - 20);
  ctx.lineTo(w * 0.8, horizon - 45);
  ctx.lineTo(w * 0.9, horizon - 15);
  ctx.lineTo(w, horizon - 30);
  ctx.stroke();

  // Ground grid (perspective)
  ctx.strokeStyle = '#030';
  ctx.lineWidth = 1;
  // Horizontal lines
  for (let i = 1; i <= 6; i++) {
    const y = horizon + (h - horizon) * (i / 6) * (i / 6);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // Vertical lines converging to horizon center
  const vanishX = w * 0.5;
  ctx.strokeStyle = '#020';
  for (let i = -5; i <= 5; i++) {
    const bottomX = vanishX + i * 40;
    ctx.beginPath();
    ctx.moveTo(vanishX, horizon);
    ctx.lineTo(bottomX, h);
    ctx.stroke();
  }

  // Enemy tank silhouette
  ctx.fillStyle = '#0f0';
  ctx.strokeStyle = '#0f0';
  ctx.lineWidth = 1;
  ctx.save();
  ctx.translate(w * 0.65, horizon + 35);
  // Tank body
  ctx.fillRect(-18, -6, 36, 14);
  // Turret
  ctx.fillRect(-10, -14, 20, 10);
  // Gun barrel
  ctx.fillRect(10, -11, 18, 4);
  ctx.restore();

  // Crosshair
  ctx.strokeStyle = '#0f0';
  ctx.lineWidth = 1;
  ctx.shadowColor = '#0f0';
  ctx.shadowBlur = 3;
  const cx = w * 0.5;
  const cy = h * 0.5;
  ctx.beginPath();
  // Horizontal lines
  ctx.moveTo(cx - 25, cy);
  ctx.lineTo(cx - 8, cy);
  ctx.moveTo(cx + 8, cy);
  ctx.lineTo(cx + 25, cy);
  // Vertical lines
  ctx.moveTo(cx, cy - 25);
  ctx.lineTo(cx, cy - 8);
  ctx.moveTo(cx, cy + 8);
  ctx.lineTo(cx, cy + 25);
  ctx.stroke();
  // Center dot
  ctx.fillStyle = '#0f0';
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
  ctx.shadowBlur = 0;
}

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

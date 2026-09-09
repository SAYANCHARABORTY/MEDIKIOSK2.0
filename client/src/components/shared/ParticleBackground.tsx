import React, { useEffect, useState, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

interface ClickBurst {
  id: number;
  x: number;
  y: number;
}

export const ParticleBackground: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [bursts, setBursts] = useState<ClickBurst[]>([]);

  useEffect(() => {
    // Generate subtle medical '+' glyphs across the viewport
    const initialParticles: Particle[] = Array.from({ length: 22 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.floor(Math.random() * 6) + 12, // 12px to 18px
      speed: Math.random() * 14 + 12,
      opacity: Math.random() * 0.07 + 0.025, // Soft, non-distracting
    }));
    setParticles(initialParticles);
  }, []);

  // Subtle interactive micro-burst when clicking on empty background
  const handleWindowClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('a') ||
      target.closest('select') ||
      target.closest('table') ||
      target.closest('.glass-modal')
    ) {
      return;
    }

    const newBurst: ClickBurst = {
      id: Date.now() + Math.random(),
      x: e.clientX,
      y: e.clientY,
    };

    setBursts((prev) => [...prev.slice(-4), newBurst]);
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== newBurst.id));
    }, 600);
  }, []);

  useEffect(() => {
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, [handleWindowClick]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none" aria-hidden="true">
      {/* 1. Charcoal Depth Foundation: Layered radial gradients for professional medical depth */}
      <div 
        className="absolute inset-0" 
        style={{
          background: 'radial-gradient(circle at 50% -20%, #111a22 0%, #0c1218 50%, #070a0e 100%)'
        }} 
      />

      {/* 2. Soft Ambient Lighting Orbs (Blurred healthcare/technology lighting) */}
      {/* Emerald Primary Glow */}
      <div 
        className="absolute -top-32 left-[10%] w-[520px] h-[520px] rounded-full blur-[140px]"
        style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.09) 0%, transparent 70%)' }}
      />
      {/* Cyan Secondary Ambient Light */}
      <div 
        className="absolute top-[28%] -right-28 w-[480px] h-[480px] rounded-full blur-[150px]"
        style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.07) 0%, transparent 70%)' }}
      />
      {/* Subtle Deep Azure Lower Glow */}
      <div 
        className="absolute -bottom-40 left-[25%] w-[600px] h-[600px] rounded-full blur-[160px]"
        style={{ background: 'radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, transparent 70%)' }}
      />

      {/* 3. Subtle Technical Grid Pattern (Extremely faint precision dots) */}
      <div 
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.12) 1px, transparent 0)',
          backgroundSize: '36px 36px'
        }}
      />

      {/* 4. Abstract Medical Pulse / ECG Vector Shape (Flowing softly in distant background) */}
      <svg
        className="absolute top-1/3 left-0 w-full h-48 opacity-[0.035] text-primary"
        viewBox="0 0 1200 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M0 60 H300 L320 20 L335 100 L350 40 L365 75 L380 60 H700 L720 15 L735 105 L750 35 L765 75 L780 60 H1200"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      {/* 5. Delicate Concentric Tech Rings (Depth cue behind content) */}
      <div className="absolute top-[18%] right-[8%] w-80 h-80 rounded-full border border-white/[0.025] blur-[0.5px]" />
      <div className="absolute top-[14%] right-[5%] w-[420px] h-[420px] rounded-full border border-primary/[0.02] blur-[1px]" />

      {/* 6. Floating '+' Medical Glyphs */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute font-mono select-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}px`,
            color: 'hsl(142, 70%, 45%)',
            opacity: p.opacity,
            animation: `float ${p.speed}s ease-in-out infinite`,
          }}
        >
          +
        </span>
      ))}

      {/* 7. Click burst ripple */}
      {bursts.map((b) => (
        <div
          key={b.id}
          className="absolute flex items-center justify-center animate-ping text-primary font-mono"
          style={{
            left: b.x - 12,
            top: b.y - 12,
            width: 24,
            height: 24,
            fontSize: 16,
            opacity: 0.25,
          }}
        >
          +
        </div>
      ))}
    </div>
  );
};

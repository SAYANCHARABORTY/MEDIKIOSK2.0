import React, { Suspense, memo, useState, useEffect } from 'react';

// Lazy-load Spline for optimal performance across all pages on desktop
const Spline = React.lazy(() => import('@splinetool/react-spline'));

export const GlobalSplineBackground: React.FC = memo(() => {
  // Mobile detection: screen width < 768px or mobile device user agent
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isSmallScreen = window.innerWidth < 768;
    const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isSmallScreen || (isMobileUA && window.innerWidth < 1024);
  });

  useEffect(() => {
    const checkMobile = () => {
      const isSmallScreen = window.innerWidth < 768;
      const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isSmallScreen || (isMobileUA && window.innerWidth < 1024));
    };

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => {
      const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(e.matches || (isMobileUA && window.innerWidth < 1024));
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      window.addEventListener('resize', checkMobile);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        window.removeEventListener('resize', checkMobile);
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none"
      style={{
        contain: 'strict',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }}
      aria-hidden="true"
    >
      {/* 1. Underlying 3D Spline Canvas Layer for Desktop ONLY */}
      {!isMobile ? (
        <div className="absolute inset-0 w-full h-full opacity-100 pointer-events-none">
          <Suspense fallback={<div className="absolute inset-0 bg-hero-bg transition-opacity duration-500" />}>
            <Spline
              scene="https://prod.spline.design/Slk6b8kz3LRlKiyk/scene.splinecode"
              className="w-full h-full object-cover"
            />
          </Suspense>
        </div>
      ) : (
        /* Mobile High-Performance Background: Zero WebGL/WASM overhead, 60fps native speed */
        <div className="absolute inset-0 w-full h-full bg-[#0d1210] pointer-events-none overflow-hidden">
          <div
            className="absolute -top-12 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(6, 182, 212, 0.08) 45%, transparent 70%)',
            }}
          />
          <div
            className="absolute top-[38%] -right-20 w-[300px] h-[300px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.16) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute -bottom-24 left-0 w-[320px] h-[320px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%)',
            }}
          />
        </div>
      )}

      {/* 2. Layered Translucent Atmospheric Overlays */}
      {/* Light Cinematic Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 85%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Soft Atmospheric Green Ambient Glow Orbs (Desktop Only to prevent mobile GPU blur rasterization lag) */}
      <div
        className="hidden md:block absolute -top-32 left-[15%] w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%)' }}
      />
      <div
        className="hidden md:block absolute top-[35%] -right-28 w-[540px] h-[540px] rounded-full blur-[150px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.14) 0%, transparent 70%)' }}
      />
      <div
        className="hidden md:block absolute -bottom-40 left-[30%] w-[660px] h-[660px] rounded-full blur-[160px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)' }}
      />

      {/* 3. Subtle Medical Tech Dot Grid */}
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.12) 1px, transparent 0)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* 4. Abstract Medical Pulse / ECG Vector Shape */}
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
    </div>
  );
});

GlobalSplineBackground.displayName = 'GlobalSplineBackground';

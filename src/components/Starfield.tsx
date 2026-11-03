import React, { useEffect, useRef } from 'react';

export const Starfield: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Detect low-power or mobile devices
    const isLowPower =
      (typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 4) <= 4) ||
      width < 768 ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // Adjust star density and frame rate for weak hardware
    const starCount = isLowPower ? Math.min(45, Math.floor((width * height) / 18000)) : Math.min(120, Math.floor((width * height) / 8000));
    const targetFpsInterval = isLowPower ? 1000 / 30 : 1000 / 60; // 30 FPS on weak devices, 60 FPS on high-end
    let lastRenderTime = 0;

    // Static off-screen gradient cache (created ONCE on resize instead of every single frame!)
    let bgGradient: CanvasGradient | null = null;
    let nebula1: CanvasGradient | null = null;
    let nebula2: CanvasGradient | null = null;

    const setupGradients = () => {
      bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, '#070b14');
      bgGradient.addColorStop(0.4, '#091022');
      bgGradient.addColorStop(0.7, '#0f172a');
      bgGradient.addColorStop(1, '#070b14');

      if (!isLowPower) {
        nebula1 = ctx.createRadialGradient(width * 0.2, height * 0.3, 10, width * 0.2, height * 0.3, width * 0.45);
        nebula1.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
        nebula1.addColorStop(1, 'rgba(6, 182, 212, 0)');

        nebula2 = ctx.createRadialGradient(width * 0.8, height * 0.7, 10, width * 0.8, height * 0.7, width * 0.5);
        nebula2.addColorStop(0, 'rgba(99, 102, 241, 0.04)');
        nebula2.addColorStop(1, 'rgba(99, 102, 241, 0)');
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      setupGradients();
    };

    let resizeTimer: any;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 150);
    };
    window.addEventListener('resize', debouncedResize);
    setupGradients();

    // Stars definition
    const starColors = ['#ffffff', '#bae6fd', '#7dd3fc', '#c084fc', '#e0e7ff'];
    const stars: Array<{
      x: number;
      y: number;
      radius: number;
      alpha: number;
      twinkleSpeed: number;
      color: string;
    }> = [];

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.3 + 0.4,
        alpha: Math.random() * 0.7 + 0.2,
        twinkleSpeed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        color: starColors[Math.floor(Math.random() * starColors.length)],
      });
    }

    // Occasional shooting star (disabled on low power to preserve battery)
    let shootingStar: {
      x: number;
      y: number;
      length: number;
      speed: number;
      angle: number;
      alpha: number;
      active: boolean;
    } | null = null;
    let lastShootingStarTime = Date.now();

    const render = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(render);

      // Do nothing if tab is hidden
      if (document.hidden) return;

      // Throttle FPS for low power hardware
      const delta = currentTime - lastRenderTime;
      if (delta < targetFpsInterval) return;
      lastRenderTime = currentTime - (delta % targetFpsInterval);

      // Draw background
      if (bgGradient) {
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#070b14';
        ctx.fillRect(0, 0, width, height);
      }

      // Draw subtle nebulas only on desktop / non-low-power
      if (!isLowPower && nebula1 && nebula2) {
        ctx.fillStyle = nebula1;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = nebula2;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw and twinkle stars without expensive shadowBlur
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.alpha += star.twinkleSpeed;
        if (star.alpha > 0.9) {
          star.alpha = 0.9;
          star.twinkleSpeed = -star.twinkleSpeed;
        } else if (star.alpha < 0.2) {
          star.alpha = 0.2;
          star.twinkleSpeed = -star.twinkleSpeed;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = star.alpha;
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // Handle shooting stars on capable devices
      if (!isLowPower) {
        const now = Date.now();
        if (!shootingStar && now - lastShootingStarTime > 9000 && Math.random() < 0.015) {
          lastShootingStarTime = now;
          shootingStar = {
            x: Math.random() * width,
            y: Math.random() * (height * 0.4),
            length: Math.random() * 60 + 30,
            speed: Math.random() * 8 + 10,
            angle: Math.PI / 4,
            alpha: 1,
            active: true,
          };
        }

        if (shootingStar && shootingStar.active) {
          const tailX = shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length;
          const tailY = shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length;

          ctx.strokeStyle = `rgba(56, 189, 248, ${shootingStar.alpha * 0.8})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(shootingStar.x, shootingStar.y);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();

          shootingStar.x += Math.cos(shootingStar.angle) * shootingStar.speed;
          shootingStar.y += Math.sin(shootingStar.angle) * shootingStar.speed;
          shootingStar.alpha -= 0.02;

          if (shootingStar.alpha <= 0 || shootingStar.x > width || shootingStar.y > height) {
            shootingStar = null;
          }
        }
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimer);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 gpu-accelerated"
      style={{ opacity: 0.95, transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden' }}
    />
  );
};

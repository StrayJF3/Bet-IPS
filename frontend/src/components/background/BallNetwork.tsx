import { useEffect, useRef } from 'react';
import {
  type Ball,
  LINK_DIST,
  type Pointer,
  createBallSprite,
  createBalls,
  kickAround,
  moveBalls,
} from './ballPhysics';

const LINK_RGB = '148,163,184';
const LINK_ALPHA = 0.14;
const BALL_ALPHA = 0.6;
const POINTER_SMOOTHING = 0.5;

function drawLinks(ctx: CanvasRenderingContext2D, balls: Ball[]) {
  ctx.lineWidth = 1;
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const d = Math.hypot(balls[i].x - balls[j].x, balls[i].y - balls[j].y);
      if (d > LINK_DIST) continue;
      ctx.strokeStyle = `rgba(${LINK_RGB},${(1 - d / LINK_DIST) * LINK_ALPHA})`;
      ctx.beginPath();
      ctx.moveTo(balls[i].x, balls[i].y);
      ctx.lineTo(balls[j].x, balls[j].y);
      ctx.stroke();
    }
  }
}

function drawBalls(ctx: CanvasRenderingContext2D, balls: Ball[], sprite: HTMLCanvasElement) {
  ctx.globalAlpha = BALL_ALPHA;
  for (const b of balls) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.drawImage(sprite, -b.r, -b.r, b.r * 2, b.r * 2);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** Convierte coordenadas de la ventana a coordenadas del canvas; null si caen fuera de el. */
function toLocal(canvas: HTMLCanvasElement, e: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return x < 0 || y < 0 || x > rect.width || y > rect.height ? null : { x, y };
}

interface PointerHandlers {
  onMove: (e: PointerEvent) => void;
  onDown: (e: PointerEvent) => void;
  onLeave: () => void;
  onVisibility: () => void;
}

/** Registra los eventos del puntero y de visibilidad; devuelve la funcion que los quita. */
function listenPointer({ onMove, onDown, onLeave, onVisibility }: PointerHandlers) {
  const opts = { passive: true };
  window.addEventListener('pointermove', onMove, opts);
  window.addEventListener('pointerdown', onDown, opts);
  window.addEventListener('pointerup', onLeave, opts);
  document.documentElement.addEventListener('pointerleave', onLeave);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onLeave);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/**
 * Fondo animado de la seccion de inicio: balones de futbol unidos por lineas tenues.
 *  - Ocupa solo su contenedor (debe tener `position: relative`), no toda la pagina.
 *  - Pasar el cursor sobre un balon lo patea; un clic o toque patea los balones cercanos.
 *  - Respeta prefers-reduced-motion (se dibuja una vez, sin animacion) y se pausa con la
 *    pestana oculta o cuando la seccion sale de la pantalla.
 */
export function BallNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sprite = createBallSprite();
    const pointer: Pointer = { x: 0, y: 0, vx: 0, vy: 0, active: false };
    let width = 0;
    let height = 0;
    let balls: Ball[] = [];
    let raf = 0;
    let onScreen = true;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      drawLinks(ctx, balls);
      drawBalls(ctx, balls, sprite);
    };
    const loop = () => {
      moveBalls(balls, pointer, width, height);
      draw();
      raf = requestAnimationFrame(loop);
    };
    const restart = () => {
      cancelAnimationFrame(raf);
      if (!reduced && onScreen && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      balls = createBalls(width, height);
      draw();
    };

    const onMove = (e: PointerEvent) => {
      const p = toLocal(canvas, e);
      if (!p) {
        pointer.active = false;
        return;
      }
      const k = POINTER_SMOOTHING;
      pointer.vx = pointer.active ? pointer.vx * k + (p.x - pointer.x) * (1 - k) : 0;
      pointer.vy = pointer.active ? pointer.vy * k + (p.y - pointer.y) * (1 - k) : 0;
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = true;
    };
    const onLeave = () => (pointer.active = false);
    const onDown = (e: PointerEvent) => {
      const p = toLocal(canvas, e);
      if (p) kickAround(balls, p.x, p.y);
    };

    const sizeObserver = new ResizeObserver(resize);
    const viewObserver = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      restart();
    });
    sizeObserver.observe(canvas);
    viewObserver.observe(canvas);
    const unlisten = reduced ? () => {} : listenPointer({ onMove, onDown, onLeave, onVisibility: restart });

    return () => {
      cancelAnimationFrame(raf);
      sizeObserver.disconnect();
      viewObserver.disconnect();
      unlisten();
    };
  }, []);

  return (
    <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
  );
}

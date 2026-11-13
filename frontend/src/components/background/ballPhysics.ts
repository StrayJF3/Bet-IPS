/**
 * Logica del fondo animado: balones de futbol que flotan unidos por lineas tenues
 * (una "red neuronal" de pases). Sin React: funciones puras sobre el estado de la escena.
 */

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  angle: number;
}

export interface Pointer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

const AREA_PER_BALL = 45_000; // px² de pantalla por balon
const MIN_BALLS = 10;
const MAX_BALLS = 34;
const MIN_RADIUS = 6;
const MAX_RADIUS = 13;
const DRIFT_SPEED = 0.35;
const FRICTION = 0.985;
const MIN_SPEED = 0.15;
const MAX_SPEED = 9;
const KICK_FROM_POINTER = 0.6;
const CLICK_KICK_RADIUS = 180;
const CLICK_KICK_FORCE = 9;
export const LINK_DIST = 170;

const random = (min: number, max: number) => min + Math.random() * (max - min);

export function createBalls(width: number, height: number): Ball[] {
  const count = Math.max(MIN_BALLS, Math.min(MAX_BALLS, Math.round((width * height) / AREA_PER_BALL)));
  return Array.from({ length: count }, () => ({
    x: random(0, width),
    y: random(0, height),
    vx: random(-DRIFT_SPEED, DRIFT_SPEED),
    vy: random(-DRIFT_SPEED, DRIFT_SPEED),
    r: random(MIN_RADIUS, MAX_RADIUS),
    angle: random(0, Math.PI * 2),
  }));
}

/** Si el cursor toca un balon, lo patea en la direccion y con la fuerza del movimiento. */
function kickFromPointer(ball: Ball, pointer: Pointer) {
  if (!pointer.active) return;
  const dx = ball.x - pointer.x;
  const dy = ball.y - pointer.y;
  const d = Math.hypot(dx, dy);
  if (d > ball.r + 12 || d < 0.5) return;
  ball.vx += pointer.vx * KICK_FROM_POINTER + (dx / d) * 1.5;
  ball.vy += pointer.vy * KICK_FROM_POINTER + (dy / d) * 1.5;
}

function limitSpeed(ball: Ball) {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > MAX_SPEED) {
    ball.vx *= MAX_SPEED / speed;
    ball.vy *= MAX_SPEED / speed;
  } else if (speed < MIN_SPEED) {
    ball.vx += random(-0.05, 0.05);
    ball.vy += random(-0.05, 0.05);
  }
}

function bounceOnEdges(ball: Ball, width: number, height: number) {
  if (ball.x < ball.r || ball.x > width - ball.r) {
    ball.vx *= -0.8;
    ball.x = Math.max(ball.r, Math.min(width - ball.r, ball.x));
  }
  if (ball.y < ball.r || ball.y > height - ball.r) {
    ball.vy *= -0.8;
    ball.y = Math.max(ball.r, Math.min(height - ball.r, ball.y));
  }
}

export function moveBalls(balls: Ball[], pointer: Pointer, width: number, height: number) {
  for (const ball of balls) {
    kickFromPointer(ball, pointer);
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;
    limitSpeed(ball);
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.angle += ball.vx / ball.r; // el balon gira al rodar
    bounceOnEdges(ball, width, height);
  }
}

/** Clic o toque: patea hacia afuera los balones cercanos. */
export function kickAround(balls: Ball[], x: number, y: number) {
  for (const ball of balls) {
    const dx = ball.x - x;
    const dy = ball.y - y;
    const d = Math.hypot(dx, dy);
    if (d > CLICK_KICK_RADIUS || d < 0.5) continue;
    const force = (1 - d / CLICK_KICK_RADIUS) * CLICK_KICK_FORCE;
    ball.vx += (dx / d) * force;
    ball.vy += (dy / d) * force;
  }
}

/** Dibuja un balon clasico (pentagono central + parches) una sola vez; luego se reutiliza como imagen. */
export function createBallSprite(size = 64): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext('2d')!;
  const c = size / 2;
  const r = c - 2;

  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f1f5f9';
  ctx.fill();
  ctx.save();
  ctx.clip();

  const pentagon = (cx: number, cy: number, radius: number, rotation: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = rotation + (i * 2 * Math.PI) / 5;
      ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    }
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = size / 40;
  pentagon(c, c, r * 0.36, -Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const inner = { x: c + Math.cos(a) * r * 0.36, y: c + Math.sin(a) * r * 0.36 };
    const outer = { x: c + Math.cos(a) * r * 0.95, y: c + Math.sin(a) * r * 0.95 };
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.lineTo(outer.x, outer.y);
    ctx.stroke();
    pentagon(outer.x, outer.y, r * 0.3, a + Math.PI / 5);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(15,23,42,.6)';
  ctx.lineWidth = size / 32;
  ctx.stroke();
  return sprite;
}

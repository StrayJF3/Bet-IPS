import { useRef, useState, type PointerEvent } from 'react';

const MAX_TILT_DEG = 8;
const REST = { rx: 0, ry: 0, gx: 50, gy: 50 };

interface Props {
  src: string;
  alt: string;
  visible: boolean;
}

/**
 * Foto que aparece con zoom al entrar en pantalla y que se inclina en 3D siguiendo el cursor,
 * con un reflejo de luz donde apunta el mouse. En pantallas tactiles solo hace la animacion de entrada.
 */
export function TiltPhoto({ src, alt, visible }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState(REST);

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !frameRef.current) return;
    const box = frameRef.current.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width; // 0 a 1
    const y = (e.clientY - box.top) / box.height;
    setTilt({ rx: (0.5 - y) * 2 * MAX_TILT_DEG, ry: (x - 0.5) * 2 * MAX_TILT_DEG, gx: x * 100, gy: y * 100 });
  };

  return (
    <div
      className={`[perspective:1200px] transition duration-700 ease-out ${visible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
    >
      <div
        ref={frameRef}
        onPointerMove={onMove}
        onPointerLeave={() => setTilt(REST)}
        className="group relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/50 transition-transform duration-200 ease-out"
        style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
      >
        <img src={src} alt={alt} loading="lazy" className="block h-auto w-full" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,.18), transparent 45%)`,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/70 to-transparent"
        />
      </div>
    </div>
  );
}

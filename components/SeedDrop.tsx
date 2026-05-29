'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LEVELS_BY_DIFFICULTY,
  DIFFICULTY_META,
  evaluateFunction,
  formatFormula,
  type Difficulty,
  type FunctionType,
  type SeedDropLevel,
  type SliderConfig,
} from '@/utils/seedDropLevels';

// ─── Canvas logical dimensions ────────────────────────────────────────────────
const CW = 500;
const CH = 300;

type Phase = 'setup' | 'running' | 'won' | 'lost';

// ─── Math → canvas pixel ──────────────────────────────────────────────────────
function mathToCanvas(mx: number, my: number, vp: SeedDropLevel['viewport']): [number, number] {
  return [
    ((mx - vp.xMin) / (vp.xMax - vp.xMin)) * CW,
    (1 - (my - vp.yMin) / (vp.yMax - vp.yMin)) * CH,
  ];
}

// ─── 5-pointed star path ──────────────────────────────────────────────────────
function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle  = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.42;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ─── Formula display (JSX, rich colors) ──────────────────────────────────────
function FormulaDisplay({ type, params, sliders }: {
  type:    FunctionType;
  params:  Record<string, number>;
  sliders: SliderConfig[];
}) {
  // Map param key → accent color from slider definition
  const colorOf = (key: string) =>
    sliders.find((s) => s.param === key)?.color ?? '#fff';

  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

  // Colored coefficient component
  const P = ({ v, varName = '' }: { v: number; varName?: string }) => {
    const color  = colorOf(varName === 'x²' ? 'a' : varName === 'x' ? (type === 'affine' ? 'm' : 'b') : varName);
    const abs    = Math.abs(v);
    const absStr = abs === 1 && varName ? '' : fmt(abs);
    return <span style={{ color, fontWeight: 900 }}>{absStr}{varName}</span>;
  };

  // Coefficient param key depends on context
  const mColor = colorOf('m');
  const bColor = colorOf('b');
  const aColor = colorOf('a');
  const cColor = colorOf('c');

  const sign = (v: number) => (v >= 0 ? '+' : '−');
  const fmtAbs = (v: number) => fmt(Math.abs(v));

  const base = 'f(x) = '; // f(x) = with non-breaking spaces

  if (type === 'linear') {
    const m = params.m;
    const mStr = m === 1 ? '' : m === -1 ? '−' : fmt(Math.abs(m));
    return (
      <span>
        {base}
        {m === 0
          ? <span className="text-white/50">0</span>
          : <>
              {m < 0 && <span className="text-white/60">−</span>}
              <span style={{ color: mColor, fontWeight: 900 }}>{mStr}x</span>
            </>
        }
      </span>
    );
  }

  if (type === 'affine') {
    const { m, b } = params;
    const mStr  = Math.abs(m) === 1 ? '' : fmtAbs(m);
    const mSign = m < 0 ? '−' : '';
    return (
      <span>
        {base}
        {m === 0
          ? <span className="text-white/40">0</span>
          : <><span className="text-white/60">{mSign}</span><span style={{ color: mColor, fontWeight: 900 }}>{mStr}x</span></>
        }
        {b !== 0 && (
          <> <span className="text-white/60">{sign(b)}</span>{' '}
            <span style={{ color: bColor, fontWeight: 900 }}>{fmtAbs(b)}</span>
          </>
        )}
        {b === 0 && <> <span className="text-white/25">+ 0</span></>}
      </span>
    );
  }

  if (type === 'quadratic') {
    const { a, b, c } = params;
    const aStr = Math.abs(a) === 1 ? '' : fmtAbs(a);
    const bStr = Math.abs(b) === 1 ? '' : fmtAbs(b);
    return (
      <span>
        {base}
        {/* ax² term */}
        {a === 0
          ? <span className="text-white/25">0x²</span>
          : <><span className="text-white/60">{a < 0 ? '−' : ''}</span><span style={{ color: aColor, fontWeight: 900 }}>{aStr}x²</span></>
        }
        {/* bx term */}
        {' '}<span className="text-white/60">{sign(b)}</span>{' '}
        {b === 0
          ? <span className="text-white/25">0x</span>
          : <span style={{ color: bColor, fontWeight: 900 }}>{bStr}x</span>
        }
        {/* c term */}
        {' '}<span className="text-white/60">{sign(c)}</span>{' '}
        {c === 0
          ? <span className="text-white/25">0</span>
          : <span style={{ color: cColor, fontWeight: 900 }}>{fmtAbs(c)}</span>
        }
      </span>
    );
  }

  return <span>{formatFormula(type, params)}</span>;
}

// ─── Difficulty selector screen ───────────────────────────────────────────────
function DifficultySelector({
  onSelect,
  onBack,
}: {
  onSelect: (d: Difficulty) => void;
  onBack:   () => void;
}) {
  const options: Difficulty[] = ['linear', 'affine', 'quadratic'];

  return (
    <div className="flex flex-col w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-[#3e2723] bg-[#3e2723] px-4 py-3 gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-bold text-[#efebe9]/80 hover:text-[#efebe9] hover:underline underline-offset-2"
        >
          ← Minijuegos
        </button>
        <h2 className="text-base font-bold text-[#efebe9] tracking-wide flex-1 text-center">
          🌱 Camino de Funciones
        </h2>
        <span className="w-20" />
      </div>

      {/* Cards */}
      <div className="bg-[#5d4037] p-5 space-y-3">
        <p className="text-[#efebe9]/70 text-sm text-center mb-4">
          Elige la dificultad — cada tipo de función tiene 10 niveles
        </p>

        {options.map((d) => {
          const meta = DIFFICULTY_META[d];
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              className="w-full flex items-center gap-4 rounded-xl border-2 border-white/10 bg-[#3e2723] hover:bg-[#4e342e] px-4 py-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {/* Difficulty badge */}
              <span
                className="shrink-0 rounded-lg px-3 py-1 text-sm font-black uppercase tracking-wide"
                style={{ background: meta.bg, color: meta.color }}
              >
                {meta.label}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-mono font-bold text-white text-base">{meta.formulaText}</p>
                <p className="text-[#efebe9]/55 text-xs mt-0.5">{meta.description}</p>
              </div>

              <span className="text-[#efebe9]/40 text-lg">→</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Game canvas component ────────────────────────────────────────────────────
interface GameProps {
  difficulty:         Difficulty;
  onChangeDifficulty: () => void;
  onExitToGame:       () => void;
  onAwardSeeds:       (delta: number) => Promise<void>;
}

function SeedDropGame({
  difficulty,
  onChangeDifficulty,
  onExitToGame,
  onAwardSeeds,
}: GameProps) {
  const levels = LEVELS_BY_DIFFICULTY[difficulty];
  const meta   = DIFFICULTY_META[difficulty];

  const [levelIndex, setLevelIndex]       = useState(0);
  const level                             = levels[levelIndex];

  const makeDefaults = (lvl: SeedDropLevel) =>
    Object.fromEntries(lvl.sliders.map((s) => [s.param, s.defaultVal]));

  const [params, setParams]               = useState<Record<string, number>>(() => makeDefaults(level));
  const [phase,  setPhase]                = useState<Phase>('setup');
  const [collectedStars, setCollectedStars] = useState<boolean[]>(() => Array(level.stars.length).fill(false));
  const [destReached, setDestReached]     = useState(false);
  const [showHint,    setShowHint]        = useState(false);
  const [sessionSeeds, setSessionSeeds]   = useState(0);

  // Refs so RAF loop always reads latest values without needing to restart
  const paramsRef = useRef(params);
  const phaseRef  = useRef<Phase>('setup');
  useEffect(() => { paramsRef.current = params; }, [params]);

  const animRef = useRef({
    seedX:      level.seedStartX,
    collected:  Array(level.stars.length).fill(false) as boolean[],
    destReached: false,
    lastTime:   0,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { viewport: vp, stars, destination, functionType, collectRadius } = level;
    const p    = paramsRef.current;
    const anim = animRef.current;
    const showSeed = phaseRef.current !== 'setup';

    // Background
    ctx.fillStyle = '#0c2416';
    ctx.fillRect(0, 0, CW, CH);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    const xStep = (vp.xMax - vp.xMin) > 6 ? 2 : 1;
    const yStep = (vp.yMax - vp.yMin) > 12 ? 2 : 1;
    for (let gx = Math.ceil(vp.xMin); gx <= vp.xMax; gx += xStep) {
      const [px] = mathToCanvas(gx, 0, vp);
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, CH); ctx.stroke();
    }
    for (let gy = Math.ceil(vp.yMin); gy <= vp.yMax; gy += yStep) {
      const [, py] = mathToCanvas(0, gy, vp);
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(CW, py); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    if (vp.yMin <= 0 && vp.yMax >= 0) {
      const [, ay] = mathToCanvas(0, 0, vp);
      ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(CW, ay); ctx.stroke();
    }
    if (vp.xMin <= 0 && vp.xMax >= 0) {
      const [ax] = mathToCanvas(0, 0, vp);
      ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, CH); ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle  = 'rgba(255,255,255,0.32)';
    ctx.font       = '10px monospace';
    ctx.textAlign  = 'center';
    for (let gx = Math.ceil(vp.xMin); gx <= vp.xMax; gx += xStep) {
      if (gx === 0) continue;
      const [px, py0] = mathToCanvas(gx, 0, vp);
      ctx.fillText(String(gx), px, Math.min(Math.max(py0 + 12, 11), CH - 3));
    }
    ctx.textAlign = 'right';
    for (let gy = Math.ceil(vp.yMin); gy <= vp.yMax; gy += yStep) {
      if (gy === 0) continue;
      const [px0, py] = mathToCanvas(0, gy, vp);
      ctx.fillText(String(gy), Math.min(Math.max(px0 - 3, 17), CW - 3), py + 3);
    }

    // Curve
    const xSpan = vp.xMax - vp.xMin;
    const ySpan = vp.yMax - vp.yMin;
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= 400; i++) {
      const mx = vp.xMin + (i / 400) * xSpan;
      const my = evaluateFunction(functionType, p, mx);
      if (my < vp.yMin - ySpan || my > vp.yMax + ySpan) { started = false; continue; }
      const [px, py] = mathToCanvas(mx, my, vp);
      started ? ctx.lineTo(px, py) : (ctx.moveTo(px, py), (started = true));
    }
    ctx.stroke();

    // Collect-radius guide rings
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1;
    stars.forEach((star, i) => {
      if (anim.collected[i]) return;
      const [sx, sy] = mathToCanvas(star.x, star.y, vp);
      const rPx = (collectRadius / xSpan) * CW;
      ctx.strokeStyle = 'rgba(255,215,0,0.16)';
      ctx.beginPath(); ctx.arc(sx, sy, rPx, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.setLineDash([]);

    // Destination
    {
      const [dx, dy] = mathToCanvas(destination.x, destination.y, vp);
      const rPx = (collectRadius * 1.5 / xSpan) * CW;
      const g   = ctx.createRadialGradient(dx, dy, 0, dx, dy, rPx * 2.5);
      g.addColorStop(0, anim.destReached ? 'rgba(76,175,80,0.55)' : 'rgba(76,175,80,0.18)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(dx, dy, rPx * 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = anim.destReached ? '#66bb6a' : '#388e3c';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(dx, dy, rPx, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '15px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'white';
      ctx.fillText('🏁', dx, dy + 5);
    }

    // Stars
    stars.forEach((star, i) => {
      const [sx, sy] = mathToCanvas(star.x, star.y, vp);
      if (anim.collected[i]) {
        ctx.fillStyle = 'rgba(255,215,0,0.22)';
        starPath(ctx, sx, sy, 7); ctx.fill();
      } else {
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 13;
        ctx.fillStyle   = '#ffd700';
        starPath(ctx, sx, sy, 11); ctx.fill();
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    });

    // Seed
    if (showSeed) {
      const seedY = evaluateFunction(functionType, p, anim.seedX);
      const [sx, sy] = mathToCanvas(anim.seedX, seedY, vp);
      if (sy > -30 && sy < CH + 30) {
        const grad = ctx.createRadialGradient(sx - 3, sy - 3, 1, sx, sy, 11);
        grad.addColorStop(0, '#c8e6c9'); grad.addColorStop(1, '#2e7d32');
        ctx.shadowColor = '#4caf50'; ctx.shadowBlur = 14;
        ctx.fillStyle   = grad;
        ctx.beginPath(); ctx.arc(sx, sy, 11, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = 'rgba(255,255,255,0.75)';
        ctx.beginPath(); ctx.arc(sx - 2.5, sy - 2.5, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }, [level]);

  // ── RAF loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = CW * dpr;
    canvas.height = CH * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const speed = (level.viewport.xMax - level.viewport.xMin) / 5;
    let rafId: number;

    const loop = (ts: number) => {
      const anim = animRef.current;
      const dt   = anim.lastTime ? Math.min((ts - anim.lastTime) / 1000, 0.1) : 0;
      anim.lastTime = ts;

      if (phaseRef.current === 'running') {
        anim.seedX += speed * dt;
        const p = paramsRef.current;

        // Star collection
        level.stars.forEach((star, i) => {
          if (anim.collected[i]) return;
          const sy   = evaluateFunction(level.functionType, p, anim.seedX);
          const dist = Math.hypot(anim.seedX - star.x, sy - star.y);
          if (dist <= level.collectRadius) {
            anim.collected[i] = true;
            setCollectedStars([...anim.collected]);
          }
        });

        // Destination
        if (!anim.destReached) {
          const sy   = evaluateFunction(level.functionType, p, anim.seedX);
          const dist = Math.hypot(anim.seedX - level.destination.x, sy - level.destination.y);
          if (dist <= level.collectRadius * 1.5) {
            anim.destReached = true;
            setDestReached(true);
          }
        }

        // End condition
        if (anim.seedX >= level.viewport.xMax + 0.5) {
          const allStars = anim.collected.every(Boolean);
          const won      = allStars && anim.destReached;
          phaseRef.current = won ? 'won' : 'lost';
          setPhase(won ? 'won' : 'lost');
          if (won) {
            const seeds = 10 + anim.collected.filter(Boolean).length * 5;
            setSessionSeeds((s) => s + seeds);
            onAwardSeeds(seeds).catch(() => {});
          }
        }
      }

      draw();
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [level, draw, onAwardSeeds]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const resetAnim = useCallback((lvl: SeedDropLevel = level) => {
    animRef.current = {
      seedX:       lvl.seedStartX,
      collected:   Array(lvl.stars.length).fill(false) as boolean[],
      destReached: false,
      lastTime:    0,
    };
    setCollectedStars(Array(lvl.stars.length).fill(false));
    setDestReached(false);
    setShowHint(false);
  }, [level]);

  const handleLaunch = useCallback(() => {
    resetAnim();
    phaseRef.current = 'running';
    setPhase('running');
  }, [resetAnim]);

  const handleRetry = useCallback(() => {
    resetAnim();
    phaseRef.current = 'setup';
    setPhase('setup');
  }, [resetAnim]);

  const handleNextLevel = useCallback(() => {
    const next = levelIndex + 1;
    if (next >= levels.length) { onExitToGame(); return; }
    const nextLevel   = levels[next];
    const nextParams  = makeDefaults(nextLevel);
    paramsRef.current = nextParams;
    phaseRef.current  = 'setup';
    resetAnim(nextLevel);
    setLevelIndex(next);
    setParams(nextParams);
    setPhase('setup');
  }, [levelIndex, levels, onExitToGame, resetAnim]);

  const starsCount = collectedStars.filter(Boolean).length;

  return (
    <div className="flex flex-col w-full">
      {/* Header */}
      <div className="flex items-center gap-2 border-b-4 border-[#3e2723] bg-[#3e2723] px-4 py-2.5">
        <button
          type="button"
          onClick={onChangeDifficulty}
          className="text-sm font-bold text-[#efebe9]/75 hover:text-[#efebe9] hover:underline underline-offset-2 shrink-0"
        >
          ← Dificultad
        </button>
        <span
          className="shrink-0 rounded px-2 py-0.5 text-xs font-black uppercase tracking-wide"
          style={{ background: meta.bg, color: meta.color }}
        >
          {meta.label}
        </span>
        <span className="flex-1" />
        <span className="text-xs font-bold text-[#fff59d]">
          {levelIndex + 1} / {levels.length}
        </span>
      </div>

      {/* Canvas */}
      <div className="relative bg-[#0c2416]">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', aspectRatio: `${CW}/${CH}`, display: 'block' }}
        />

        {/* Stars HUD */}
        <div className="absolute top-2 left-2 flex gap-1">
          {level.stars.map((_, i) => (
            <span
              key={i}
              className={`text-lg select-none transition-all duration-200 ${
                collectedStars[i] ? 'opacity-100' : 'opacity-25'
              }`}
            >⭐</span>
          ))}
        </div>

        {/* Win overlay */}
        {phase === 'won' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
            <div className="text-center">
              <div className="text-5xl mb-1">🎉</div>
              <p className="text-white font-bold text-xl drop-shadow">¡Nivel completado!</p>
              {sessionSeeds > 0 && (
                <p className="text-[#fff59d] text-sm mt-1">+{sessionSeeds} semillas esta partida 🌱</p>
              )}
            </div>
          </div>
        )}

        {/* Lost overlay */}
        {phase === 'lost' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
            <div className="text-center">
              <div className="text-4xl mb-1">🌧️</div>
              <p className="text-white font-bold text-lg">{starsCount}/3 estrellas</p>
              <p className="text-white/65 text-sm mt-1">
                {starsCount === 0
                  ? 'La semilla no pasó cerca de ninguna estrella'
                  : 'Ajusta los parámetros e intenta de nuevo'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-[#5d4037] px-4 py-3 space-y-3">

        {/* ── Formula box ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 rounded-xl border-2 border-[#3e2723] bg-[#1a0e00] px-4 py-3">
            <p className="text-[#efebe9]/40 text-[10px] uppercase tracking-widest mb-1 font-bold">función</p>
            <p className="font-mono text-xl sm:text-2xl leading-tight">
              <FormulaDisplay type={level.functionType} params={params} sliders={level.sliders} />
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHint((h) => !h)}
            className="shrink-0 mt-1 text-xs text-[#efebe9]/50 hover:text-[#efebe9] underline underline-offset-2"
          >
            {showHint ? 'Ocultar' : '💡 Pista'}
          </button>
        </div>

        {showHint && (
          <p className="text-sm text-[#fff59d]/80 bg-[#3e2723]/60 rounded-lg px-3 py-2 leading-snug">
            {level.hint}
          </p>
        )}

        {/* Sliders */}
        {phase === 'setup' && level.sliders.map((s) => (
          <div key={s.param} className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span
                className="font-mono font-black text-base"
                style={{ color: s.color }}
              >
                {s.param}
              </span>
              <span
                className="font-mono font-black text-base tabular-nums"
                style={{ color: s.color }}
              >
                {params[s.param]}
              </span>
            </div>
            <input
              type="range"
              min={s.min} max={s.max} step={s.step}
              value={params[s.param]}
              onChange={(e) =>
                setParams((prev) => ({ ...prev, [s.param]: Number(e.target.value) }))
              }
              style={{ accentColor: s.color }}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#efebe9]/30 font-mono">
              <span>{s.min}</span><span>{s.max}</span>
            </div>
          </div>
        ))}

        {/* Action button */}
        <div className="pt-0.5">
          {phase === 'setup' && (
            <button
              type="button"
              onClick={handleLaunch}
              className="w-full px-6 py-3 rounded-xl bg-[#efebe9] text-[#3e2723] font-bold border-b-4 border-[#bcaaa4] hover:translate-y-0.5 hover:border-b-2 active:border-b-0 transition-all"
            >
              🚀 Lanzar semilla
            </button>
          )}
          {phase === 'running' && (
            <p className="text-center text-[#efebe9]/45 py-2 text-sm animate-pulse">
              La semilla está en camino…
            </p>
          )}
          {phase === 'lost' && (
            <button
              type="button"
              onClick={handleRetry}
              className="w-full px-6 py-3 rounded-xl bg-[#efebe9] text-[#3e2723] font-bold border-b-4 border-[#bcaaa4] hover:translate-y-0.5 hover:border-b-2 active:border-b-0 transition-all"
            >
              🔄 Intentar de nuevo
            </button>
          )}
          {phase === 'won' && (
            <button
              type="button"
              onClick={handleNextLevel}
              className="w-full px-6 py-3 rounded-xl font-bold border-b-4 hover:translate-y-0.5 hover:border-b-2 active:border-b-0 transition-all"
              style={{
                background:   meta.color,
                borderColor:  meta.bg,
                color:        '#1a1a1a',
              }}
            >
              {levelIndex + 1 < levels.length ? 'Siguiente nivel →' : '🎓 ¡Serie completada!'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
interface SeedDropProps {
  onBackToMenu: () => void;
  onExitToGame: () => void;
  onAwardSeeds: (delta: number) => Promise<void>;
}

export default function SeedDrop({
  onBackToMenu,
  onExitToGame,
  onAwardSeeds,
}: SeedDropProps) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  if (!difficulty) {
    return <DifficultySelector onSelect={setDifficulty} onBack={onBackToMenu} />;
  }

  return (
    <SeedDropGame
      key={difficulty}           // remount on difficulty change
      difficulty={difficulty}
      onChangeDifficulty={() => setDifficulty(null)}
      onExitToGame={onExitToGame}
      onAwardSeeds={onAwardSeeds}
    />
  );
}

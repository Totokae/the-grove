'use client';

import { useCallback, useState } from 'react';
import {
  adaptarNivel,
  generarPregunta,
  monedasPorAcierto,
  type PreguntaMercado,
} from '@/utils/mercadoMatematico';

const TOTAL_PREGUNTAS = 10;
const NPC_SRC = '/Profesor_Ray_Z.png';

type Phase = 'playing' | 'summary';

interface MercadoMatematicoProps {
  onBackToMenu: () => void;
  onExitToGame: () => void;
  onAwardSeeds: (delta: number) => Promise<void>;
}

export default function MercadoMatematico({
  onBackToMenu,
  onExitToGame,
  onAwardSeeds,
}: MercadoMatematicoProps) {
  const [phase, setPhase] = useState<Phase>('playing');
  const [nivel, setNivel] = useState(1);
  const [preguntaNum, setPreguntaNum] = useState(1);
  const [pregunta, setPregunta] = useState<PreguntaMercado>(() => generarPregunta(1));
  const [historial, setHistorial] = useState<boolean[]>([]);
  const [intentosRestantes, setIntentosRestantes] = useState(2);
  const [input, setInput] = useState('');
  const [sessionCoins, setSessionCoins] = useState(0);
  const [mostrarSolucion, setMostrarSolucion] = useState(false);
  const [nivelFinal, setNivelFinal] = useState(1);
  const [historialResumen, setHistorialResumen] = useState<boolean[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const avanzar = useCallback(
    async (acerto: boolean, primerIntento: boolean) => {
      const nuevoHistorial = [...historial, acerto];
      const siguienteNivel = adaptarNivel(nivel, nuevoHistorial);

      if (acerto) {
        const monedas = monedasPorAcierto(nivel, primerIntento);
        if (monedas > 0) await onAwardSeeds(monedas);
        setSessionCoins((s) => s + monedas);
      }

      if (preguntaNum >= TOTAL_PREGUNTAS) {
        setHistorialResumen(nuevoHistorial);
        setNivelFinal(siguienteNivel);
        setPhase('summary');
        return;
      }

      setHistorial(nuevoHistorial);
      setNivel(siguienteNivel);
      setPreguntaNum((n) => n + 1);
      setPregunta(generarPregunta(siguienteNivel));
      setIntentosRestantes(2);
      setInput('');
      setMostrarSolucion(false);
      setErrorMsg(null);
    },
    [historial, nivel, onAwardSeeds, preguntaNum]
  );

  const confirmar = useCallback(async () => {
    if (phase !== 'playing' || mostrarSolucion) return;

    const raw = input.trim();
    if (raw === '') {
      setErrorMsg('Escribe un número.');
      return;
    }
    const valor = Number(raw);
    if (!Number.isFinite(valor) || !Number.isInteger(valor)) {
      setErrorMsg('Usa solo números enteros.');
      return;
    }
    setErrorMsg(null);

    const ok = valor === pregunta.respuesta;
    const esPrimerIntento = intentosRestantes === 2;

    if (ok) {
      await avanzar(true, esPrimerIntento);
      return;
    }

    if (intentosRestantes > 1) {
      setIntentosRestantes((i) => i - 1);
      setInput('');
      return;
    }

    setMostrarSolucion(true);
    setIntentosRestantes(0);
  }, [avanzar, input, intentosRestantes, mostrarSolucion, phase, pregunta.respuesta]);

  const continuarTrasFallo = useCallback(async () => {
    if (!mostrarSolucion) return;
    await avanzar(false, false);
  }, [avanzar, mostrarSolucion]);

  const aciertos = historialResumen.filter(Boolean).length;
  const porcentaje = Math.round((aciertos / TOTAL_PREGUNTAS) * 100);

  if (phase === 'summary') {
    return (
      <div className="flex flex-col max-h-[90vh] w-full max-w-lg">
        <div className="flex items-center justify-between border-b-4 border-[#3e2723] bg-[#3e2723] px-4 py-3 shrink-0">
          <h2 className="text-lg font-bold text-[#efebe9] tracking-wide">Mercado Matemático</h2>
          <button
            type="button"
            onClick={onExitToGame}
            className="text-[#efebe9]/70 hover:text-[#efebe9] text-2xl leading-none px-1"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto p-6 space-y-5 bg-[#5d4037]">
          <h3 className="text-xl font-bold text-[#efebe9] text-center">¡Sesión terminada!</h3>
          <ul className="space-y-3 text-[#efebe9] text-base">
            <li className="flex justify-between gap-4 border-b border-[#3e2723]/60 pb-2">
              <span className="text-[#efebe9]/80">Monedas ganadas</span>
              <span className="font-bold text-[#fff59d]">🌱 {sessionCoins}</span>
            </li>
            <li className="flex justify-between gap-4 border-b border-[#3e2723]/60 pb-2">
              <span className="text-[#efebe9]/80">Aciertos</span>
              <span className="font-bold">
                {aciertos} / {TOTAL_PREGUNTAS} ({porcentaje}%)
              </span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-[#efebe9]/80">Nivel final alcanzado</span>
              <span className="font-bold">Nivel {nivelFinal}</span>
            </li>
          </ul>
          <button
            type="button"
            onClick={onExitToGame}
            className="w-full px-6 py-3 rounded-xl bg-[#efebe9] text-[#3e2723] font-bold border-b-4 border-[#bcaaa4] hover:translate-y-0.5 hover:border-b-2 active:border-b-0 transition-all"
          >
            Volver al juego
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-h-[90vh] w-full max-w-lg">
      <div className="flex items-center justify-between border-b-4 border-[#3e2723] bg-[#3e2723] px-4 py-3 shrink-0 gap-2">
        <button
          type="button"
          onClick={onBackToMenu}
          className="text-sm font-bold text-[#efebe9]/90 hover:text-[#efebe9] underline-offset-2 hover:underline"
        >
          ← Minijuegos
        </button>
        <h2 className="text-lg font-bold text-[#efebe9] tracking-wide flex-1 text-center truncate">
          Mercado Matemático
        </h2>
        <span className="text-xs font-bold text-[#fff59d] whitespace-nowrap">
          Pregunta {preguntaNum}/{TOTAL_PREGUNTAS}
        </span>
      </div>

      <div className="overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#5d4037]">
        <div className="flex flex-wrap items-start gap-3 rounded-lg border-2 border-[#3e2723] bg-[#4e342e]/80 p-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-[#3e2723] bg-[#3e2723] flex items-center justify-center">
            <img
              src={NPC_SRC}
              alt="Rector"
              width={64}
              height={64}
              className="h-16 w-16 object-none [image-rendering:pixelated]"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-[#fff59d] mb-1">Pedido del cliente</p>
            <p className="text-[#efebe9] text-sm sm:text-base leading-snug">{pregunta.enunciado}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-[#efebe9]">
          <span className="rounded-full bg-[#3e2723] px-3 py-1 font-bold">Nivel {nivel}</span>
          <span className="rounded-full bg-[#3e2723] px-3 py-1 font-bold">
            Intentos restantes: {mostrarSolucion ? 0 : intentosRestantes}
          </span>
          <span className="rounded-full bg-[#3e2723] px-3 py-1 font-bold text-[#fff59d]">
            🌱 Esta sesión: {sessionCoins}
          </span>
        </div>

        {!mostrarSolucion ? (
          <>
            <label className="block text-sm font-bold text-[#efebe9]/90" htmlFor="mercado-respuesta">
              Tu respuesta ($)
            </label>
            <input
              id="mercado-respuesta"
              type="number"
              inputMode="numeric"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void confirmar();
              }}
              className="w-full rounded-lg border-2 border-[#3e2723] bg-[#efebe9] px-4 py-3 text-[#3e2723] text-lg font-bold placeholder:text-[#3e2723]/40"
              placeholder="0"
            />
            {errorMsg && <p className="text-sm text-[#ffab91] font-medium">{errorMsg}</p>}
            <button
              type="button"
              onClick={() => void confirmar()}
              className="w-full px-6 py-3 rounded-xl bg-[#efebe9] text-[#3e2723] font-bold border-b-4 border-[#bcaaa4] hover:translate-y-0.5 hover:border-b-2 active:border-b-0 transition-all"
            >
              Confirmar
            </button>
          </>
        ) : (
          <div className="space-y-4 rounded-lg border-2 border-[#ffab91]/50 bg-[#3e2723]/50 p-4">
            <p className="text-[#efebe9] font-medium">
              Se acabaron los intentos. La respuesta correcta era:{' '}
              <span className="text-[#fff59d] font-bold">${pregunta.respuesta}</span>
            </p>
            <button
              type="button"
              onClick={() => void continuarTrasFallo()}
              className="w-full px-6 py-3 rounded-xl bg-[#efebe9] text-[#3e2723] font-bold border-b-4 border-[#bcaaa4] hover:translate-y-0.5 hover:border-b-2 active:border-b-0 transition-all"
            >
              Siguiente pregunta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

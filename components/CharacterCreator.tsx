'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CharacterCreatorProps {
  onComplete: (data: { name: string; bodyColor: number; faceColor: number; hairColor: number }) => void;
}

// Colores predefinidos
const COLORS = [
  { hex: 0xffffff, label: 'Blanco' },
  { hex: 0xffcdb2, label: 'Piel Clara' },
  { hex: 0xe5989b, label: 'Rosado' },
  { hex: 0xb5838d, label: 'Oscuro' },
  { hex: 0x6d6875, label: 'Gris' },
  { hex: 0xffadad, label: 'Rojo' },
  { hex: 0xffd6a5, label: 'Naranja' },
  { hex: 0xfdffb6, label: 'Amarillo' },
  { hex: 0xcaffbf, label: 'Verde' },
  { hex: 0x9bf6ff, label: 'Cian' },
  { hex: 0xa0c4ff, label: 'Azul' },
  { hex: 0xbdb2ff, label: 'Morado' },
];

export default function CharacterCreator({ onComplete }: CharacterCreatorProps) {
  const [step, setStep] = useState<'login' | 'customize'>('login');
  
  // Login Data
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customization Data
  const [bodyColor, setBodyColor] = useState(0xffffff);
  const [faceColor, setFaceColor] = useState(0xffffff);
  const [hairColor, setHairColor] = useState(0xffffff);

  // Canvas para Preview
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- LÓGICA DE DIBUJADO DE PREVIEW REALISTA ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgBody = new Image(); imgBody.src = '/body.png';
    const imgFace = new Image(); imgFace.src = '/face.png';
    const imgHair = new Image(); imgHair.src = '/hair.png';

    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 👇 Función mejorada para simular el tinte de Phaser (Multiplicación)
        const drawTinted = (img: HTMLImageElement, color: number) => {
            if (!img.complete || img.naturalWidth === 0) return;
            
            const buffer = document.createElement('canvas');
            buffer.width = 32; buffer.height = 32;
            const bCtx = buffer.getContext('2d');
            if (!bCtx) return;

            // 1. Dibujar imagen base (Escala de grises)
            bCtx.drawImage(img, 0, 0, 32, 32, 0, 0, 32, 32);

            // 2. Multiplicar por el color (Esto preserva las sombras)
            bCtx.globalCompositeOperation = 'multiply';
            bCtx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
            bCtx.fillRect(0, 0, 32, 32);

            // 3. Restaurar transparencia (Usando la imagen original como máscara)
            bCtx.globalCompositeOperation = 'destination-in';
            bCtx.drawImage(img, 0, 0, 32, 32, 0, 0, 32, 32);

            // 4. Dibujar en canvas principal escalado
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(buffer, 0, 0, 128, 128); // Zoom x4
        };

        drawTinted(imgBody, bodyColor);
        drawTinted(imgFace, faceColor);
        drawTinted(imgHair, hairColor);
    };

    imgBody.onload = draw;
    imgFace.onload = draw;
    imgHair.onload = draw;
    draw();

  }, [bodyColor, faceColor, hairColor, step]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        const { data: existingUser, error: fetchError } = await supabase
            .from('players')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (existingUser) {
            onComplete({
                name: existingUser.username,
                bodyColor: existingUser.body_color,
                faceColor: existingUser.face_color,
                hairColor: existingUser.hair_color
            });
        } else {
            const { data: nameCheck } = await supabase.from('players').select('id').eq('username', username).single();
            
            if (nameCheck) {
                setError("Contraseña incorrecta o usuario ocupado.");
                setLoading(false);
                return;
            }

            setStep('customize');
            setLoading(false);
        }

    } catch (err) {
        console.error("Error Login:", err);
        setError("Error de conexión.");
        setLoading(false);
    }
  };

  const handleSaveCharacter = async () => {
      setLoading(true);
      console.log("💾 Intentando guardar personaje...", { username, bodyColor, faceColor, hairColor });

      const { data, error } = await supabase.from('players').insert({
          username,
          password,
          body_color: bodyColor,
          face_color: faceColor,
          hair_color: hairColor,
          seeds: 50
      }).select();

      if (error) {
          console.error("❌ ERROR SUPABASE:", error);
          setError(`Error al guardar: ${error.message}`);
          setLoading(false);
      } else {
          console.log("✅ Personaje guardado exitosamente:", data);
          onComplete({ name: username, bodyColor, faceColor, hairColor });
      }
  };

  // --- RENDER ---
  if (step === 'login') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d5a27]">
            <div className="bg-white p-8 rounded-xl max-w-sm w-full shadow-2xl border-4 border-[#1b5e20]">
                <h1 className="text-2xl font-bold mb-4 text-center text-[#1b5e20]">🌳 Entrar al Bosque</h1>
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <input 
                        type="text" placeholder="Usuario" required 
                        value={username} onChange={e => setUsername(e.target.value)}
                        className="p-3 border rounded-lg bg-gray-50 text-black"
                    />
                    <input 
                        type="password" placeholder="Contraseña" required 
                        value={password} onChange={e => setPassword(e.target.value)}
                        className="p-3 border rounded-lg bg-gray-50 text-black"
                    />
                    {error && <p className="text-red-600 text-sm text-center font-bold bg-red-100 p-2 rounded">{error}</p>}
                    <button disabled={loading} className="p-3 bg-[#ff8f00] text-white font-bold rounded-lg hover:bg-[#e65100] transition-colors">
                        {loading ? 'Cargando...' : 'Jugar / Crear'}
                    </button>
                </form>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a1a] text-white">
        <div className="flex gap-8 p-8 bg-[#2d2d2d] rounded-2xl shadow-2xl border border-gray-700">
            
            {/* IZQUIERDA: PREVIEW */}
            <div className="flex flex-col items-center justify-center bg-[#1a1a1a] p-4 rounded-xl border border-gray-600 w-64">
                <h2 className="text-xl font-bold mb-4 uppercase text-[#ff8f00]">{username}</h2>
                <canvas ref={canvasRef} width={128} height={128} className="image-pixelated mb-4" />
                
                {error && <p className="text-red-400 text-xs text-center mb-2">{error}</p>}
                
                <button onClick={handleSaveCharacter} disabled={loading} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg mt-auto transition-colors disabled:opacity-50">
                    {loading ? 'Guardando...' : '¡LISTO!'}
                </button>
            </div>

            {/* DERECHA: CONTROLES */}
            <div className="w-80 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="font-bold mb-2 text-gray-400 border-b border-gray-600 pb-1">Cuerpo</h3>
                <div className="grid grid-cols-6 gap-2 mb-6">
                    {COLORS.map(c => (
                        <button key={c.hex} onClick={() => setBodyColor(c.hex)} 
                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${bodyColor === c.hex ? 'border-white scale-110 ring-2 ring-white/50' : 'border-transparent'}`}
                            style={{ backgroundColor: `#${c.hex.toString(16).padStart(6,'0')}` }} 
                            title={c.label}
                        />
                    ))}
                </div>

                <h3 className="font-bold mb-2 text-gray-400 border-b border-gray-600 pb-1">Cara</h3>
                <div className="grid grid-cols-6 gap-2 mb-6">
                    {COLORS.map(c => (
                        <button key={c.hex} onClick={() => setFaceColor(c.hex)} 
                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${faceColor === c.hex ? 'border-white scale-110 ring-2 ring-white/50' : 'border-transparent'}`}
                            style={{ backgroundColor: `#${c.hex.toString(16).padStart(6,'0')}` }} 
                            title={c.label}
                        />
                    ))}
                </div>

                <h3 className="font-bold mb-2 text-gray-400 border-b border-gray-600 pb-1">Pelo</h3>
                <div className="grid grid-cols-6 gap-2 mb-6">
                    {COLORS.map(c => (
                        <button key={c.hex} onClick={() => setHairColor(c.hex)} 
                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${hairColor === c.hex ? 'border-white scale-110 ring-2 ring-white/50' : 'border-transparent'}`}
                            style={{ backgroundColor: `#${c.hex.toString(16).padStart(6,'0')}` }} 
                            title={c.label}
                        />
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
}
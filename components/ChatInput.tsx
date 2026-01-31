'use client';

import { useState, useEffect } from 'react';

// 🤬 LISTA NEGRA MULTICULTURAL (Latam Edition)
// Incluye modismos de Chile, Venezuela, Colombia, Perú, Argentina, Bolivia, etc.
const FORBIDDEN_WORDS = [
  // --- GENERAL / CHILE ---
  'puta', 'puto', 'mierda', 'conchetumare', 'ctm', 'pico', 'verga', 'pija', 'chupa',
  'weon', 'weona', 'aweonao', 'aweona', 'maricon', 'culiao', 'culia', 'ql',
  'tonto', 'estupido', 'imbecil', 'idiota', 'maraca', 'chucha', 'bastardo', 
  'asesino', 'suicidio', 'matar', 'droga', 'negro', 'nazi', 'hitler', 'mamawebo',
  
  // --- VENEZUELA / COLOMBIA / CARIBE ---
  'mamaguevo', 'mmg', 'mamahuevo', 'marico', 'marica', 'gonorrea', 'pirobo', 
  'malparido', 'carechimba', 'sapo', 'lambon', 'perra', 'zorra', 'becerro',
  
  // --- ARGENTINA / URUGUAY ---
  'boludo', 'pelotudo', 'forro', 'concha', 'trolo', 'mogolico', 'villero', 
  'pajero', 'cajeta', 'orto',
  
  // --- PERÚ / BOLIVIA / ECUADOR ---
  'cojudo', 'serrano', 'cholo', 'cabro', 'rosquete', 'cachudo', 'conchadesumadre',
  'indio', 'auquenido', // Insultos racistas comunes en bullying escolar
];

const BAN_DURATION_MS = 60 * 1000; // 1 Minuto en milisegundos

export default function ChatInput() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el Ban
  const [isBanned, setIsBanned] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // 1. Al cargar, revisar si el usuario sigue castigado
  useEffect(() => {
    const checkBan = () => {
      const banEnd = localStorage.getItem('chat_ban_end');
      if (banEnd) {
        const remaining = parseInt(banEnd) - Date.now();
        if (remaining > 0) {
          setIsBanned(true);
          setTimeLeft(Math.ceil(remaining / 1000));
        } else {
          // El tiempo ya pasó, liberamos al usuario
          localStorage.removeItem('chat_ban_end');
          setIsBanned(false);
        }
      }
    };
    
    checkBan();
    // Revisamos cada segundo para actualizar el contador visual
    const interval = setInterval(checkBan, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerBan = () => {
    const endTime = Date.now() + BAN_DURATION_MS;
    localStorage.setItem('chat_ban_end', endTime.toString());
    setIsBanned(true);
    setTimeLeft(60);
    setError('🚫 ¡Lenguaje ofensivo! Chat bloqueado por 1 min.');
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isBanned) return; // Doble seguridad

    const cleanMessage = message.trim();
    if (!cleanMessage) return;

    // 2. LÓGICA DE CENSURA MULTICULTURAL
    const lowerMessage = cleanMessage.toLowerCase();
    
    // Usamos Regex con \b para buscar palabras completas (evita falsos positivos como "computadora")
    // Pero para algunas compuestas (como "mamaguevo") funciona igual.
    const foundBadWord = FORBIDDEN_WORDS.find(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        // También revisamos si la palabra está contenida de forma obvia para insultos graves
        return regex.test(lowerMessage) || lowerMessage.includes(word);
    });

    if (foundBadWord) {
        triggerBan(); // <--- AQUÍ ACTIVAMOS EL CASTIGO
        setMessage(''); // Borramos el insulto
        return; 
    }

    // Si pasa el filtro, enviamos
    const event = new CustomEvent('PHASER_CHAT_EVENT', { detail: cleanMessage });
    window.dispatchEvent(event);

    setMessage('');
    setError(null);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md transition-all duration-300">
        
        {/* Mensaje de Error / Ban Flotante */}
        {(error || isBanned) && (
            <div className={`mb-2 px-4 py-2 text-white text-sm font-bold rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 ${isBanned ? 'bg-red-600' : 'bg-orange-500'}`}>
                {isBanned ? (
                   <>🔒 Chat bloqueado: {timeLeft}s</>
                ) : (
                   <>{error}</>
                )}
            </div>
        )}

        <form 
        onSubmit={handleSend}
        className={`
            pointer-events-auto flex items-center gap-2 
            bg-black/60 backdrop-blur-md p-2 rounded-xl border shadow-lg w-full 
            transition-all duration-200
            ${isBanned 
                ? 'border-red-600 opacity-50 grayscale pointer-events-none' // Estilo de "Castigado"
                : 'border-white/20 focus-within:ring-2 focus-within:ring-[#ff8f00]'}
        `}
        >
        <input
            type="text"
            value={message}
            onChange={(e) => !isBanned && setMessage(e.target.value)}
            disabled={isBanned}
            placeholder={isBanned ? `Espera ${timeLeft}s para escribir...` : "Di algo..."}
            maxLength={40}
            className="bg-transparent border-none outline-none text-white placeholder-white/50 w-full px-2 font-medium disabled:cursor-not-allowed"
        />
        <button 
            type="submit"
            disabled={isBanned}
            className={`
                p-2 rounded-lg text-white font-bold transition-transform active:scale-95
                ${isBanned ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#ff8f00] hover:bg-[#ff6f00]'}
            `}
        >
            {isBanned ? '🔒' : '↵'}
        </button>
        </form>
    </div>
  );
}
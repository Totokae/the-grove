export type PreguntaMercado = { enunciado: string; respuesta: number };

const productos = [
  { nombre: 'lápiz', precio: 200 },
  { nombre: 'cuaderno', precio: 450 },
  { nombre: 'goma', precio: 150 },
  { nombre: 'regla', precio: 300 },
  { nombre: 'tijera', precio: 500 },
] as const;

const aleatorio = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const prodRandom = () => productos[aleatorio(0, productos.length - 1)];

const billeteAdecuado = (total: number) => {
  const billetes = [500, 1000, 2000, 5000, 10000];
  return billetes.find((b) => b > total) ?? 10000;
};

export function generarPregunta(nivelRaw: number): PreguntaMercado {
  const nivel = Math.min(4, Math.max(1, Math.floor(nivelRaw)));

  if (nivel === 1) {
    const p = prodRandom();
    const cantidad = aleatorio(2, 5);
    return {
      enunciado: `Un cliente compra ${cantidad} ${p.nombre}s a $${p.precio} cada uno. ¿Cuánto paga en total?`,
      respuesta: p.precio * cantidad,
    };
  }
  if (nivel === 2) {
    const p1 = prodRandom();
    const p2 = prodRandom();
    const c1 = aleatorio(1, 4);
    const c2 = aleatorio(1, 3);
    const total = p1.precio * c1 + p2.precio * c2;
    return {
      enunciado: `Un cliente compra ${c1} ${p1.nombre}s a $${p1.precio} y ${c2} ${p2.nombre}s a $${p2.precio}. ¿Cuánto es el total?`,
      respuesta: total,
    };
  }
  if (nivel === 3) {
    const total = aleatorio(500, 1800);
    const billete = billeteAdecuado(total);
    return {
      enunciado: `La compra fue $${total} y el cliente paga con $${billete}. ¿Cuánto es el vuelto?`,
      respuesta: billete - total,
    };
  }
  const p1 = prodRandom();
  const p2 = prodRandom();
  const c1 = aleatorio(1, 4);
  const c2 = aleatorio(1, 3);
  const total = p1.precio * c1 + p2.precio * c2;
  const billete = billeteAdecuado(total);
  return {
    enunciado: `Un cliente compra ${c1} ${p1.nombre}s a $${p1.precio} y ${c2} ${p2.nombre}s a $${p2.precio}. Paga con $${billete}. ¿Cuánto es el vuelto?`,
    respuesta: billete - total,
  };
}

export const MONEDAS_POR_NIVEL_PRIMERO = { 1: 10, 2: 20, 3: 35, 4: 50 } as const;

export function monedasPorAcierto(nivel: number, primerIntento: boolean): number {
  const n = Math.min(4, Math.max(1, Math.floor(nivel)));
  const base = MONEDAS_POR_NIVEL_PRIMERO[n as 1 | 2 | 3 | 4];
  return primerIntento ? base : Math.floor(base / 2);
}

export function adaptarNivel(nivelActual: number, historial: boolean[]): number {
  let n = nivelActual;
  if (historial.length >= 3) {
    const a = historial[historial.length - 1];
    const b = historial[historial.length - 2];
    const c = historial[historial.length - 3];
    if (a && b && c) n = Math.min(4, n + 1);
  }
  if (historial.length >= 2) {
    const a = historial[historial.length - 1];
    const b = historial[historial.length - 2];
    if (!a && !b) n = Math.max(1, n - 1);
  }
  return n;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type FunctionType = 'linear' | 'affine' | 'quadratic';
export type Difficulty   = 'linear' | 'affine' | 'quadratic';

export interface SeedDropStar   { x: number; y: number }
export interface Viewport       { xMin: number; xMax: number; yMin: number; yMax: number }

export interface SliderConfig {
  param:      string;
  label:      string;
  min:        number;
  max:        number;
  step:       number;
  defaultVal: number;
  /** accent color shown in formula and slider label */
  color:      string;
}

export interface SeedDropLevel {
  id:            number;
  title:         string;
  functionType:  FunctionType;
  sliders:       SliderConfig[];
  stars:         SeedDropStar[];
  destination:   SeedDropStar;
  seedStartX:    number;
  viewport:      Viewport;
  collectRadius: number;
  solution:      Record<string, number>;
  hint:          string;
}

// ─── Difficulty metadata (for the selector screen) ────────────────────────────

export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; color: string; bg: string; formulaText: string; description: string }
> = {
  linear: {
    label:       'Fácil',
    color:       '#66bb6a',
    bg:          '#1b5e20',
    formulaText: 'f(x) = mx',
    description: '1 parámetro · recta por el origen',
  },
  affine: {
    label:       'Medio',
    color:       '#ffa726',
    bg:          '#e65100',
    formulaText: 'f(x) = mx + b',
    description: '2 parámetros · pendiente e intercepto',
  },
  quadratic: {
    label:       'Difícil',
    color:       '#ef5350',
    bg:          '#b71c1c',
    formulaText: 'f(x) = ax² + bx + c',
    description: '3 parámetros · parábola',
  },
};

// ─── Slider palette (each param gets a fixed color) ──────────────────────────

const COLORS = {
  m: '#fbbf24', // amber   – slope / a
  a: '#fbbf24',
  b: '#60a5fa', // blue    – intercept / bx coeff
  c: '#34d399', // green   – constant term
};

// ─── Evaluate ─────────────────────────────────────────────────────────────────

export function evaluateFunction(
  type: FunctionType,
  params: Record<string, number>,
  x: number,
): number {
  switch (type) {
    case 'linear':    return params.m * x;
    case 'affine':    return params.m * x + params.b;
    case 'quadratic': return params.a * x * x + params.b * x + params.c;
    default:          return 0;
  }
}

// ─── Plain-text formula (used on canvas / aria labels) ───────────────────────

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function coeffStr(v: number, varName: string): string {
  if (v === 0)  return '';
  if (v === 1)  return varName;
  if (v === -1) return `-${varName}`;
  return `${fmt(v)}${varName}`;
}

export function formatFormula(
  type: FunctionType,
  params: Record<string, number>,
): string {
  if (type === 'linear') {
    const t = coeffStr(params.m, 'x');
    return `f(x) = ${t || '0'}`;
  }

  if (type === 'affine') {
    const mx = coeffStr(params.m, 'x');
    const b  = params.b;
    if (!mx)          return `f(x) = ${fmt(b)}`;
    if (b === 0)      return `f(x) = ${mx}`;
    return `f(x) = ${mx} ${b > 0 ? '+' : '-'} ${fmt(Math.abs(b))}`;
  }

  if (type === 'quadratic') {
    const parts: string[] = [];
    const ax2 = coeffStr(params.a, 'x²');
    const bx  = coeffStr(params.b, 'x');
    if (ax2) parts.push(ax2);
    if (bx)  parts.push(params.b > 0 && parts.length ? `+ ${bx}` : (parts.length && params.b < 0 ? `- ${coeffStr(Math.abs(params.b), 'x')}` : bx));
    if (params.c !== 0) parts.push(params.c > 0 && parts.length ? `+ ${fmt(params.c)}` : (parts.length && params.c < 0 ? `- ${fmt(Math.abs(params.c))}` : fmt(params.c)));
    return `f(x) = ${parts.join(' ') || '0'}`;
  }

  return 'f(x) = ?';
}

// ─── Level data ───────────────────────────────────────────────────────────────
//
// Each level: stars & destination are ON the solution curve.
// The student adjusts sliders to match the curve to those fixed points.
// collectRadius shrinks as levels get harder.

// ── Lineal: y = mx ────────────────────────────────────────────────────────────

const mSlider = (def = 0): SliderConfig => ({
  param: 'm', label: 'm', min: -5, max: 5, step: 0.1, defaultVal: def, color: COLORS.m,
});

export const LINEAR_LEVELS: SeedDropLevel[] = [
  {
    id: 1, title: 'Nivel 1', functionType: 'linear',
    sliders: [mSlider()],
    stars: [{ x: 2, y: 2 }, { x: 4, y: 4 }, { x: 6, y: 6 }],
    destination: { x: 7.5, y: 7.5 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 9, yMin: -1, yMax: 9 },
    collectRadius: 0.6, solution: { m: 1 },
    hint: 'La recta pasa por el origen. Por cada unidad en x, ¿cuánto sube y?',
  },
  {
    id: 2, title: 'Nivel 2', functionType: 'linear',
    sliders: [mSlider()],
    stars: [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }],
    destination: { x: 4, y: 8 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 5, yMin: -1, yMax: 10 },
    collectRadius: 0.55, solution: { m: 2 },
    hint: 'La semilla sube el doble de lo que avanza horizontalmente.',
  },
  {
    id: 3, title: 'Nivel 3', functionType: 'linear',
    sliders: [mSlider()],
    stars: [{ x: 2, y: -2 }, { x: 4, y: -4 }, { x: 6, y: -6 }],
    destination: { x: 7.5, y: -7.5 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 9, yMin: -9, yMax: 1 },
    collectRadius: 0.55, solution: { m: -1 },
    hint: 'Las estrellas están debajo del eje x. La pendiente debe ser negativa.',
  },
  {
    id: 4, title: 'Nivel 4', functionType: 'linear',
    sliders: [mSlider()],
    stars: [{ x: 2, y: 1 }, { x: 4, y: 2 }, { x: 6, y: 3 }],
    destination: { x: 8, y: 4 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 9.5, yMin: -1, yMax: 5.5 },
    collectRadius: 0.5, solution: { m: 0.5 },
    hint: 'La semilla sube despacio. La pendiente es menor que 1.',
  },
  {
    id: 5, title: 'Nivel 5', functionType: 'linear',
    sliders: [mSlider()],
    stars: [{ x: 1, y: 3 }, { x: 2, y: 6 }, { x: 2.5, y: 7.5 }],
    destination: { x: 3, y: 9 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 4, yMin: -1, yMax: 11 },
    collectRadius: 0.5, solution: { m: 3 },
    hint: 'Pendiente entera entre 2 y 4. El punto (1, ?) te da la clave.',
  },
  {
    id: 6, title: 'Nivel 6', functionType: 'linear',
    sliders: [mSlider()],
    stars: [{ x: 1, y: -2 }, { x: 2, y: -4 }, { x: 3, y: -6 }],
    destination: { x: 4, y: -8 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 5, yMin: -10, yMax: 1 },
    collectRadius: 0.45, solution: { m: -2 },
    hint: 'Pendiente negativa: la semilla baja el doble de lo que avanza.',
  },
  {
    id: 7, title: 'Nivel 7', functionType: 'linear',
    sliders: [mSlider()],
    stars: [{ x: 1, y: 1.5 }, { x: 3, y: 4.5 }, { x: 5, y: 7.5 }],
    destination: { x: 6, y: 9 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 7.5, yMin: -1, yMax: 11 },
    collectRadius: 0.45, solution: { m: 1.5 },
    hint: 'Pendiente decimal entre 1 y 2. Observa la estrella en (1, 1.5).',
  },
  {
    id: 8, title: 'Nivel 8', functionType: 'linear',
    sliders: [mSlider()],
    stars: [{ x: 2, y: -1 }, { x: 4, y: -2 }, { x: 6, y: -3 }],
    destination: { x: 8, y: -4 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 9.5, yMin: -5.5, yMax: 1 },
    collectRadius: 0.4, solution: { m: -0.5 },
    hint: 'Pendiente negativa suave. La semilla baja solo la mitad de lo que avanza.',
  },
  {
    id: 9, title: 'Nivel 9', functionType: 'linear',
    sliders: [mSlider()],
    stars: [{ x: 0.5, y: 2 }, { x: 1, y: 4 }, { x: 1.5, y: 6 }],
    destination: { x: 2, y: 8 },
    seedStartX: 0.1,
    viewport: { xMin: -0.5, xMax: 3, yMin: -1, yMax: 10 },
    collectRadius: 0.4, solution: { m: 4 },
    hint: 'Pendiente muy pronunciada. En x = 0.5, la función ya vale 2.',
  },
  {
    id: 10, title: 'Nivel 10', functionType: 'linear',
    sliders: [mSlider()],
    stars: [{ x: 0.5, y: -1.5 }, { x: 1, y: -3 }, { x: 1.5, y: -4.5 }],
    destination: { x: 2, y: -6 },
    seedStartX: 0.1,
    viewport: { xMin: -0.5, xMax: 3, yMin: -8, yMax: 1 },
    collectRadius: 0.35, solution: { m: -3 },
    hint: 'Pendiente negativa y pronunciada. En x = 1, y vale -3.',
  },
];

// ── Afín: y = mx + b ──────────────────────────────────────────────────────────

const affinSliders = (mDef = 0, bDef = 0): SliderConfig[] => [
  { param: 'm', label: 'm', min: -5, max: 5,  step: 0.5, defaultVal: mDef, color: COLORS.m },
  { param: 'b', label: 'b', min: -8, max: 8,  step: 0.5, defaultVal: bDef, color: COLORS.b },
];

export const AFFINE_LEVELS: SeedDropLevel[] = [
  {
    id: 1, title: 'Nivel 1', functionType: 'affine',
    sliders: affinSliders(),
    stars: [{ x: 1, y: 3 }, { x: 3, y: 5 }, { x: 5, y: 7 }],
    destination: { x: 7, y: 9 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 8, yMin: 1, yMax: 11 },
    collectRadius: 0.6, solution: { m: 1, b: 2 },
    hint: 'Misma pendiente que y = x, pero desplazada hacia arriba. ¿Cuánto vale f(0)?',
  },
  {
    id: 2, title: 'Nivel 2', functionType: 'affine',
    sliders: affinSliders(),
    stars: [{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }],
    destination: { x: 4, y: 9 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 5, yMin: 0, yMax: 11 },
    collectRadius: 0.55, solution: { m: 2, b: 1 },
    hint: 'La pendiente es 2 y el intercepto es positivo. Busca f(0).',
  },
  {
    id: 3, title: 'Nivel 3', functionType: 'affine',
    sliders: affinSliders(),
    stars: [{ x: 1, y: 4 }, { x: 3, y: 2 }, { x: 5, y: 0 }],
    destination: { x: 6, y: -1 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 7, yMin: -2, yMax: 7 },
    collectRadius: 0.55, solution: { m: -1, b: 5 },
    hint: 'La recta baja de izquierda a derecha. El intercepto es positivo.',
  },
  {
    id: 4, title: 'Nivel 4', functionType: 'affine',
    sliders: affinSliders(),
    stars: [{ x: 2, y: 4 }, { x: 4, y: 5 }, { x: 6, y: 6 }],
    destination: { x: 8, y: 7 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 9.5, yMin: 2, yMax: 9 },
    collectRadius: 0.5, solution: { m: 0.5, b: 3 },
    hint: 'Pendiente suave. En x = 0, la función vale 3.',
  },
  {
    id: 5, title: 'Nivel 5', functionType: 'affine',
    sliders: affinSliders(),
    stars: [{ x: 2, y: 2 }, { x: 3, y: 5 }, { x: 4, y: 8 }],
    destination: { x: 4.5, y: 9.5 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 5.5, yMin: -5, yMax: 11 },
    collectRadius: 0.5, solution: { m: 3, b: -4 },
    hint: 'Pendiente pronunciada con intercepto negativo. La recta corta al eje x entre 1 y 2.',
  },
  {
    id: 6, title: 'Nivel 6', functionType: 'affine',
    sliders: affinSliders(),
    stars: [{ x: 1, y: 4 }, { x: 2, y: 2 }, { x: 3, y: 0 }],
    destination: { x: 3.5, y: -1 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 4.5, yMin: -2, yMax: 8 },
    collectRadius: 0.45, solution: { m: -2, b: 6 },
    hint: 'La recta cruza el eje x en x = 3. Calcula f(0) para hallar b.',
  },
  {
    id: 7, title: 'Nivel 7', functionType: 'affine',
    sliders: affinSliders(),
    stars: [{ x: 2, y: 1 }, { x: 4, y: 4 }, { x: 6, y: 7 }],
    destination: { x: 7.5, y: 9.25 },
    seedStartX: 1.5,
    viewport: { xMin: -0.5, xMax: 8.5, yMin: -3, yMax: 11 },
    collectRadius: 0.45, solution: { m: 1.5, b: -2 },
    hint: 'Pendiente 1.5 e intercepto negativo. La recta corta al eje x entre 1 y 2.',
  },
  {
    id: 8, title: 'Nivel 8', functionType: 'affine',
    sliders: affinSliders(),
    stars: [{ x: 2, y: 3 }, { x: 4, y: 2 }, { x: 6, y: 1 }],
    destination: { x: 8, y: 0 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 9.5, yMin: -1, yMax: 5.5 },
    collectRadius: 0.4, solution: { m: -0.5, b: 4 },
    hint: 'Pendiente negativa suave. La recta cruza el eje x en x = 8.',
  },
  {
    id: 9, title: 'Nivel 9', functionType: 'affine',
    sliders: affinSliders(),
    stars: [{ x: 1.5, y: 0.75 }, { x: 3, y: 4.5 }, { x: 4, y: 7 }],
    destination: { x: 5, y: 9.5 },
    seedStartX: 1.2,
    viewport: { xMin: -0.5, xMax: 5.5, yMin: -4, yMax: 11 },
    collectRadius: 0.4, solution: { m: 2.5, b: -3 },
    hint: 'Pendiente 2.5 con intercepto −3. La recta corta al eje x en x = 1.2.',
  },
  {
    id: 10, title: 'Nivel 10', functionType: 'affine',
    sliders: affinSliders(),
    stars: [{ x: 1, y: 3.5 }, { x: 2, y: 2 }, { x: 3, y: 0.5 }],
    destination: { x: 4, y: -1 },
    seedStartX: 0.2,
    viewport: { xMin: -0.5, xMax: 5, yMin: -2, yMax: 7 },
    collectRadius: 0.35, solution: { m: -1.5, b: 5 },
    hint: 'Pendiente −1.5 e intercepto 5. La recta corta al eje x cerca de x = 3.3.',
  },
];

// ── Cuadrática: y = ax² + bx + c ─────────────────────────────────────────────

const quadSliders = (aDef = 0, bDef = 0, cDef = 0): SliderConfig[] => [
  { param: 'a', label: 'a', min: -3, max: 3, step: 0.5, defaultVal: aDef, color: COLORS.a },
  { param: 'b', label: 'b', min: -6, max: 6, step: 0.5, defaultVal: bDef, color: COLORS.b },
  { param: 'c', label: 'c', min: -6, max: 6, step: 0.5, defaultVal: cDef, color: COLORS.c },
];

export const QUADRATIC_LEVELS: SeedDropLevel[] = [
  {
    id: 1, title: 'Nivel 1', functionType: 'quadratic',
    sliders: quadSliders(),
    stars: [{ x: 0.5, y: 0.25 }, { x: 1, y: 1 }, { x: 2, y: 4 }],
    destination: { x: 2.5, y: 6.25 },
    seedStartX: 0.1,
    viewport: { xMin: -0.5, xMax: 3.5, yMin: -0.5, yMax: 8 },
    collectRadius: 0.55, solution: { a: 1, b: 0, c: 0 },
    hint: 'Parábola básica: a = 1, b = 0, c = 0. El vértice está en el origen.',
  },
  {
    id: 2, title: 'Nivel 2', functionType: 'quadratic',
    sliders: quadSliders(),
    stars: [{ x: 0, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 6 }],
    destination: { x: 2.5, y: 8.25 },
    seedStartX: 0.1,
    viewport: { xMin: -0.5, xMax: 3.5, yMin: 1, yMax: 10 },
    collectRadius: 0.55, solution: { a: 1, b: 0, c: 2 },
    hint: 'Misma forma que y = x², pero desplazada. ¿Cuánto vale f(0)? Eso es c.',
  },
  {
    id: 3, title: 'Nivel 3', functionType: 'quadratic',
    sliders: quadSliders(),
    stars: [{ x: 0, y: -2 }, { x: 1, y: -1 }, { x: 2, y: 2 }],
    destination: { x: 2.5, y: 4.25 },
    seedStartX: 0.1,
    viewport: { xMin: -0.5, xMax: 3.5, yMin: -3, yMax: 6 },
    collectRadius: 0.5, solution: { a: 1, b: 0, c: -2 },
    hint: 'c negativo desplaza la parábola hacia abajo. El vértice está debajo del eje x.',
  },
  {
    id: 4, title: 'Nivel 4', functionType: 'quadratic',
    sliders: quadSliders(),
    stars: [{ x: 0, y: 4 }, { x: 1, y: 3 }, { x: 2, y: 0 }],
    destination: { x: 2.5, y: -2.25 },
    seedStartX: 0.1,
    viewport: { xMin: -0.5, xMax: 3.5, yMin: -3, yMax: 6 },
    collectRadius: 0.5, solution: { a: -1, b: 0, c: 4 },
    hint: 'a negativo invierte la parábola. Busca el vértice más alto (es c).',
  },
  {
    id: 5, title: 'Nivel 5', functionType: 'quadratic',
    sliders: quadSliders(),
    stars: [{ x: 0.5, y: 0.5 }, { x: 1, y: 2 }, { x: 2, y: 8 }],
    destination: { x: 2.5, y: 12.5 },
    seedStartX: 0.1,
    viewport: { xMin: -0.5, xMax: 3.5, yMin: -0.5, yMax: 14 },
    collectRadius: 0.5, solution: { a: 2, b: 0, c: 0 },
    hint: 'Parábola más estrecha: a = 2 sube el doble que a = 1.',
  },
  {
    id: 6, title: 'Nivel 6', functionType: 'quadratic',
    sliders: quadSliders(),
    stars: [{ x: 0, y: 0 }, { x: 1, y: -1 }, { x: 3, y: 3 }],
    destination: { x: 3.5, y: 5.25 },
    seedStartX: 0.1,
    viewport: { xMin: -0.5, xMax: 4.5, yMin: -2, yMax: 7 },
    collectRadius: 0.5, solution: { a: 1, b: -2, c: 0 },
    hint: 'El parámetro b mueve el vértice horizontalmente. Vértice en x = −b/(2a).',
  },
  {
    id: 7, title: 'Nivel 7', functionType: 'quadratic',
    sliders: quadSliders(),
    stars: [{ x: 0, y: 3 }, { x: 2, y: -1 }, { x: 4, y: 3 }],
    destination: { x: 5, y: 8 },
    seedStartX: 0.1,
    viewport: { xMin: -0.5, xMax: 6, yMin: -2, yMax: 10 },
    collectRadius: 0.45, solution: { a: 1, b: -4, c: 3 },
    hint: 'Las raíces de esta parábola son x = 1 y x = 3. El vértice está en x = 2.',
  },
  {
    id: 8, title: 'Nivel 8', functionType: 'quadratic',
    sliders: quadSliders(),
    stars: [{ x: 1, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 0 }],
    destination: { x: 3.5, y: -0.75 },
    seedStartX: 0.5,
    viewport: { xMin: -0.5, xMax: 5, yMin: -2, yMax: 3 },
    collectRadius: 0.4, solution: { a: -1, b: 4, c: -3 },
    hint: 'Parábola invertida con raíces en x = 1 y x = 3. Vértice en x = 2.',
  },
  {
    id: 9, title: 'Nivel 9', functionType: 'quadratic',
    sliders: quadSliders(),
    stars: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 1.5 }],
    destination: { x: 4, y: 4 },
    seedStartX: 0.1,
    viewport: { xMin: -0.5, xMax: 5, yMin: -1, yMax: 6 },
    collectRadius: 0.4, solution: { a: 0.5, b: -1, c: 0 },
    hint: 'a = 0.5 da una parábola más ancha. Las raíces son x = 0 y x = 2.',
  },
  {
    id: 10, title: 'Nivel 10', functionType: 'quadratic',
    sliders: quadSliders(),
    stars: [{ x: 0, y: 0 }, { x: 1, y: -2 }, { x: 3, y: 6 }],
    destination: { x: 3.5, y: 10.5 },
    seedStartX: 0.1,
    viewport: { xMin: -0.5, xMax: 4.5, yMin: -3, yMax: 12 },
    collectRadius: 0.35, solution: { a: 2, b: -4, c: 0 },
    hint: 'a = 2, raíces en x = 0 y x = 2. El vértice es el punto más bajo de la curva.',
  },
];

// ─── Map difficulty → levels ───────────────────────────────────────────────────

export const LEVELS_BY_DIFFICULTY: Record<Difficulty, SeedDropLevel[]> = {
  linear:    LINEAR_LEVELS,
  affine:    AFFINE_LEVELS,
  quadratic: QUADRATIC_LEVELS,
};

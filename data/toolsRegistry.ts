// data/toolsRegistry.ts

export type ToolType = 'iframe' | 'quiz' | 'custom';

export interface ToolDefinition {
  title: string;
  type: ToolType;
  url?: string; // Para iframes (GeoGebra, etc.)
  description?: string;
  quizData?: any; // Para el futuro
}

export const TOOLS: Record<string, ToolDefinition> = {
  // Herramienta de prueba (Sumas básicas local)
  'basic_sum': {
    title: "🍎 Sumando Manzanas",
    type: 'custom', // Usaremos el componente hardcodeado por ahora como demo
    description: "Aprende a sumar objetos básicos."
  },
  
  // Herramienta Real: GeoGebra
  'geogebra_geometry': {
    title: "📐 Geometría Dinámica",
    type: 'iframe',
    url: "https://www.geogebra.org/material/iframe/id/mmav6pnn/width/800/height/500/border/888888/sfsb/true/smb/false/stb/false/stbh/false/ai/false/asb/false/sri/true/rc/false/ld/false/sdz/true/ctl/false",
    description: "Explora los triángulos y sus ángulos."
  },

  // Herramienta del PDF: Cubo de Binomio
  'fraction_visualizer': {
    title: "🧊 Cubo de Binomio",
    type: 'iframe',
    url: "https://web1-xi-six.vercel.app/cubobinomio.html",
    description: "Visualización 3D de la expansión binomial."
  },
  // Agrega esto dentro de la constante TOOLS en data/toolsRegistry.ts

  // --- 5º BÁSICO: FRACCIONES ---
  'fraction_lab': {
    title: "🧪 Laboratorio de Fracciones",
    type: 'iframe',
    // Usaremos una simulación de PhET (Universidad de Colorado) que es excelente
    url: "https://phet.colorado.edu/sims/html/fractions-intro/latest/fractions-intro_es.html", 
    description: "Experimenta visualmente qué representa el numerador y el denominador."
  },

//6to 
//7mo
//8vo
//1rom
//2dom
//3rom

  // --- 3º MEDIO: NÚMEROS COMPLEJOS ---
  'complex_plane': {
    title: "🌀 El Plano de Argand",
    type: 'iframe',
    // Un gráfico de GeoGebra sobre módulos y conjugados
    url: "https://www.geogebra.org/material/iframe/id/v5w9k3z8/width/800/height/500/border/888888/sfsb/true/smb/false/stb/false/stbh/false/ai/false/asb/false/sri/true/rc/false/ld/false/sdz/true/ctl/false",
    description: "Visualiza la parte real e imaginaria en el plano complejo."
  }
};

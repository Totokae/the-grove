// // data/questionBank.ts

export interface Question {
  id: string;
  topic: string;
  text: string;        // <--- NUEVO: El texto en español (React lo ajustará solo)
  expression?: string; // <--- NUEVO: La fórmula matemática (Opcional)
  solution: number;
  difficulty: 1 | 2 | 3;
}

export const QUESTION_BANK: Record<string, Record<string, Question[]>> = {
  '5° Básico': {
    'Números': [
      {
        id: '5b-num-1',
        topic: 'Operaciones Combinadas',
        text: 'Resuelve la siguiente operación:',
        expression: '3 \\cdot (15 - 8) + 4', // Solo números y símbolos aquí
        solution: 25,
        difficulty: 1
      },
      {
        id: '5b-num-2',
        topic: 'Fracciones',
        text: 'Completa la suma de fracciones:',
        expression: '\\frac{2}{7} + \\frac{3}{7} = \\frac{x}{7}',
        solution: 5, 
        difficulty: 1
      },
      {
        id: '5b-num-3',
        topic: 'Grandes Números',
        text: 'Si multiplicamos lo siguiente, ¿cuál es el resultado?',
        expression: '12.500 \\cdot 4 = x',
        solution: 50000,
        difficulty: 2
      }
    ],
    'Álgebra': [
      {
        id: '5b-alg-1',
        topic: 'Ecuaciones Simples',
        text: 'Encuentra el valor de x en la ecuación:',
        expression: 'x + 12 = 30',
        solution: 18,
        difficulty: 1
      },
      {
        id: '5b-alg-2',
        topic: 'Patrones',
        text: 'Identifica el siguiente número de la secuencia:',
        expression: '2, 5, 8, 11, x',
        solution: 14,
        difficulty: 1
      },
      {
        id: '5b-alg-3',
        topic: 'Valorización',
        text: 'Si a=5 y b=3, calcula el resultado de:',
        expression: '2a + 3b',
        solution: 19,
        difficulty: 2
      }
    ],
    'Geometría': [
      {
        id: '5b-geo-1',
        topic: 'Perímetros',
        text: 'Un cuadrado tiene un lado de 5 cm. ¿Cuál es su perímetro total?',
        // No hay expresión visual necesaria, es un problema de texto
        solution: 20,
        difficulty: 1
      },
      {
        id: '5b-geo-2',
        topic: 'Conversión',
        text: '¿A cuántos metros equivalen 3 kilómetros?',
        solution: 3000,
        difficulty: 1
      },
      {
        id: '5b-geo-3',
        topic: 'Áreas',
        text: 'Calcula el área de un rectángulo con estas dimensiones:',
        expression: '4 \\text{m} \\times 6 \\text{m}',
        solution: 24,
        difficulty: 2
      }
    ],
    'Datos y Azar': [
      {
        id: '5b-dat-1',
        topic: 'Promedios',
        text: 'Calcula el promedio de los siguientes datos:',
        expression: '4, 6, 8',
        solution: 6,
        difficulty: 2
      },
      {
        id: '5b-dat-2',
        topic: 'Interpretación',
        text: '¿Cuál es la moda en el siguiente conjunto de datos?',
        expression:  '3, 5, 5, 7, 5, 9, 5, 11, 5',
        solution: 5,
        difficulty: 1
      }
    ]
  },
  '6° Básico': {},
  '1° Medio': {} 
};
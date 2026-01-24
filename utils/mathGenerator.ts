interface MathProblem {
  question: string;
  answer: number;
}

/**
 * Genera un problema matemático basado en el nivel de dificultad
 * @param difficulty - Nivel de dificultad (puede ser el puntaje actual)
 * @returns Objeto con la pregunta y la respuesta correcta
 */
export function generateProblem(difficulty: number): MathProblem {
  // Determinar el nivel de dificultad basado en el puntaje
  // Baja: 0-30 puntos
  // Media: 31-100 puntos
  // Alta: 101+ puntos
  
  if (difficulty < 30) {
    return generateEasyProblem();
  } else if (difficulty < 100) {
    return generateMediumProblem();
  } else {
    return generateHardProblem();
  }
}

/**
 * Genera problemas de suma y resta simples (dificultad baja)
 */
function generateEasyProblem(): MathProblem {
  const operations = ['suma', 'resta'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  if (operation === 'suma') {
    const a = Math.floor(Math.random() * 20) + 1; // 1-20
    const b = Math.floor(Math.random() * 20) + 1; // 1-20
    return {
      question: `¿Cuánto es ${a} + ${b}?`,
      answer: a + b,
    };
  } else {
    // Resta: asegurar que el resultado sea positivo
    const a = Math.floor(Math.random() * 20) + 10; // 10-30
    const b = Math.floor(Math.random() * a) + 1; // 1 hasta a
    return {
      question: `¿Cuánto es ${a} - ${b}?`,
      answer: a - b,
    };
  }
}

/**
 * Genera problemas de multiplicación (dificultad media)
 */
function generateMediumProblem(): MathProblem {
  const a = Math.floor(Math.random() * 10) + 1; // 1-10
  const b = Math.floor(Math.random() * 10) + 1; // 1-10
  return {
    question: `¿Cuánto es ${a} × ${b}?`,
    answer: a * b,
  };
}

/**
 * Genera ecuaciones simples o problemas de planteo (dificultad alta)
 */
function generateHardProblem(): MathProblem {
  const problemTypes = ['ecuacion', 'planteo'];
  const type = problemTypes[Math.floor(Math.random() * problemTypes.length)];
  
  if (type === 'ecuacion') {
    // Ecuaciones simples: ax = b
    const a = Math.floor(Math.random() * 5) + 2; // 2-6
    const x = Math.floor(Math.random() * 10) + 1; // 1-10
    const b = a * x;
    return {
      question: `Encuentra x: ${a}x = ${b}`,
      answer: x,
    };
  } else {
    // Problemas de planteo predefinidos
    const wordProblems = [
      {
        question: 'Si tienes 15 manzanas y regalas 7, ¿cuántas te quedan?',
        answer: 8,
      },
      {
        question: 'Un árbol tiene 24 ramas. Si se caen 9, ¿cuántas quedan?',
        answer: 15,
      },
      {
        question: 'Tienes 18 semillas y plantas 6 cada día. ¿Cuántas plantas en 2 días?',
        answer: 12,
      },
      {
        question: 'Si un bosque tiene 30 árboles y se plantan 12 más, ¿cuántos hay en total?',
        answer: 42,
      },
      {
        question: 'Tienes 20 hojas. Si el viento se lleva 8, ¿cuántas quedan?',
        answer: 12,
      },
      {
        question: 'Un jardín tiene 16 flores. Si florecen 5 más, ¿cuántas hay en total?',
        answer: 21,
      },
      {
        question: 'Si compras 3 paquetes de semillas con 7 semillas cada uno, ¿cuántas semillas tienes?',
        answer: 21,
      },
      {
        question: 'Tienes 25 frutos. Si comes 9, ¿cuántos te quedan?',
        answer: 16,
      },
    ];
    
    const selected = wordProblems[Math.floor(Math.random() * wordProblems.length)];
    return selected;
  }
}


const fs = require('fs');
const path = require('path');

// Contenido limpio y puro para Tailwind v3
const content = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(to bottom, transparent, rgb(var(--background-end-rgb))) rgb(var(--background-start-rgb));
  margin: 0;
  padding: 0;
  overflow: hidden;
}`;

// Ruta al archivo
const filePath = path.join(__dirname, 'app', 'globals.css');

// Borrar si existe
if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log('Archivo viejo eliminado.');
}

// Crear nuevo con codificación UTF-8 estricta (sin BOM)
fs.writeFileSync(filePath, content, { encoding: 'utf8' });
console.log('✅ globals.css creado exitosamente y DESINFECTADO.');
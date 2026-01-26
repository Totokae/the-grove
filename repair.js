const fs = require('fs');
const path = require('path');

// 1. Definir rutas
const cssPath = path.join(__dirname, 'app', 'globals.css');
const cachePath = path.join(__dirname, '.next');

// 2. Borrar la caché corrupta (Soluciona el error de Webpack)
try {
    if (fs.existsSync(cachePath)) {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log('🗑️  Caché (.next) eliminada.');
    }
} catch (e) {
    console.log('⚠️  No se pudo borrar .next (puede que ya esté borrado).');
}

// 3. Borrar el CSS corrupto
try {
    if (fs.existsSync(cssPath)) {
        fs.unlinkSync(cssPath);
        console.log('🗑️  Archivo globals.css corrupto eliminado.');
    }
} catch (e) {
    console.log('⚠️  No se pudo borrar globals.css.');
}

// 4. Escribir el CSS limpio (Versión Tailwind 3)
const cleanCSS = `@tailwind base;
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

fs.writeFileSync(cssPath, cleanCSS, { encoding: 'utf8' });
console.log('✅ globals.css regenerado y desinfectado.');
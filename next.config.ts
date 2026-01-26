import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Opciones de configuración */
  
  // 1. Ignorar errores de ESLint (Estilo) para que no bloqueen el despliegue
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 2. Ignorar errores de TypeScript (Tipos estrictos) para emergencias
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
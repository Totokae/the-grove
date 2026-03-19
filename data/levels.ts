export const WORLD_DATA = {
    'hub': {
      name: 'El Gran Árbol',
      theme: 'tree_hub',
      layout: [
        [0,0,0,1,1,1,0,0,0],
        [0,0,1,1,1,1,1,0,0],
        [0,1,1,1,1,1,1,1,0],
        [1,1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,1,0,0],
        [0,0,0,1,1,1,0,0,0]
      ],
      portals: [
        { x: 3, y: 0, target: '5_basico_numeros', label: 'Ruta 5° Básico' },
        { x: 5, y: 0, target: '2_medio_algebra', label: 'Ruta 2° Medio' }
      ],
      props: [],
      npcs: [{ id: 'profesor', name: 'Prof. Ray Z.', x: 4, y: 3, sprite: 'npc_ray_z', dialogueId: 'welcome-math' }]
    },
    '5_basico_numeros': {
      name: 'Isla de los Números',
      theme: 'forest',
      layout: ROOM_LAYOUT, // Usaremos tu layout actual de 20x20
      portals: [{ x: 0, y: 0, target: 'hub', label: 'Volver al Árbol' }],
      props: [
          { id: 'sheet_1', toolId: 'fraction_visualizer', name: 'Hoja de Fracciones', x: 4, y: 8, sprite: 'sheet' }
      ],
      npcs: []
    }
  };
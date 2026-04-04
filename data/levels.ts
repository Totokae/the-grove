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
      props: [],
      npcs: [{ id: 'profesor', name: 'Prof. Ray Z.', x: 4, y: 3, sprite: 'npc_ray_z', dialogueId: 'welcome-math' }]
    },
    '5_basico_numeros': {
      name: 'Isla de los Números',
      theme: 'forest',
      layout: ROOM_LAYOUT, // Usaremos tu layout actual de 20x20
      props: [
          { id: 'sheet_1', toolId: 'fraction_visualizer', name: 'Hoja de Fracciones', x: 4, y: 8, sprite: 'sheet' }
      ],
      npcs: []
    }
  };
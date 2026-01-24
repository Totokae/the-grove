'use client';


import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Constantes para la vista isométrica
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const GRID_SIZE = 10; // 10x10 baldosas

// Interfaz para datos de jugador
interface PlayerData {
  id: string;
  x: number;
  y: number;
  color?: number; // Color del jugador (hex number)
}

// Interfaz para otros jugadores
interface OtherPlayer {
  sprite: Phaser.GameObjects.Sprite;
  gridX: number;
  gridY: number;
  color: number; // Color actual del jugador
}

// Interfaz para eventos de interacción
interface InteractionEvent {
  type: string;
  id: number;
}

// Coordenadas de la baldosa azul (zona de evento)
const EVENT_TILE = { x: 5, y: 5 };

// Escena principal del juego
class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private playerGridX: number = 0;
  private playerGridY: number = 0;
  private playerColor: number = 0xffffff; // Color por defecto: blanco
  private tiles: Phaser.GameObjects.Polygon[][] = [];
  private supabaseClient!: SupabaseClient;
  private myPlayerId!: string;
  private otherPlayers: Map<string, OtherPlayer> = new Map();
  private channel!: RealtimeChannel;
  private eventZone!: Phaser.GameObjects.Polygon;

  constructor(config?: Phaser.Types.Scenes.SettingsConfig & {
    supabaseClient?: SupabaseClient;
    playerId?: string;
    playerColor?: number;
  }) {
    super({ key: 'MainScene', ...config });
    if (config?.supabaseClient) {
      this.supabaseClient = config.supabaseClient;
    }
    if (config?.playerId) {
      this.myPlayerId = config.playerId;
    }
    if (config?.playerColor !== undefined) {
      this.playerColor = config.playerColor;
    }
  }

  // Precargar recursos
  preload(): void {
    this.load.image('player-sprite', '/avatar.png');
  }

  // Convertir coordenadas de grilla (cartesianas) a coordenadas isométricas (pantalla)
  private gridToIso(gridX: number, gridY: number): { x: number; y: number } {
    const isoX = (gridX - gridY) * (TILE_WIDTH / 2);
    const isoY = (gridX + gridY) * (TILE_HEIGHT / 2);
    return { x: isoX, y: isoY };
  }

  // Convertir coordenadas isométricas (pantalla) a coordenadas de grilla (cartesianas)
  private isoToGrid(isoX: number, isoY: number): { x: number; y: number } {
    const gridX = Math.round((isoX / (TILE_WIDTH / 2) + isoY / (TILE_HEIGHT / 2)) / 2);
    const gridY = Math.round((isoY / (TILE_HEIGHT / 2) - isoX / (TILE_WIDTH / 2)) / 2);
    return { x: gridX, y: gridY };
  }

  // Crear una baldosa isométrica (rombo)
  private createTile(gridX: number, gridY: number): Phaser.GameObjects.Polygon {
    const { x, y } = this.gridToIso(gridX, gridY);
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Crear los 4 puntos del rombo isométrico
    const points: Phaser.Geom.Point[] = [
      new Phaser.Geom.Point(centerX + x, centerY + y - TILE_HEIGHT / 2), // Arriba
      new Phaser.Geom.Point(centerX + x + TILE_WIDTH / 2, centerY + y), // Derecha
      new Phaser.Geom.Point(centerX + x, centerY + y + TILE_HEIGHT / 2), // Abajo
      new Phaser.Geom.Point(centerX + x - TILE_WIDTH / 2, centerY + y), // Izquierda
    ];

    // Determinar el color: azul si es la baldosa de evento, verde si no
    const isEventTile = gridX === EVENT_TILE.x && gridY === EVENT_TILE.y;
    const fillColor = isEventTile ? 0x0000ff : 0x2d5a27; // Azul para evento, verde para normal

    const tile = this.add.polygon(
      centerX + x,
      centerY + y,
      points.map((p) => [p.x - (centerX + x), p.y - (centerY + y)]).flat(),
      fillColor,
      1 // Alpha
    );

    tile.setStrokeStyle(1, 0xffffff, 1); // Borde blanco fino
    tile.setDepth(0); // Profundidad del suelo

    return tile;
  }

  // Dibujar la cuadrícula isométrica
  private drawGrid(): void {
    this.tiles = [];
    const offset = Math.floor(GRID_SIZE / 2);

    for (let x = -offset; x <= offset; x++) {
      this.tiles[x + offset] = [];
      for (let y = -offset; y <= offset; y++) {
        this.tiles[x + offset][y + offset] = this.createTile(x, y);
      }
    }
  }

  // Mover el jugador a una posición de grilla
  private movePlayerToGrid(gridX: number, gridY: number): void {
    // Validar que esté dentro de los límites
    const offset = Math.floor(GRID_SIZE / 2);
    if (
      gridX < -offset ||
      gridX > offset ||
      gridY < -offset ||
      gridY > offset
    ) {
      return;
    }

    const { x, y } = this.gridToIso(gridX, gridY);
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const targetX = centerX + x;
    const targetY = centerY + y;

    // Animar el movimiento con un tween
    this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration: 300,
      ease: 'Power2',
      onUpdate: () => {
        // Actualizar profundidad dinámicamente durante el movimiento
        this.player.setDepth(this.player.y);
      },
      onComplete: () => {
        // Asegurar profundidad final
        this.player.setDepth(this.player.y);

        // Debug: mostrar coordenadas del jugador
        console.log('Jugador en Grid:', this.playerGridX, this.playerGridY);

        // Verificar si el jugador está en la zona de evento
        const targetX = EVENT_TILE.x;
        const targetY = EVENT_TILE.y;
        
        if (this.playerGridX === targetX && this.playerGridY === targetY) {
          // Recuperar la función del registry
          const triggerEvent = this.registry.get('onInteract') as ((event: InteractionEvent) => void) | undefined;
          
          if (triggerEvent) {
            triggerEvent({
              type: 'math-challenge',
              id: 1,
            });
          } else {
            console.warn('onInteract no está disponible en el registry');
          }
        }
      },
    });

    this.playerGridX = gridX;
    this.playerGridY = gridY;

    // Emitir el movimiento a otros jugadores (incluyendo el color)
    this.channel.send({
      type: 'broadcast',
      event: 'player-move',
      payload: {
        id: this.myPlayerId,
        x: gridX,
        y: gridY,
        color: this.playerColor,
      } as PlayerData,
    });
  }

  // Manejar movimiento de otros jugadores
  private handleOtherPlayerMove(data: PlayerData): void {
    // Ignorar si es mi propio movimiento
    if (data.id === this.myPlayerId) {
      return;
    }

    const { x: gridX, y: gridY, color } = data;
    const playerColor = color || 0xff0000; // Color por defecto rojo si no viene
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    const { x: isoX, y: isoY } = this.gridToIso(gridX, gridY);
    const targetX = centerX + isoX;
    const targetY = centerY + isoY;

    // Verificar si el jugador ya existe
    const existingPlayer = this.otherPlayers.get(data.id);

    if (existingPlayer) {
      // Mover el jugador existente con tween
      this.tweens.add({
        targets: existingPlayer.sprite,
        x: targetX,
        y: targetY,
        duration: 300,
        ease: 'Power2',
        onUpdate: () => {
          // Actualizar profundidad dinámicamente durante el movimiento
          existingPlayer.sprite.setDepth(existingPlayer.sprite.y);
        },
        onComplete: () => {
          // Asegurar profundidad final
          existingPlayer.sprite.setDepth(existingPlayer.sprite.y);
        },
      });
      existingPlayer.gridX = gridX;
      existingPlayer.gridY = gridY;
      
      // Verificar si el color cambió y actualizarlo
      if (existingPlayer.color !== playerColor) {
        existingPlayer.sprite.setTint(playerColor);
        existingPlayer.color = playerColor;
      }
    } else {
      // Crear un nuevo jugador con el color recibido
      const newPlayerSprite = this.add.sprite(
        targetX,
        targetY,
        'player-sprite'
      );
      newPlayerSprite.setTint(playerColor); // Aplicar el color recibido
      newPlayerSprite.setOrigin(0.5, 1); // Ajustar anchor para que los pies pisen el centro
      newPlayerSprite.setDepth(targetY); // Profundidad basada en posición Y

      this.otherPlayers.set(data.id, {
        sprite: newPlayerSprite,
        gridX,
        gridY,
        color: playerColor,
      });
    }
  }

  // Eliminar un jugador remoto
  private removeOtherPlayer(playerId: string): void {
    const player = this.otherPlayers.get(playerId);
    if (player) {
      player.sprite.destroy();
      this.otherPlayers.delete(playerId);
    }
  }

  // Suscribirse al canal de Supabase Realtime
  private setupRealtime(): void {
    if (!this.supabaseClient || !this.myPlayerId) {
      console.error('Supabase client o player ID no están inicializados');
      return;
    }

    this.channel = this.supabaseClient.channel('the-grove-global', {
      config: {
        presence: {
          key: this.myPlayerId,
        },
      },
    });

    // Escuchar eventos de movimiento de jugadores
    this.channel.on(
      'broadcast',
      { event: 'player-move' },
      (payload: { payload: PlayerData }) => {
        this.handleOtherPlayerMove(payload.payload);
      }
    );

    // Escuchar eventos de presencia (desconexiones)
    this.channel.on('presence', { event: 'leave' }, (payload: { key: string }) => {
      if (payload && payload.key) {
        this.removeOtherPlayer(payload.key);
      }
    });

    // También escuchar cambios de presencia de forma más general
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel.presenceState();
      const currentPlayerIds = new Set<string>();
      
      // Obtener todos los IDs de jugadores presentes
      Object.keys(state).forEach((key) => {
        if (key !== this.myPlayerId) {
          currentPlayerIds.add(key);
        }
      });

      // Eliminar jugadores que ya no están presentes
      this.otherPlayers.forEach((_, playerId) => {
        if (!currentPlayerIds.has(playerId)) {
          this.removeOtherPlayer(playerId);
        }
      });
    });

    // Suscribirse al canal con presencia
    this.channel
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('Jugador conectado:', key);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('Jugador desconectado:', key);
        this.removeOtherPlayer(key);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('Conectado al canal the-grove-global');
          // Enviar presencia inicial
          await this.channel.track({
            id: this.myPlayerId,
            x: 0,
            y: 0,
            color: this.playerColor,
          });
          
          // Emitir el color inicial al conectarse
          this.channel.send({
            type: 'broadcast',
            event: 'player-move',
            payload: {
              id: this.myPlayerId,
              x: 0,
              y: 0,
              color: this.playerColor,
            } as PlayerData,
          });
        }
      });
  }


  create(): void {
    // Establecer color de fondo verde bosque oscuro
    this.cameras.main.setBackgroundColor('#2d5a27');

    // Dibujar la cuadrícula isométrica (la baldosa azul se crea automáticamente en drawGrid)
    this.drawGrid();

    // Recuperar la función onInteract del registry
    const triggerEvent = this.registry.get('onInteract') as ((event: InteractionEvent) => void) | undefined;
    if (triggerEvent) {
      console.log('Función onInteract recuperada del registry');
    } else {
      console.warn('onInteract no encontrada en el registry');
    }

    // Crear el jugador con sprite
    const { x: playerX, y: playerY } = this.gridToIso(0, 0);
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.player = this.add.sprite(
      centerX + playerX,
      centerY + playerY,
      'player-sprite'
    );
    this.player.setOrigin(0.5, 1); // Ajustar anchor para que los pies pisen el centro de la baldosa
    this.player.setDepth(centerY + playerY); // Profundidad basada en posición Y (crítico para isométrico)
    this.player.setTint(this.playerColor); // Aplicar el color inicial

    // Exponer función changeMyColor en el registry
    this.registry.set('changeMyColor', (newColor: number) => {
      this.changeMyColor(newColor);
    });

    // Configurar Supabase Realtime
    this.setupRealtime();

    // Manejar clics en la pantalla
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Convertir coordenadas de pantalla a coordenadas relativas al centro
      const relativeX = pointer.x - centerX;
      const relativeY = pointer.y - centerY;

      // Convertir a coordenadas de grilla
      const { x: gridX, y: gridY } = this.isoToGrid(relativeX, relativeY);

      // Mover el jugador
      this.movePlayerToGrid(gridX, gridY);
    });
  }

  // Cambiar el color del jugador local
  private changeMyColor(newColor: number): void {
    this.playerColor = newColor;
    this.player.setTint(newColor);
    
    // Emitir evento de cambio de color a otros jugadores
    // Enviar un evento especial o incluir el color en el próximo movimiento
    // Por ahora, enviaremos un evento de actualización de color
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'player-move',
        payload: {
          id: this.myPlayerId,
          x: this.playerGridX,
          y: this.playerGridY,
          color: this.playerColor,
        } as PlayerData,
      });
    }
  }

  // Actualizar profundidad dinámicamente en cada frame
  update(): void {
    // Actualizar profundidad del jugador local basada en su posición Y
    this.player.setDepth(this.player.y);

    // Actualizar profundidad de todos los jugadores remotos
    this.otherPlayers.forEach((otherPlayer) => {
      otherPlayer.sprite.setDepth(otherPlayer.sprite.y);
    });
  }

  // Limpiar cuando la escena se cierra
  shutdown(): void {
    // Desuscribirse del canal
    if (this.channel) {
      this.channel.unsubscribe();
    }
    // Limpiar jugadores remotos
    this.otherPlayers.forEach((player) => {
      player.sprite.destroy();
    });
    this.otherPlayers.clear();
  }
}

interface GameCanvasProps {
  onInteract?: (event: InteractionEvent) => void;
  playerColor?: number;
}

export default function GameCanvas({ onInteract, playerColor = 0xffffff }: GameCanvasProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const supabaseClientRef = useRef<SupabaseClient | null>(null);
  const playerIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Solo ejecutar en el navegador
    if (typeof window === 'undefined') {
      return;
    }

    // Crear cliente de Supabase usando variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        'Error: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar configuradas'
      );
      return;
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    supabaseClientRef.current = supabaseClient;

    // Generar ID aleatorio para el jugador
    const playerId = `player-${Math.random().toString(36).substring(2, 15)}`;
    playerIdRef.current = playerId;

    // Configuración del juego Phaser
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: containerRef.current || undefined,
      scene: new MainScene({
        key: 'MainScene',
        supabaseClient,
        playerId,
        playerColor: playerColor || 0xffffff,
      }),
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
    };

    // Inicializar el juego con datos de Supabase
    gameRef.current = new Phaser.Game(config);

    // Guardar la función onInteract en el registry del juego
    if (gameRef.current && onInteract) {
      gameRef.current.registry.set('onInteract', onInteract);
    }

    // Exponer función changeMyColor vía registry después de que la escena esté lista
    // Esperar un frame para asegurar que la escena esté inicializada
    setTimeout(() => {
      if (gameRef.current) {
        const scene = gameRef.current.scene.getScene('MainScene') as MainScene;
        if (scene) {
          // La función ya está expuesta en create(), solo necesitamos asegurarnos de que esté disponible
          // Podemos acceder a ella desde React usando gameRef.current.registry.get('changeMyColor')
        }
      }
    }, 100);

    // Limpiar cuando el componente se desmonte
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      if (supabaseClientRef.current) {
        // Cerrar conexiones de Supabase si es necesario
        supabaseClientRef.current.removeAllChannels();
      }
    };
  }, [onInteract]);

  // Actualizar el registry cuando onInteract cambie
  useEffect(() => {
    if (gameRef.current && onInteract) {
      gameRef.current.registry.set('onInteract', onInteract);
    }
  }, [onInteract]);

  // Actualizar el color del jugador cuando playerColor cambie
  useEffect(() => {
    if (gameRef.current) {
      const changeMyColor = gameRef.current.registry.get('changeMyColor') as ((color: number) => void) | undefined;
      if (changeMyColor && playerColor !== undefined) {
        changeMyColor(playerColor);
      }
    }
  }, [playerColor]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
    />
  );
}


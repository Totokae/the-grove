'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

// --- CONSTANTES Y TIPOS ---
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const GRID_SIZE = 10;

interface PlayerData {
  id: string;
  x: number;
  y: number;
  color?: number;
}

interface OtherPlayer {
  sprite: Phaser.GameObjects.Sprite;
  gridX: number;
  gridY: number;
  color: number;
}

interface InteractionEvent {
  type: string;
  id: number;
}

interface ChatData {
  type: 'chat';
  message: string;
  id: string;
}

const EVENT_TILE = { x: 5, y: 5 };

// --- ESCENA PRINCIPAL ---
class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private playerGridX: number = 0;
  private playerGridY: number = 0;
  private playerColor: number = 0xffffff;
  private tiles: Phaser.GameObjects.Polygon[][] = [];
  private supabaseClient!: SupabaseClient;
  private myPlayerId!: string;
  private otherPlayers: Map<string, OtherPlayer> = new Map();
  private channel!: RealtimeChannel;
  private chatBubbles: Map<string, Phaser.GameObjects.Container> = new Map();
  
  // Referencia al listener para poder borrarlo después
  private chatListener: ((e: any) => void) | null = null;

  constructor(config?: Phaser.Types.Scenes.SettingsConfig & {
    supabaseClient?: SupabaseClient;
    playerId?: string;
    playerColor?: number;
  }) {
    super({ key: 'MainScene', ...config });
    if (config?.supabaseClient) this.supabaseClient = config.supabaseClient;
    if (config?.playerId) this.myPlayerId = config.playerId;
    if (config?.playerColor !== undefined) this.playerColor = config.playerColor;
  }

  preload(): void {
    this.load.image('player-sprite', '/avatar.png');
    this.load.image('grass', '/grass.png'); // <--- NUEVO: Cargamos el pasto
  }

  // --- MATEMÁTICAS ISOMÉTRICAS ---
  private gridToIso(gridX: number, gridY: number): { x: number; y: number } {
    const isoX = (gridX - gridY) * (TILE_WIDTH / 2);
    const isoY = (gridX + gridY) * (TILE_HEIGHT / 2);
    return { x: isoX, y: isoY };
  }

  private isoToGrid(isoX: number, isoY: number): { x: number; y: number } {
    const gridX = Math.round((isoX / (TILE_WIDTH / 2) + isoY / (TILE_HEIGHT / 2)) / 2);
    const gridY = Math.round((isoY / (TILE_HEIGHT / 2) - isoX / (TILE_WIDTH / 2)) / 2);
    return { x: gridX, y: gridY };
  }

  // --- CREACIÓN DEL MUNDO ---
  create(): void {
    // 1. Crear un TileSprite que cubra toda la pantalla (Fondo infinito)
  const width = this.cameras.main.width;
  const height = this.cameras.main.height;

// TileSprite repite la textura 'grass'
  const bg = this.add.tileSprite(0, 0, width, height, 'grass');
  bg.setOrigin(0, 0);
  bg.setScrollFactor(0); // Para que se quede fijo si la cámara se mueve (opcional)
  bg.setDepth(-100); // Al fondo de todo, detrás de la grilla
    this.drawGrid();

    // Crear Jugador Local
    const { x: playerX, y: playerY } = this.gridToIso(0, 0);
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.player = this.add.sprite(centerX + playerX, centerY + playerY, 'player-sprite');
    this.player.setOrigin(0.5, 1);
    this.player.setDepth(centerY + playerY);
    this.player.setTint(this.playerColor);

    // --- CONEXIÓN REACT -> PHASER (CHAT) ---
    // Escuchar el evento global que enviamos desde page.tsx
    this.chatListener = (e: any) => {
        const msg = e.detail;
        this.sendChat(msg);
    };
    window.addEventListener('PHASER_CHAT_EVENT', this.chatListener);
    // ---------------------------------------

    // Configurar Supabase
    this.setupRealtime();

    // Input
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const relativeX = pointer.x - centerX;
      const relativeY = pointer.y - centerY;
      const { x: gridX, y: gridY } = this.isoToGrid(relativeX, relativeY);
      this.movePlayerToGrid(gridX, gridY);
    });
  }

  // --- LÓGICA DE JUEGO ---
  private drawGrid(): void {
    const offset = Math.floor(GRID_SIZE / 2);
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    for (let x = -offset; x <= offset; x++) {
      for (let y = -offset; y <= offset; y++) {
        const iso = this.gridToIso(x, y);
        const points = [
          new Phaser.Geom.Point(centerX + iso.x, centerY + iso.y - TILE_HEIGHT / 2),
          new Phaser.Geom.Point(centerX + iso.x + TILE_WIDTH / 2, centerY + iso.y),
          new Phaser.Geom.Point(centerX + iso.x, centerY + iso.y + TILE_HEIGHT / 2),
          new Phaser.Geom.Point(centerX + iso.x - TILE_WIDTH / 2, centerY + iso.y),
        ];
        
        const isEvent = x === EVENT_TILE.x && y === EVENT_TILE.y;
        const color = isEvent ? 0x0000ff : 0x2d5a27;
        
        const tile = this.add.polygon(centerX + iso.x, centerY + iso.y, points.map(p => [p.x - (centerX + iso.x), p.y - (centerY + iso.y)]).flat(), color);
        tile.setStrokeStyle(1, 0xffffff, 0.5);
        tile.setDepth(0);
      }
    }
  }

  private movePlayerToGrid(gridX: number, gridY: number): void {
    const offset = Math.floor(GRID_SIZE / 2);
    if (gridX < -offset || gridX > offset || gridY < -offset || gridY > offset) return;

    const { x, y } = this.gridToIso(gridX, gridY);
    const targetX = this.cameras.main.width / 2 + x;
    const targetY = this.cameras.main.height / 2 + y;

    this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration: 300,
      ease: 'Power2',
      onUpdate: () => this.player.setDepth(this.player.y),
      onComplete: () => {
        this.player.setDepth(this.player.y);
        // Lógica de evento
        if (gridX === EVENT_TILE.x && gridY === EVENT_TILE.y) {
          const triggerEvent = this.registry.get('onInteract');
          if (triggerEvent) triggerEvent({ type: 'math-challenge', id: 1 });
        }
      },
    });

    this.playerGridX = gridX;
    this.playerGridY = gridY;

    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'player-move',
        payload: { id: this.myPlayerId, x: gridX, y: gridY, color: this.playerColor } as PlayerData,
      });
    }
  }

  private handleOtherPlayerMove(data: PlayerData): void {
    if (data.id === this.myPlayerId) return;

    const { x: gridX, y: gridY, color } = data;
    const { x: isoX, y: isoY } = this.gridToIso(gridX, gridY);
    const targetX = this.cameras.main.width / 2 + isoX;
    const targetY = this.cameras.main.height / 2 + isoY;
    
    let other = this.otherPlayers.get(data.id);
    if (other) {
      this.tweens.add({
        targets: other.sprite,
        x: targetX,
        y: targetY,
        duration: 300,
        ease: 'Power2',
        onUpdate: () => other!.sprite.setDepth(other!.sprite.y),
      });
      if (color && other.color !== color) {
        other.sprite.setTint(color);
        other.color = color;
      }
    } else {
      const sprite = this.add.sprite(targetX, targetY, 'player-sprite');
      sprite.setOrigin(0.5, 1);
      sprite.setTint(color || 0xff0000);
      sprite.setDepth(targetY);
      this.otherPlayers.set(data.id, { sprite, gridX, gridY, color: color || 0xff0000 });
    }
  }

  // --- LÓGICA DE CHAT ---
  private sendChat(message: string): void {
    if (!message.trim()) return;

    // 1. Mostrar localmente
    this.createChatBubble(this.player, message.trim(), this.myPlayerId);

    // 2. Enviar a Supabase
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'chat',
        payload: { type: 'chat', message: message.trim(), id: this.myPlayerId } as ChatData,
      });
    }
  }

  private handleChatMessage(data: ChatData): void {
    const { id, message } = data;
    let targetSprite: Phaser.GameObjects.Sprite | null = null;

    if (id === this.myPlayerId) targetSprite = this.player;
    else targetSprite = this.otherPlayers.get(id)?.sprite || null;

    if (targetSprite) {
      this.createChatBubble(targetSprite, message, id);
    }
  }

  private createChatBubble(sprite: Phaser.GameObjects.Sprite, message: string, playerId: string): void {
    // Limpiar anterior
    const old = this.chatBubbles.get(playerId);
    if (old) { old.destroy(); this.chatBubbles.delete(playerId); }

    const bubble = this.add.container(sprite.x, sprite.y - 60);
    
    // Fondo
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.9);
    bg.fillRoundedRect(-60, -15, 120, 30, 8);
    bg.lineStyle(2, 0x000000, 0.2);
    bg.strokeRoundedRect(-60, -15, 120, 30, 8);

    // Texto
    const text = this.add.text(0, 0, message, {
      fontSize: '14px',
      color: '#000000',
      fontFamily: 'Arial',
      align: 'center',
    }).setOrigin(0.5);

    bubble.add([bg, text]);
    bubble.setDepth(9999); // Siempre visible
    this.chatBubbles.set(playerId, bubble);

    // Animación
    this.tweens.add({
      targets: bubble,
      y: sprite.y - 100,
      alpha: 0,
      duration: 3000,
      ease: 'Power2',
      onComplete: () => {
        bubble.destroy();
        this.chatBubbles.delete(playerId);
      }
    });
  }

  // --- SUPABASE SETUP ---
  private setupRealtime(): void {
    this.channel = this.supabaseClient.channel('the-grove-global', {
      config: { presence: { key: this.myPlayerId } },
    });

    this.channel
      .on('broadcast', { event: 'player-move' }, (payload) => this.handleOtherPlayerMove(payload.payload))
      .on('broadcast', { event: 'chat' }, (payload) => this.handleChatMessage(payload.payload))
      .on('presence', { event: 'sync' }, () => {
          const state = this.channel.presenceState();
          const presentIds = new Set(Object.keys(state));
          // Limpiar jugadores desconectados que no sean yo
          this.otherPlayers.forEach((_, id) => {
              if (!presentIds.has(id) && id !== this.myPlayerId) {
                  this.otherPlayers.get(id)?.sprite.destroy();
                  this.otherPlayers.delete(id);
              }
          });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.channel.track({ id: this.myPlayerId, x: 0, y: 0, color: this.playerColor });
          // Anunciar entrada
          this.channel.send({
             type: 'broadcast', 
             event: 'player-move', 
             payload: { id: this.myPlayerId, x: 0, y: 0, color: this.playerColor } 
          });
        }
      });
  }

  update(): void {
    this.player.setDepth(this.player.y);
    this.otherPlayers.forEach(p => p.sprite.setDepth(p.sprite.y));
    
    // Burbujas siguen al jugador
    this.chatBubbles.forEach((bubble, id) => {
        const target = (id === this.myPlayerId) ? this.player : this.otherPlayers.get(id)?.sprite;
        if (target) {
            bubble.x = target.x;
            // No actualizamos Y constantemente para dejar que el tween haga su trabajo de flotar
        } else {
            bubble.destroy();
            this.chatBubbles.delete(id);
        }
    });
  }

  shutdown(): void {
    if (this.channel) this.channel.unsubscribe();
    if (this.chatListener) window.removeEventListener('PHASER_CHAT_EVENT', this.chatListener);
    this.otherPlayers.clear();
    this.chatBubbles.clear();
  }
}

// --- COMPONENTE REACT WRAPPER ---
interface GameCanvasProps {
  onInteract?: (event: InteractionEvent) => void;
  playerColor?: number;
}

export default function GameCanvas({ onInteract, playerColor = 0xffffff }: GameCanvasProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return;

    const client = createClient(supabaseUrl, supabaseAnonKey);
    const playerId = `player-${Math.random().toString(36).substring(2, 9)}`;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: containerRef.current || undefined,
      scene: new MainScene({
        key: 'MainScene',
        supabaseClient: client,
        playerId,
        playerColor,
      }),
      physics: { default: 'arcade', arcade: { debug: false } },
      backgroundColor: '#2d5a27',
    };

    gameRef.current = new Phaser.Game(config);
    if (onInteract) gameRef.current.registry.set('onInteract', onInteract);

    return () => {
      gameRef.current?.destroy(true);
    };
  }, []);

  // Sync de props
  useEffect(() => {
    if (gameRef.current && onInteract) {
      gameRef.current.registry.set('onInteract', onInteract);
    }
  }, [onInteract]);

  useEffect(() => {
    if (gameRef.current) {
        // Acceder a la escena para cambiar color directamente es complejo desde fuera, 
        // pero podemos usar el registro o un evento si hiciera falta. 
        // Por simplicidad, el color se actualiza al moverse en este código.
        const scene = gameRef.current.scene.getScene('MainScene') as any;
        if (scene && scene.changeMyColor) {
             // Esta lógica requiere que expongas changeMyColor en la clase, 
             // pero para simplificar, el update ocurrirá en el próximo movimiento o reload.
             // Para cambio instantáneo requeriría refactor mayor, pero funcionará al moverte.
             scene.playerColor = playerColor;
             scene.player.setTint(playerColor);
             scene.changeMyColor(playerColor); // Si existe
        }
    }
  }, [playerColor]);

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />;
}
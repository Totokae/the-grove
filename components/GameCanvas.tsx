'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

// --- CONSTANTES ---
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const GRID_SIZE = 10; // 10x10
const EVENT_TILE = { x: 5, y: 5 };

// --- TIPOS ---
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

// --- ESCENA PRINCIPAL ---
class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private playerGridX: number = 0;
  private playerGridY: number = 0;
  private playerColor: number = 0xffffff;
  private supabaseClient!: SupabaseClient;
  private myPlayerId!: string;
  private otherPlayers: Map<string, OtherPlayer> = new Map();
  private channel!: RealtimeChannel;
  private chatBubbles: Map<string, Phaser.GameObjects.Container> = new Map();
  
  // Gráficos
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private highlightGraphics!: Phaser.GameObjects.Graphics;
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
    this.load.image('grass', '/grass.png'); 
    this.load.image('tree', '/tree.png');
  }

  // --- MATEMÁTICAS ISOMÉTRICAS ---
  // Convierte coordenadas de grilla (Lógica) a Píxeles (Pantalla)
  private gridToIso(gridX: number, gridY: number): { x: number; y: number } {
    const isoX = (gridX - gridY) * (TILE_WIDTH / 2);
    const isoY = (gridX + gridY) * (TILE_HEIGHT / 2);
    return { x: isoX, y: isoY };
  }

  // Convierte Píxeles (Mouse) a Grilla (Lógica)
  private isoToGrid(isoX: number, isoY: number): { x: number; y: number } {
    const gridX = Math.round((isoX / (TILE_WIDTH / 2) + isoY / (TILE_HEIGHT / 2)) / 2);
    const gridY = Math.round((isoY / (TILE_HEIGHT / 2) - isoX / (TILE_WIDTH / 2)) / 2);
    return { x: gridX, y: gridY };
  }

  create(): void {
    // 1. CONFIGURACIÓN DE CÁMARA
    // Centramos el mundo en (0,0). Esto simplifica todas las matemáticas.
    this.cameras.main.centerOn(0, 0);

    // 2. FONDO INFINITO
    // Usamos un TileSprite gigante centrado en 0,0
    const bg = this.add.tileSprite(0, 0, 4000, 4000, 'grass');
    bg.setOrigin(0.5, 0.5); // Importante: Origen al centro
    bg.setDepth(-2000); 
    bg.setTint(0xcccccc);

    // 3. INICIALIZAR GRÁFICOS
    this.gridGraphics = this.add.graphics();
    this.highlightGraphics = this.add.graphics();
    this.highlightGraphics.setDepth(1); // El cursor amarillo va encima de la grilla

    // 4. DIBUJAR GRILLA (Lógica Matemática Pura)
    this.drawGrid();

    // 5. ÁRBOL (En 5,5)
    const { x: treeX, y: treeY } = this.gridToIso(EVENT_TILE.x, EVENT_TILE.y);
    const tree = this.add.sprite(treeX, treeY, 'tree');
    tree.setOrigin(0.5, 0.9);
    tree.setDepth(treeY + 10);

    // 6. JUGADOR LOCAL
    const { x: playerX, y: playerY } = this.gridToIso(0, 0);
    this.player = this.add.sprite(playerX, playerY, 'player-sprite');
    this.player.setOrigin(0.5, 1);
    this.player.setDepth(playerY);
    this.player.setTint(this.playerColor);

    // 7. INPUT (Clics)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Phaser ajusta pointer.worldX automáticamente basándose en la cámara
      const { x: gridX, y: gridY } = this.isoToGrid(pointer.worldX, pointer.worldY);
      
      console.log(`Clic en World: ${pointer.worldX}, ${pointer.worldY} -> Grid: ${gridX}, ${gridY}`);
      
      this.movePlayerToGrid(gridX, gridY);
    });

    // Eventos Globales (Chat)
    this.chatListener = (e: any) => {
        const msg = e.detail;
        this.sendChat(msg);
    };
    window.addEventListener('PHASER_CHAT_EVENT', this.chatListener);

    this.setupRealtime();
    
    // Manejar redimensionamiento
    this.scale.on('resize', this.resize, this);
  }

  resize(gameSize: Phaser.Structs.Size): void {
      this.cameras.main.centerOn(0, 0);
  }

  update(): void {
    // Profundidad dinámica (Z-index)
    this.player.setDepth(this.player.y);
    this.otherPlayers.forEach(p => p.sprite.setDepth(p.sprite.y));
    
    this.chatBubbles.forEach((bubble, id) => {
        const target = (id === this.myPlayerId) ? this.player : this.otherPlayers.get(id)?.sprite;
        if (target) bubble.x = target.x;
        else { bubble.destroy(); this.chatBubbles.delete(id); }
    });

    // --- LÓGICA DEL HIGHLIGHT (Cursor Amarillo) ---
    const pointer = this.input.activePointer;
    const { x: gx, y: gy } = this.isoToGrid(pointer.worldX, pointer.worldY);

    this.highlightGraphics.clear();

    const offset = Math.floor(GRID_SIZE / 2);
    // Solo dibujar si estamos dentro de los límites
    if (gx >= -offset && gx <= offset && gy >= -offset && gy <= offset) {
        const iso = this.gridToIso(gx, gy);
        
        // Puntos del rombo relativos al centro de la baldosa
        const points = [
            { x: iso.x, y: iso.y - TILE_HEIGHT / 2 },
            { x: iso.x + TILE_WIDTH / 2, y: iso.y },
            { x: iso.x, y: iso.y + TILE_HEIGHT / 2 },
            { x: iso.x - TILE_WIDTH / 2, y: iso.y }
        ];
        
        this.highlightGraphics.lineStyle(3, 0xffff00, 1); // Amarillo, grosor 3
        this.highlightGraphics.strokePoints(points, true, true);
    }
  }

  // --- DIBUJO DE GRILLA (Método Graphics) ---
  private drawGrid(): void {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0xffffff, 0.3); // Línea blanca fina

    const offset = Math.floor(GRID_SIZE / 2);
    
    // Dibujamos cada baldosa usando la misma fórmula que el input
    for (let x = -offset; x <= offset; x++) {
      for (let y = -offset; y <= offset; y++) {
        const iso = this.gridToIso(x, y);
        
        const points = [
          { x: iso.x, y: iso.y - TILE_HEIGHT / 2 },
          { x: iso.x + TILE_WIDTH / 2, y: iso.y },
          { x: iso.x, y: iso.y + TILE_HEIGHT / 2 },
          { x: iso.x - TILE_WIDTH / 2, y: iso.y },
        ];
        
        this.gridGraphics.strokePoints(points, true, true);
      }
    }
    
    // Dibujar la "Baldosa de Evento" (Azul) usando relleno
    const { x: ex, y: ey } = this.gridToIso(EVENT_TILE.x, EVENT_TILE.y);
    const eventPoints = [
        { x: ex, y: ey - TILE_HEIGHT / 2 },
        { x: ex + TILE_WIDTH / 2, y: ey },
        { x: ex, y: ey + TILE_HEIGHT / 2 },
        { x: ex - TILE_WIDTH / 2, y: ey },
    ];
    this.gridGraphics.fillStyle(0x0000ff, 0.5); // Azul semitransparente
    this.gridGraphics.fillPoints(eventPoints, true, true);
  }

  // --- MOVIMIENTO ---
  private movePlayerToGrid(gridX: number, gridY: number): void {
    const offset = Math.floor(GRID_SIZE / 2);
    // Validación estricta de límites
    if (gridX < -offset || gridX > offset || gridY < -offset || gridY > offset) return;

    const { x, y } = this.gridToIso(gridX, gridY);

    this.tweens.add({
      targets: this.player,
      x: x,
      y: y,
      duration: 300,
      ease: 'Power2',
      onUpdate: () => this.player.setDepth(this.player.y),
      onComplete: () => {
        this.player.setDepth(this.player.y);
        // Interacción
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

  // --- RED (Igual que antes) ---
  private handleOtherPlayerMove(data: PlayerData): void {
    if (data.id === this.myPlayerId) return;
    const { x: gridX, y: gridY, color } = data;
    const { x, y } = this.gridToIso(gridX, gridY);
    
    let other = this.otherPlayers.get(data.id);
    if (other) {
      this.tweens.add({
        targets: other.sprite,
        x: x, y: y, duration: 300, ease: 'Power2',
        onUpdate: () => other!.sprite.setDepth(other!.sprite.y),
      });
      if (color && other.color !== color) {
        other.sprite.setTint(color); other.color = color;
      }
    } else {
      const sprite = this.add.sprite(x, y, 'player-sprite');
      sprite.setOrigin(0.5, 1);
      sprite.setTint(color || 0xff0000);
      sprite.setDepth(y);
      this.otherPlayers.set(data.id, { sprite, gridX, gridY, color: color || 0xff0000 });
    }
  }

  private sendChat(message: string): void {
    if (!message.trim()) return;
    this.createChatBubble(this.player, message.trim(), this.myPlayerId);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast', event: 'chat',
        payload: { type: 'chat', message: message.trim(), id: this.myPlayerId } as ChatData,
      });
    }
  }

  private handleChatMessage(data: ChatData): void {
    const { id, message } = data;
    let targetSprite = (id === this.myPlayerId) ? this.player : (this.otherPlayers.get(id)?.sprite || null);
    if (targetSprite) this.createChatBubble(targetSprite, message, id);
  }

  private createChatBubble(sprite: Phaser.GameObjects.Sprite, message: string, playerId: string): void {
    const old = this.chatBubbles.get(playerId);
    if (old) { old.destroy(); this.chatBubbles.delete(playerId); }

    const bubble = this.add.container(sprite.x, sprite.y - 60);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.9);
    bg.fillRoundedRect(-60, -15, 120, 30, 8);
    bg.lineStyle(2, 0x000000, 0.2);
    bg.strokeRoundedRect(-60, -15, 120, 30, 8);
    const text = this.add.text(0, 0, message, { fontSize: '14px', color: '#000000', fontFamily: 'Arial', align: 'center' }).setOrigin(0.5);

    bubble.add([bg, text]);
    bubble.setDepth(9999); 
    this.chatBubbles.set(playerId, bubble);

    this.tweens.add({
      targets: bubble, y: sprite.y - 100, alpha: 0, duration: 3000, ease: 'Power2',
      onComplete: () => { bubble.destroy(); this.chatBubbles.delete(playerId); }
    });
  }

  private setupRealtime(): void {
    this.channel = this.supabaseClient.channel('the-grove-global', { config: { presence: { key: this.myPlayerId } } });
    this.channel
      .on('broadcast', { event: 'player-move' }, (payload) => this.handleOtherPlayerMove(payload.payload))
      .on('broadcast', { event: 'chat' }, (payload) => this.handleChatMessage(payload.payload))
      .on('presence', { event: 'sync' }, () => {
          const state = this.channel.presenceState();
          const presentIds = new Set(Object.keys(state));
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
          this.channel.send({ type: 'broadcast', event: 'player-move', payload: { id: this.myPlayerId, x: 0, y: 0, color: this.playerColor } });
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

// --- COMPONENTE REACT ---
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
      scene: new MainScene({ key: 'MainScene', supabaseClient: client, playerId, playerColor }),
      physics: { default: 'arcade', arcade: { debug: false } },
      backgroundColor: '#2d5a27',
      scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    gameRef.current = new Phaser.Game(config);
    if (onInteract) gameRef.current.registry.set('onInteract', onInteract);

    return () => { gameRef.current?.destroy(true); };
  }, []);

  useEffect(() => {
    if (gameRef.current && onInteract) gameRef.current.registry.set('onInteract', onInteract);
  }, [onInteract]);

  useEffect(() => {
    if (gameRef.current) {
        const scene = gameRef.current.scene.getScene('MainScene') as any;
        if (scene && scene.player) {
             scene.playerColor = playerColor;
             scene.player.setTint(playerColor);
             scene.channel?.send({ type: 'broadcast', event: 'player-move', payload: { id: scene.myPlayerId, x: scene.playerGridX, y: scene.playerGridY, color: playerColor } });
        }
    }
  }, [playerColor]);

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />;
}
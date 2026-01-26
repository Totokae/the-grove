'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

// --- CONSTANTES ---
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const GRID_SIZE = 10; 
const EVENT_TILE = { x: 5, y: 5 }; 

// --- COLORES POR ZONA (Tintes Hexadecimales) ---
const ZONE_TINTS: Record<string, number> = {
  'Números': 0xcccccc,      // Gris/Verde neutro (Original)
  'Álgebra': 0xd4e157,      // Amarillo Verdoso (Cálido)
  'Geometría': 0x4db6ac,    // Verde Azulado (Frío/Tecnológico)
  'Datos y Azar': 0x81c784  // Verde Hoja Intenso
};

// --- TIPOS ---
interface PlayerData {
  id: string;
  x: number;
  y: number;
  color?: number;
}
interface OtherPlayer {
  body: Phaser.GameObjects.Sprite; 
  face: Phaser.GameObjects.Sprite; 
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
  private player!: Phaser.Physics.Arcade.Sprite; 
  private playerFace!: Phaser.GameObjects.Sprite; 
  private pet!: Phaser.Physics.Arcade.Sprite;
  
  // <--- NUEVO: Guardamos el fondo para poder cambiarle el color
  private background!: Phaser.GameObjects.TileSprite;

  private playerGridX: number = 0;
  private playerGridY: number = 0;
  private playerColor: number = 0xffffff;
  
  private obstacles: Set<string> = new Set(); 

  private supabaseClient!: SupabaseClient;
  private myPlayerId!: string;
  private otherPlayers: Map<string, OtherPlayer> = new Map();
  private channel!: RealtimeChannel;
  private chatBubbles: Map<string, Phaser.GameObjects.Container> = new Map();
  
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
    this.load.image('korok-body', '/korok-body-1.png'); 
    this.load.image('korok-face', '/korok-face-1.png');
    this.load.image('pet-seed', '/spirit-seed.png'); 
    this.load.image('grass', '/grass.png'); 
    this.load.image('tree', '/tree.png');
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

  create(): void {
    this.cameras.main.centerOn(0, 0);

    // <--- NUEVO: Asignamos a this.background
    this.background = this.add.tileSprite(0, 0, 4000, 4000, 'grass');
    this.background.setOrigin(0.5, 0.5);
    this.background.setDepth(-2000); 
    this.background.setTint(0xcccccc); // Color inicial

    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(-1000);
    
    this.highlightGraphics = this.add.graphics();
    this.highlightGraphics.setDepth(-900);

    this.drawGrid();

    const { x: treeX, y: treeY } = this.gridToIso(EVENT_TILE.x, EVENT_TILE.y);
    const tree = this.add.sprite(treeX, treeY, 'tree');
    tree.setOrigin(0.5, 0.9);
    tree.setDepth(treeY + 10);
    
    this.obstacles.add(`${EVENT_TILE.x},${EVENT_TILE.y}`);

    const { x: playerX, y: playerY } = this.gridToIso(0, 0);
    
    this.player = this.physics.add.sprite(playerX, playerY, 'korok-body'); 
    this.player.setOrigin(0.5, 1);
    this.player.setDepth(playerY);
    this.player.setTint(this.playerColor); 

    this.playerFace = this.add.sprite(playerX, playerY, 'korok-face');
    this.playerFace.setOrigin(0.5, 1);
    this.playerFace.setDepth(playerY + 1);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const { x: gridX, y: gridY } = this.isoToGrid(pointer.worldX, pointer.worldY);
      this.movePlayerToGrid(gridX, gridY);
    });

    this.chatListener = (e: any) => {
        const msg = e.detail;
        this.sendChat(msg);
    };
    window.addEventListener('PHASER_CHAT_EVENT', this.chatListener);

    this.setupRealtime();
    this.scale.on('resize', this.resize, this);

    this.pet = this.physics.add.sprite(this.player.x - 50, this.player.y, 'pet-seed');
    // Arreglo para TypeScript: Solo cambia el tamaño si el cuerpo existe
if (this.pet.body) {
  this.pet.body.setSize(16, 16);
}
  }

  resize(gameSize: Phaser.Structs.Size): void {
      this.cameras.main.centerOn(0, 0);
  }

  // <--- NUEVO: Función para cambiar el ambiente visual
  public changeEnvironment(zoneName: string) {
      const tint = ZONE_TINTS[zoneName] || 0xcccccc;
      
      // Hacemos una transición suave de color (tween)
      this.tweens.addCounter({
          from: 0,
          to: 100,
          duration: 1000,
          onUpdate: (tween) => {
              // Interpolar colores es complejo, aquí haremos un cambio directo con fade
              // O simplemente aplicamos el tinte directo si queremos rendimiento
              this.background.setTint(tint);
          }
      });
      console.log(`Ambiente cambiado a: ${zoneName} (Tinte: ${tint.toString(16)})`);
  }

  update(): void {
    this.player.setDepth(this.player.y);

    if (this.player && this.playerFace) {
        this.playerFace.setPosition(this.player.x, this.player.y);
        this.playerFace.setDepth(this.player.depth + 1);
    }

    this.otherPlayers.forEach(p => {
        p.body.setDepth(p.body.y);
        p.face.setPosition(p.body.x, p.body.y);
        p.face.setDepth(p.body.depth + 1);
    });
    
    this.chatBubbles.forEach((bubble, id) => {
        const target = (id === this.myPlayerId) ? this.player : this.otherPlayers.get(id)?.body;
        if (target) bubble.x = target.x;
        else { bubble.destroy(); this.chatBubbles.delete(id); }
    });

    if (this.pet && this.player) {
      const targetX = this.player.x - 30; 
      const targetY = this.player.y - 40; 
      const distance = Phaser.Math.Distance.Between(this.pet.x, this.pet.y, targetX, targetY);

      if (distance > 3) {
        this.pet.x = Phaser.Math.Linear(this.pet.x, targetX, 0.08); 
        this.pet.y = Phaser.Math.Linear(this.pet.y, targetY, 0.08);
      }

      this.pet.scaleY = 1 + Math.sin(this.time.now / 200) * 0.05;
      this.pet.scaleX = 1 + Math.cos(this.time.now / 200) * 0.05;
      this.pet.setDepth(this.pet.y);
    }

    const pointer = this.input.activePointer;
    const { x: gx, y: gy } = this.isoToGrid(pointer.worldX, pointer.worldY);

    this.highlightGraphics.clear();
    const offset = Math.floor(GRID_SIZE / 2);
    
    const isObstacle = this.obstacles.has(`${gx},${gy}`);
    const cursorColor = isObstacle ? 0xff0000 : 0xffff00; 

    if (gx >= -offset && gx <= offset && gy >= -offset && gy <= offset) {
        const iso = this.gridToIso(gx, gy);
        const points = [
            { x: iso.x, y: iso.y - TILE_HEIGHT / 2 },
            { x: iso.x + TILE_WIDTH / 2, y: iso.y },
            { x: iso.x, y: iso.y + TILE_HEIGHT / 2 },
            { x: iso.x - TILE_WIDTH / 2, y: iso.y }
        ];
        this.highlightGraphics.lineStyle(3, cursorColor, 1);
        this.highlightGraphics.strokePoints(points, true, true);
    }
  }

  // --- DIBUJO DE GRILLA ---
  private drawGrid(): void {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0xffffff, 0.3);

    const offset = Math.floor(GRID_SIZE / 2);
    
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
    
    const { x: ex, y: ey } = this.gridToIso(EVENT_TILE.x, EVENT_TILE.y);
    const eventPoints = [
        { x: ex, y: ey - TILE_HEIGHT / 2 },
        { x: ex + TILE_WIDTH / 2, y: ey },
        { x: ex, y: ey + TILE_HEIGHT / 2 },
        { x: ex - TILE_WIDTH / 2, y: ey },
    ];
    this.gridGraphics.fillStyle(0x0000ff, 0.5);
    this.gridGraphics.fillPoints(eventPoints, true, true);
  }

  // --- MOVIMIENTO ---
  private movePlayerToGrid(gridX: number, gridY: number, onArrival?: () => void): void {
    const offset = Math.floor(GRID_SIZE / 2);

    if (gridX < -offset || gridX > offset || gridY < -offset || gridY > offset) return;

    if (this.obstacles.has(`${gridX},${gridY}`)) {
        if (gridX === EVENT_TILE.x && gridY === EVENT_TILE.y) {
            const neighbors = [
                { x: gridX, y: gridY - 1 },
                { x: gridX, y: gridY + 1 },
                { x: gridX - 1, y: gridY },
                { x: gridX + 1, y: gridY }
            ];

            const validNeighbors = neighbors.filter(n => 
                !this.obstacles.has(`${n.x},${n.y}`) &&
                n.x >= -offset && n.x <= offset &&
                n.y >= -offset && n.y <= offset
            );

            let bestTile = validNeighbors[0];
            let minDistance = 9999;

            validNeighbors.forEach(tile => {
                const dist = Phaser.Math.Distance.Between(this.playerGridX, this.playerGridY, tile.x, tile.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestTile = tile;
                }
            });

            if (bestTile) {
                this.movePlayerToGrid(bestTile.x, bestTile.y, () => {
                    const triggerEvent = this.registry.get('onInteract');
                    if (triggerEvent) triggerEvent({ type: 'math-challenge', id: 1 });
                    
                    const treeSprite = this.children.list.find(c => c.type === 'Sprite' && c.texture.key === 'tree') as Phaser.GameObjects.Sprite;
                    if (treeSprite) {
                        this.tweens.add({
                            targets: treeSprite,
                            scaleX: 1.05, scaleY: 0.95, yoyo: true, duration: 100
                        });
                    }
                });
            }
        }
        return;
    }

    const { x, y } = this.gridToIso(gridX, gridY);
    const distTiles = Phaser.Math.Distance.Between(this.playerGridX, this.playerGridY, gridX, gridY);
    const duration = Math.min(800, Math.max(300, distTiles * 200));

    this.tweens.add({
      targets: this.player,
      x: x,
      y: y,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
          if (onArrival) onArrival();
      }
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

  // --- RED ---
  private handleOtherPlayerMove(data: PlayerData): void {
    if (data.id === this.myPlayerId) return;
    const { x: gridX, y: gridY, color } = data;
    const { x, y } = this.gridToIso(gridX, gridY);
    
    let other = this.otherPlayers.get(data.id);
    if (other) {
      this.tweens.add({
        targets: other.body,
        x: x, y: y, duration: 300, ease: 'Power2'
      });
      if (color && other.color !== color) {
        other.body.setTint(color); other.color = color;
      }
    } else {
      const body = this.add.sprite(x, y, 'korok-body');
      body.setOrigin(0.5, 1);
      body.setTint(color || 0xff0000);
      body.setDepth(y);

      const face = this.add.sprite(x, y, 'korok-face');
      face.setOrigin(0.5, 1);
      face.setDepth(y + 1);

      this.otherPlayers.set(data.id, { body, face, gridX, gridY, color: color || 0xff0000 });
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
    let targetSprite = (id === this.myPlayerId) ? this.player : (this.otherPlayers.get(id)?.body || null);
    if (targetSprite) this.createChatBubble(targetSprite, message, id);
  }

  private createChatBubble(sprite: Phaser.GameObjects.Sprite, message: string, playerId: string): void {
    const old = this.chatBubbles.get(playerId);
    if (old) { old.destroy(); this.chatBubbles.delete(playerId); }

    const bubble = this.add.container(sprite.x, sprite.y - 80); 
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
      targets: bubble, y: sprite.y - 120, alpha: 0, duration: 3000, ease: 'Power2',
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
          this.otherPlayers.forEach((playerData, id) => {
              if (!presentIds.has(id) && id !== this.myPlayerId) {
                  playerData.body.destroy();
                  playerData.face.destroy();
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
  currentZone?: string; // <--- NUEVO PROP
}

export default function GameCanvas({ onInteract, playerColor = 0xffffff, currentZone }: GameCanvasProps) {
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

  // UseEffect para actualizar onInteract
  useEffect(() => {
    if (gameRef.current && onInteract) gameRef.current.registry.set('onInteract', onInteract);
  }, [onInteract]);

  // UseEffect para actualizar Color y Movimiento
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

  // <--- NUEVO: UseEffect para detectar cambio de ZONA
  useEffect(() => {
      if (gameRef.current && currentZone) {
          const scene = gameRef.current.scene.getScene('MainScene') as MainScene;
          if (scene && scene.changeEnvironment) {
              scene.changeEnvironment(currentZone);
          }
      }
  }, [currentZone]);

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />;
}
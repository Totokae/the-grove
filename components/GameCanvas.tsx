'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

// --- CONSTANTES ---
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;

// 👇 TU DISEÑO DE SALA ORIGINAL (MANTENIDO)
const ROOM_LAYOUT = [
    [0, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1], // Centro
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 0]  // Entrada
];

const ROWS = ROOM_LAYOUT.length;
const COLS = ROOM_LAYOUT[0].length;
const OFFSET_ROW = Math.floor(ROWS / 2);
const OFFSET_COL = Math.floor(COLS / 2);
const EVENT_TILE = { x: 2, y: 2 }; 

const ZONE_TINTS: Record<string, number> = {
  'Números': 0xffffff,
  'Álgebra': 0xe06767,
  'Geometría': 0x1FB255,
  'Datos y Azar': 0x728BE8,
};

// --- TIPOS ACTUALIZADOS PARA 3 CAPAS ---
interface PlayerData {
  id: string;
  x: number;
  y: number;
  name?: string;
  // Personalización
  bodyColor: number;
  faceColor: number;
  hairColor: number;
}

interface OtherPlayer {
  body: Phaser.GameObjects.Sprite; 
  face: Phaser.GameObjects.Sprite; // Capa Cara
  hair: Phaser.GameObjects.Sprite; // Capa Pelo
  nameTag: Phaser.GameObjects.Text;
  gridX: number;
  gridY: number;
  // Guardamos colores para referencia
  bodyColor: number;
  faceColor: number;
  hairColor: number;
}

interface InteractionEvent { type: string; id: number; }
interface ChatData { type: 'chat'; message: string; id: string; }

// --- ESCENA PRINCIPAL ---
class MainScene extends Phaser.Scene {
  // JUGADOR LOCAL (3 Partes)
  private playerBody!: Phaser.Physics.Arcade.Sprite; 
  private playerFace!: Phaser.GameObjects.Sprite;
  private playerHair!: Phaser.GameObjects.Sprite;
  private playerNameTag!: Phaser.GameObjects.Text;

  private pet!: Phaser.Physics.Arcade.Sprite;
  private background!: Phaser.GameObjects.TileSprite;

  private playerGridX: number = 0;
  private playerGridY: number = 0;
  
  // Colores y Nombre
  private bodyColor: number = 0xffffff;
  private faceColor: number = 0xffffff;
  private hairColor: number = 0xffffff;
  private playerName: string = "Player";

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
    bodyColor?: number;
    faceColor?: number;
    hairColor?: number;
    playerName?: string;
  }) {
    super({ key: 'MainScene', ...config });
    if (config?.supabaseClient) this.supabaseClient = config.supabaseClient;
    if (config?.playerId) this.myPlayerId = config.playerId;
    if (config?.playerName) this.playerName = config.playerName;
    
    if (config?.bodyColor !== undefined) this.bodyColor = config.bodyColor;
    if (config?.faceColor !== undefined) this.faceColor = config.faceColor;
    if (config?.hairColor !== undefined) this.hairColor = config.hairColor;
  }

  preload(): void {
    // 👇 CARGAMOS LAS 3 CAPAS (Asegúrate de tener estos archivos en /public)
    this.load.spritesheet('body', '/body.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('face', '/face.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('hair', '/hair.png', { frameWidth: 32, frameHeight: 32 });
    
    this.load.image('pet-seed', '/spirit-seed.png'); 
    this.load.image('grass', '/grass.png'); 
    this.load.image('tree', '/tree.png');
  }

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

  private isValidTile(gridX: number, gridY: number): boolean {
    const row = gridY + OFFSET_ROW;
    const col = gridX + OFFSET_COL;
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
    return ROOM_LAYOUT[row][col] === 1;
  }

  create(): void {
    this.cameras.main.centerOn(0, 0);

    this.background = this.add.tileSprite(0, 0, 4000, 4000, 'grass');
    this.background.setOrigin(0.5, 0.5);
    this.background.setDepth(-2000); 
    this.background.setTint(0xcccccc); 

    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(-1000);
    this.highlightGraphics = this.add.graphics();
    this.highlightGraphics.setDepth(-900);
    this.drawGrid();

    // ÁRBOL
    const { x: treeX, y: treeY } = this.gridToIso(EVENT_TILE.x, EVENT_TILE.y);
    const tree = this.add.sprite(treeX, treeY, 'tree');
    tree.setOrigin(0.5, 0.9);
    tree.setDepth(treeY + 10);
    this.obstacles.add(`${EVENT_TILE.x},${EVENT_TILE.y}`);

    // --- CREACIÓN DEL JUGADOR (3 CAPAS) ---
    const { x: playerX, y: playerY } = this.gridToIso(0, 0);

    // 1. CUERPO (Tiene la física)
    this.playerBody = this.physics.add.sprite(playerX, playerY, 'body'); 
    this.playerBody.setOrigin(0.5, 0.8); 
    this.playerBody.setDepth(playerY);
    this.playerBody.setTint(this.bodyColor); 
    this.playerBody.setScale(1.5);

    // 2. CARA
    this.playerFace = this.add.sprite(playerX, playerY, 'face');
    this.playerFace.setOrigin(0.5, 0.8);
    this.playerFace.setDepth(playerY + 1);
    this.playerFace.setTint(this.faceColor);
    this.playerFace.setScale(1.5);

    // 3. PELO
    this.playerHair = this.add.sprite(playerX, playerY, 'hair');
    this.playerHair.setOrigin(0.5, 0.8);
    this.playerHair.setDepth(playerY + 2); 
    this.playerHair.setTint(this.hairColor);
    this.playerHair.setScale(1.5);

    // Nombre
    this.playerNameTag = this.add.text(playerX, playerY - 50, this.playerName, {
        fontSize: '12px', color: '#ffffff', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 3, align: 'center'
    }).setOrigin(0.5).setDepth(playerY + 2000);

    // ANIMACIONES (Genéricas para las 3 partes)
    const animConfig = { frameRate: 10, repeat: -1 };
    
    // Si tus spritesheets tienen la misma cantidad de frames, usamos la misma lógica
    this.anims.create({ key: 'walk-body', frames: this.anims.generateFrameNumbers('body', { start: 0, end: 5 }), ...animConfig });
    this.anims.create({ key: 'walk-face', frames: this.anims.generateFrameNumbers('face', { start: 0, end: 5 }), ...animConfig });
    this.anims.create({ key: 'walk-hair', frames: this.anims.generateFrameNumbers('hair', { start: 0, end: 5 }), ...animConfig });

    this.playerBody.setFrame(0);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const { x: gridX, y: gridY } = this.isoToGrid(pointer.worldX, pointer.worldY);
      this.movePlayerToGrid(gridX, gridY);
    });

    this.chatListener = (e: any) => { this.sendChat(e.detail); };
    window.addEventListener('PHASER_CHAT_EVENT', this.chatListener);

    this.setupRealtime();
    this.scale.on('resize', this.resize, this);

    this.pet = this.physics.add.sprite(this.playerBody.x - 50, this.playerBody.y, 'pet-seed');
    if (this.pet.body) this.pet.body.setSize(16, 16);
  }

  resize(gameSize: Phaser.Structs.Size): void { this.cameras.main.centerOn(0, 0); }

  public changeEnvironment(zoneName: string) {
      const tint = ZONE_TINTS[zoneName] || 0xcccccc;
      this.tweens.addCounter({
          from: 0, to: 100, duration: 1000,
          onUpdate: () => { this.background.setTint(tint); }
      });
  }

  update(): void {
    // Sincronizar Profundidad y Posición
    const depth = this.playerBody.y;
    this.playerBody.setDepth(depth);
    
    this.playerFace.setPosition(this.playerBody.x, this.playerBody.y);
    this.playerFace.setDepth(depth + 1);
    this.playerFace.setFlipX(this.playerBody.flipX);
    
    this.playerHair.setPosition(this.playerBody.x, this.playerBody.y);
    this.playerHair.setDepth(depth + 2);
    this.playerHair.setFlipX(this.playerBody.flipX);

    this.playerNameTag.setPosition(this.playerBody.x, this.playerBody.y - 50);
    this.playerNameTag.setDepth(depth + 2000);

    // Otros Jugadores
    this.otherPlayers.forEach(p => {
        const pDepth = p.body.y;
        p.body.setDepth(pDepth);
        p.face.setPosition(p.body.x, p.body.y).setDepth(pDepth + 1).setFlipX(p.body.flipX);
        p.hair.setPosition(p.body.x, p.body.y).setDepth(pDepth + 2).setFlipX(p.body.flipX);
        p.nameTag.setPosition(p.body.x, p.body.y - 50).setDepth(pDepth + 2000);
    });
    
    this.chatBubbles.forEach((bubble, id) => {
        const target = (id === this.myPlayerId) ? this.playerBody : this.otherPlayers.get(id)?.body;
        if (target) bubble.x = target.x;
        else { bubble.destroy(); this.chatBubbles.delete(id); }
    });

    if (this.pet && this.playerBody) {
      const targetX = this.playerBody.x - 30; 
      const targetY = this.playerBody.y - 40; 
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
    
    if (this.isValidTile(gx, gy)) {
        const isObstacle = this.obstacles.has(`${gx},${gy}`);
        const cursorColor = isObstacle ? 0xff0000 : 0xffff00; 
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

  private drawGrid(): void {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0xffffff, 0.3);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (ROOM_LAYOUT[row][col] === 0) continue;
        const gridX = col - OFFSET_COL;
        const gridY = row - OFFSET_ROW;
        const iso = this.gridToIso(gridX, gridY);
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

  private movePlayerToGrid(gridX: number, gridY: number, onArrival?: () => void): void {
    if (!this.isValidTile(gridX, gridY)) return;

    if (this.obstacles.has(`${gridX},${gridY}`)) {
        if (gridX === EVENT_TILE.x && gridY === EVENT_TILE.y) {
            const neighbors = [
                { x: gridX, y: gridY - 1 }, { x: gridX, y: gridY + 1 },
                { x: gridX - 1, y: gridY }, { x: gridX + 1, y: gridY }
            ];
            const validNeighbors = neighbors.filter(n => 
                !this.obstacles.has(`${n.x},${n.y}`) && this.isValidTile(n.x, n.y)
            );
            let bestTile = validNeighbors[0];
            let minDistance = 9999;
            validNeighbors.forEach(tile => {
                const dist = Phaser.Math.Distance.Between(this.playerGridX, this.playerGridY, tile.x, tile.y);
                if (dist < minDistance) { minDistance = dist; bestTile = tile; }
            });
            if (bestTile) {
                this.movePlayerToGrid(bestTile.x, bestTile.y, () => {
                    const triggerEvent = this.registry.get('onInteract');
                    if (triggerEvent) triggerEvent({ type: 'math-challenge', id: 1 });
                    const treeSprite = this.children.list.find(c => c.type === 'Sprite' && c.texture.key === 'tree') as Phaser.GameObjects.Sprite;
                    if (treeSprite) this.tweens.add({ targets: treeSprite, scaleX: 1.05, scaleY: 0.95, yoyo: true, duration: 100 });
                });
            }
        }
        return;
    }

    const { x, y } = this.gridToIso(gridX, gridY);
    const distTiles = Phaser.Math.Distance.Between(this.playerGridX, this.playerGridY, gridX, gridY);
    const duration = Math.min(800, Math.max(300, distTiles * 200));

    // ANIMAR LAS 3 CAPAS
    this.playerBody.play('walk-body', true);
    this.playerFace.play('walk-face', true);
    this.playerHair.play('walk-hair', true);

    if (x < this.playerBody.x) this.playerBody.setFlipX(true);
    else this.playerBody.setFlipX(false);

    this.tweens.add({
      targets: this.playerBody, x: x, y: y, duration: duration, ease: 'Power2',
      onComplete: () => {
          this.playerBody.stop(); this.playerBody.setFrame(0);
          this.playerFace.stop(); this.playerFace.setFrame(0);
          this.playerHair.stop(); this.playerHair.setFrame(0);
          if (onArrival) onArrival();
      }
    });

    this.playerGridX = gridX;
    this.playerGridY = gridY;

    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'player-move',
        // 👇 ENVIAR TODA LA DATA
        payload: { 
            id: this.myPlayerId, x: gridX, y: gridY, name: this.playerName,
            bodyColor: this.bodyColor, faceColor: this.faceColor, hairColor: this.hairColor
        } as PlayerData,
      });
    }
  }

  // --- RED ---
  private handleOtherPlayerMove(data: PlayerData): void {
    if (data.id === this.myPlayerId) return;
    const { x: gridX, y: gridY, name, bodyColor, faceColor, hairColor } = data;
    const { x, y } = this.gridToIso(gridX, gridY);
    
    let other = this.otherPlayers.get(data.id);
    
    if (other) {
      this.tweens.add({
        targets: other.body, x: x, y: y, duration: 300, ease: 'Power2',
        onComplete: () => { 
            other?.body.stop(); other?.body.setFrame(0);
            other?.face.stop(); other?.face.setFrame(0);
            other?.hair.stop(); other?.hair.setFrame(0);
        }
      });

      // Actualizar colores remotos
      if (bodyColor !== other.bodyColor) { other.body.setTint(bodyColor); other.bodyColor = bodyColor; }
      if (faceColor !== other.faceColor) { other.face.setTint(faceColor); other.faceColor = faceColor; }
      if (hairColor !== other.hairColor) { other.hair.setTint(hairColor); other.hairColor = hairColor; }
      
      other.body.play('walk-body', true);
      other.face.play('walk-face', true);
      other.hair.play('walk-hair', true);

      if (x < other.body.x) other.body.setFlipX(true);
      else other.body.setFlipX(false);

      if (name && other.nameTag.text !== name) other.nameTag.setText(name);

    } else {
      // Crear Jugador Remoto (3 Capas)
      const body = this.add.sprite(x, y, 'body').setOrigin(0.5, 0.8).setDepth(y).setScale(1.5).setTint(bodyColor);
      const face = this.add.sprite(x, y, 'face').setOrigin(0.5, 0.8).setDepth(y+1).setScale(1.5).setTint(faceColor);
      const hair = this.add.sprite(x, y, 'hair').setOrigin(0.5, 0.8).setDepth(y+2).setScale(1.5).setTint(hairColor);
      
      body.play('walk-body');
      face.play('walk-face');
      hair.play('walk-hair');

      const nameTag = this.add.text(x, y - 50, name || "Visitante", {
        fontSize: '10px', color: '#ffffff', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 2, align: 'center'
      }).setOrigin(0.5).setDepth(y + 2000);

      this.otherPlayers.set(data.id, { 
          body, face, hair, nameTag, gridX, gridY, 
          bodyColor, faceColor, hairColor 
      });
    }
  }

  private sendChat(message: string): void {
    if (!message.trim()) return;
    this.createChatBubble(this.playerBody, message.trim(), this.myPlayerId);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast', event: 'chat',
        payload: { type: 'chat', message: message.trim(), id: this.myPlayerId } as ChatData,
      });
    }
  }

  private handleChatMessage(data: ChatData): void {
    const { id, message } = data;
    let targetSprite = (id === this.myPlayerId) ? this.playerBody : (this.otherPlayers.get(id)?.body || null);
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
                  playerData.hair.destroy();
                  playerData.nameTag.destroy();
                  this.otherPlayers.delete(id);
              }
          });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.channel.track({ id: this.myPlayerId, x: 0, y: 0, name: this.playerName });
          this.channel.send({ 
              type: 'broadcast', event: 'player-move', 
              payload: { 
                  id: this.myPlayerId, x: 0, y: 0, name: this.playerName,
                  bodyColor: this.bodyColor, faceColor: this.faceColor, hairColor: this.hairColor
              } as PlayerData 
          });
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
  currentZone?: string; 
  playerName?: string;
  // Colores
  bodyColor?: number;
  faceColor?: number;
  hairColor?: number;
}

export default function GameCanvas({ 
    onInteract, currentZone, playerName = "Player", 
    bodyColor = 0xffffff, faceColor = 0xffffff, hairColor = 0xffffff 
}: GameCanvasProps) {
  
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
          key: 'MainScene', supabaseClient: client, playerId, 
          playerName, bodyColor, faceColor, hairColor 
      }), 
      physics: { default: 'arcade', arcade: { debug: false } },
      backgroundColor: '#2d5a27',
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
    };

    gameRef.current = new Phaser.Game(config);
    if (onInteract) gameRef.current.registry.set('onInteract', onInteract);

    return () => { gameRef.current?.destroy(true); };
  }, []); 

  useEffect(() => {
    if (gameRef.current && onInteract) gameRef.current.registry.set('onInteract', onInteract);
  }, [onInteract]);

  // Actualizar colores en caliente (Hot Update)
  useEffect(() => {
    if (gameRef.current) {
        const scene = gameRef.current.scene.getScene('MainScene') as any;
        if (scene && scene.playerBody) {
             // Actualizar localmente
             scene.playerBody.setTint(bodyColor);
             scene.playerFace.setTint(faceColor);
             scene.playerHair.setTint(hairColor);
             
             // Actualizar variables internas
             scene.bodyColor = bodyColor;
             scene.faceColor = faceColor;
             scene.hairColor = hairColor;

             // Notificar a red
             scene.channel?.send({ 
                 type: 'broadcast', event: 'player-move', 
                 payload: { 
                     id: scene.myPlayerId, x: scene.playerGridX, y: scene.playerGridY, 
                     name: playerName, bodyColor, faceColor, hairColor 
                 } 
             });
        }
    }
  }, [bodyColor, faceColor, hairColor, playerName]);

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
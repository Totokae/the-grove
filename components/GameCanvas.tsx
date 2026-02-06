'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

// --- CONSTANTES ---
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const BLOCK_OFFSET = 32;

interface NpcDefinition {
    id: string; name: string; x: number; y: number; sprite: string; dialogueId: string;
}
const NPCS: NpcDefinition[] = [
    { id: 'profesor', name: 'Prof. Ray Z.', x: 6, y: 6, sprite: 'npc_ray_z', dialogueId: 'welcome-math' }
];

// 👇 NUEVO: OBJETOS INTERACTIVOS (Hojas, muebles, etc.)
interface InteractiveProp {
    id: string; toolId: string; name: string; x: number; y: number; sprite: string;
}

const INTERACTIVE_PROPS: InteractiveProp[] = [
    { id: 'sheet_1', toolId: 'fraction_visualizer', name: 'Hoja de Fracciones', x: 4, y: 8, sprite: 'sheet' },
    { id: 'sheet_2', toolId: 'ancient_calculator', name: 'Apuntes de Cálculo', x: 10, y: 4, sprite: 'sheet' }
];

interface Collectible {
    id: string; x: number; y: number; sprite: string;
}

const ROOM_LAYOUT = [
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0]
];

const ROWS = ROOM_LAYOUT.length;
const COLS = ROOM_LAYOUT[0].length;
const OFFSET_ROW = Math.floor(ROWS / 2);
const OFFSET_COL = Math.floor(COLS / 2);
const EVENT_TILE = { x: 2, y: 2 }; 

const ZONE_TINTS: Record<string, number> = {
    'Números': 0xffffff, 'Álgebra': 0xe06767, 'Geometría': 0x1FB255, 'Datos y Azar': 0x728BE8,
};

interface PlayerData { id: string; x: number; y: number; name?: string; bodyColor: number; faceColor: number; hairColor: number; }
interface OtherPlayer { body: Phaser.GameObjects.Sprite; face: Phaser.GameObjects.Sprite; hair: Phaser.GameObjects.Sprite; nameTag: Phaser.GameObjects.Text; gridX: number; gridY: number; bodyColor: number; faceColor: number; hairColor: number; }
interface InteractionEvent { type: string; id: string; }
interface ChatData { type: 'chat'; message: string; id: string; }

class MainScene extends Phaser.Scene {
    private playerBody!: Phaser.Physics.Arcade.Sprite; 
    private playerFace!: Phaser.GameObjects.Sprite;
    private playerHair!: Phaser.GameObjects.Sprite;
    private playerNameTag!: Phaser.GameObjects.Text;
    private pet!: Phaser.Physics.Arcade.Sprite;
    private sky!: Phaser.GameObjects.TileSprite;
    private playerGridX: number = 0; private playerGridY: number = 0;
    private playerName: string = "Player";
    private bodyColor: number = 0xffffff; private faceColor: number = 0xffffff; private hairColor: number = 0xffffff;
    private obstacles: Set<string> = new Set(); 
    private terrainGroup!: Phaser.GameObjects.Group;
    private npcGroup!: Phaser.GameObjects.Group;
    private itemsGroup!: Phaser.GameObjects.Group; 
    private propsGroup!: Phaser.GameObjects.Group; // 👇 Grupo para Hojas/Props

    private supabaseClient!: SupabaseClient; private myPlayerId!: string;
    private otherPlayers: Map<string, OtherPlayer> = new Map();
    private channel!: RealtimeChannel;
    private chatBubbles: Map<string, Phaser.GameObjects.Container> = new Map();
    private gridGraphics!: Phaser.GameObjects.Graphics; private highlightGraphics!: Phaser.GameObjects.Graphics;
    private chatListener: ((e: any) => void) | null = null;
    private collectedItems: Set<string> = new Set();
    private activeQuestItems: Collectible[] = [];

    constructor(config?: Phaser.Types.Scenes.SettingsConfig & {
        supabaseClient?: SupabaseClient; playerId?: string; playerName?: string; bodyColor?: number; faceColor?: number; hairColor?: number; initialX?: number; initialY?: number; initialCollectedItems?: string[];
    }) {
        super({ key: 'MainScene', ...config });
        if (config?.supabaseClient) this.supabaseClient = config.supabaseClient;
        if (config?.playerId) this.myPlayerId = config.playerId;
        if (config?.playerName) this.playerName = config.playerName;
        if (config?.bodyColor !== undefined) this.bodyColor = config.bodyColor;
        if (config?.faceColor !== undefined) this.faceColor = config.faceColor;
        if (config?.hairColor !== undefined) this.hairColor = config.hairColor;
        if (config?.initialX !== undefined) this.playerGridX = config.initialX;
        if (config?.initialY !== undefined) this.playerGridY = config.initialY;
        if (config?.initialCollectedItems) { this.collectedItems = new Set(config.initialCollectedItems); }
    }

    preload(): void {
        this.load.spritesheet('body', '/body.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('face', '/face.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('hair', '/hair.png', { frameWidth: 32, frameHeight: 32 });
        this.load.image('pet-seed', '/spirit-seed.png'); 
        this.load.image('grass', '/grass.png'); 
        this.load.image('tree', '/tree.png');
        this.load.image('water', '/water.png'); 
        this.load.image('rock', '/rock.png'); 
        this.load.image('sky', '/sky.png'); 
        this.load.image('grass_block', '/grass_block.png'); 
        this.load.image('cloud_cliff', '/cloud_cliff.png'); 
        this.load.spritesheet('npc_ray_z', '/Profesor_Ray_Z.png', { frameWidth: 32, frameHeight: 32 });
        this.load.image('fruit', '/fruit.png'); 
        this.load.image('sheet', '/sheet.png'); // 👇 CARGAMOS LA HOJA
    }

    private gridToIso(gridX: number, gridY: number): { x: number; y: number } {
        const isoX = (gridX - gridY) * (TILE_WIDTH / 2); const isoY = (gridX + gridY) * (TILE_HEIGHT / 2); return { x: isoX, y: isoY };
    }
    private isoToGrid(isoX: number, isoY: number): { x: number; y: number } {
        const gridX = Math.round((isoX / (TILE_WIDTH / 2) + isoY / (TILE_HEIGHT / 2)) / 2); const gridY = Math.round((isoY / (TILE_HEIGHT / 2) - isoX / (TILE_WIDTH / 2)) / 2); return { x: gridX, y: gridY };
    }
    private isValidTile(gridX: number, gridY: number): boolean {
        const row = gridY + OFFSET_ROW; const col = gridX + OFFSET_COL; if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false; return ROOM_LAYOUT[row][col] === 1;
    }

    create(): void {
        this.cameras.main.setZoom(1); 
        this.sky = this.add.tileSprite(0, 0, 4000, 4000, 'sky').setDepth(-9999).setScrollFactor(0.1).setAlpha(1); 
        this.createTerrain();
        this.createNPCs(); 
        this.createProps(); // 👇 CREAR LAS HOJAS INTERACTIVAS
        this.createCollectibles(); 

        this.gridGraphics = this.add.graphics().setDepth(-50); 
        this.highlightGraphics = this.add.graphics().setDepth(99999); 

        const { x: treeX, y: treeY } = this.gridToIso(EVENT_TILE.x, EVENT_TILE.y);
        const tree = this.add.sprite(treeX, treeY - BLOCK_OFFSET + 20, 'tree').setOrigin(0.5, 0.9).setDepth(treeY);
        this.obstacles.add(`${EVENT_TILE.x},${EVENT_TILE.y}`);

        const { x: playerX, y: playerY } = this.gridToIso(this.playerGridX, this.playerGridY);
        const startY = playerY - BLOCK_OFFSET;
        this.playerBody = this.physics.add.sprite(playerX, startY, 'body').setOrigin(0.5, 0.8).setDepth(playerY).setTint(this.bodyColor).setScale(1.5);
        this.playerFace = this.add.sprite(playerX, startY, 'face').setOrigin(0.5, 0.8).setDepth(playerY + 1).setTint(this.faceColor).setScale(1.5);
        this.playerHair = this.add.sprite(playerX, startY, 'hair').setOrigin(0.5, 0.8).setDepth(playerY + 2).setTint(this.hairColor).setScale(1.5);
        this.playerNameTag = this.add.text(playerX, startY - 50, this.playerName, { fontSize: '12px', color: '#ffffff', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 3, align: 'center' }).setOrigin(0.5).setDepth(playerY + 2000);

        const animConfig = { frameRate: 10, repeat: -1 };
        if (!this.anims.exists('walk-body')) {
            this.anims.create({ key: 'walk-body', frames: this.anims.generateFrameNumbers('body', { start: 0, end: 5 }), ...animConfig });
            this.anims.create({ key: 'walk-face', frames: this.anims.generateFrameNumbers('face', { start: 0, end: 5 }), ...animConfig });
            this.anims.create({ key: 'walk-hair', frames: this.anims.generateFrameNumbers('hair', { start: 0, end: 5 }), ...animConfig });
        }
        this.playerBody.setFrame(0);
        this.cameras.main.startFollow(this.playerBody, true, 0.08, 0.08);
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const adjustedY = pointer.worldY + BLOCK_OFFSET; const { x: gridX, y: gridY } = this.isoToGrid(pointer.worldX, adjustedY);
            this.handlePlayerInput(gridX, gridY);
        });
        this.chatListener = (e: any) => { this.sendChat(e.detail); };
        window.addEventListener('PHASER_CHAT_EVENT', this.chatListener);
        this.setupRealtime(); this.scale.on('resize', this.resize, this);
        this.pet = this.physics.add.sprite(this.playerBody.x - 50, this.playerBody.y, 'pet-seed'); if (this.pet.body) this.pet.body.setSize(16, 16);
    }

    // 👇 FUNCIÓN PARA CREAR PROPS (HOJAS)
    private createProps(): void {
        this.propsGroup = this.add.group();
        INTERACTIVE_PROPS.forEach(prop => {
            // Verificamos si la casilla es válida antes de ponerla para evitar el vacío
            if (this.isValidTile(prop.x, prop.y)) {
                const { x, y } = this.gridToIso(prop.x, prop.y);
                const sprite = this.add.sprite(x, y - BLOCK_OFFSET + 10, prop.sprite);
                sprite.setOrigin(0.5, 0.8);
                sprite.setDepth(y);
                
                const label = this.add.text(x, y - BLOCK_OFFSET - 40, prop.name, {
                    fontSize: '10px', color: '#aeea00', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 3, align: 'center'
                }).setOrigin(0.5).setDepth(y + 2000);

                this.obstacles.add(`${prop.x},${prop.y}`); 
                this.propsGroup.add(sprite);
            }
        });
    }

    private createCollectibles(): void {
        this.itemsGroup = this.add.group();
        for (let i = 0; i < 3; i++) {
            const id = `fruit_${i}`;
            if (this.collectedItems.has(id)) continue;
            let placed = false; let attempts = 0;
            while (!placed && attempts < 50) {
                attempts++;
                const gridX = Phaser.Math.Between(-OFFSET_COL, COLS - OFFSET_COL);
                const gridY = Phaser.Math.Between(-OFFSET_ROW, ROWS - OFFSET_ROW);
                if (!this.isValidTile(gridX, gridY)) continue;
                const key = `${gridX},${gridY}`;
                if (this.obstacles.has(key)) continue;
                if (gridX === EVENT_TILE.x && gridY === EVENT_TILE.y) continue;
                if (gridX === this.playerGridX && gridY === this.playerGridY) continue;
                if (this.activeQuestItems.some(item => item.x === gridX && item.y === gridY)) continue;
                const { x, y } = this.gridToIso(gridX, gridY);
                const sprite = this.add.sprite(x, y - BLOCK_OFFSET - 10, 'fruit');
                sprite.setOrigin(0.5, 0.8); sprite.setDepth(y + 1); sprite.setName(id);
                this.tweens.add({ targets: sprite, y: y - BLOCK_OFFSET - 20, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                this.itemsGroup.add(sprite);
                this.activeQuestItems.push({ id, x: gridX, y: gridY, sprite: 'fruit' });
                placed = true;
            }
        }
    }

    private createNPCs(): void {
        this.npcGroup = this.add.group();
        NPCS.forEach(npc => {
            const { x, y } = this.gridToIso(npc.x, npc.y); const npcSprite = this.add.sprite(x, y - BLOCK_OFFSET + 8, npc.sprite); npcSprite.setOrigin(0.5, 0.8); npcSprite.setDepth(y); npcSprite.setScale(1.5); const nameTag = this.add.text(x, y - BLOCK_OFFSET - 60, npc.name, { fontSize: '12px', color: '#ffd700', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 3, align: 'center' }).setOrigin(0.5).setDepth(y + 2000); this.obstacles.add(`${npc.x},${npc.y}`);
        });
    }

    private createTerrain(): void {
        this.terrainGroup = this.add.group();
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const gridX = col - OFFSET_COL; const gridY = row - OFFSET_ROW; const { x, y } = this.gridToIso(gridX, gridY);
                if (ROOM_LAYOUT[row][col] === 1) {
                    const block = this.add.sprite(x, y, 'grass_block').setOrigin(0.5, 0.5); block.y -= 16; block.setDepth(-2000 + row + col); this.terrainGroup.add(block);
                    const isNpcHere = NPCS.some(n => n.x === gridX && n.y === gridY);
                    const isPropHere = INTERACTIVE_PROPS.some(p => p.x === gridX && p.y === gridY); 
                    if (!((gridX === 0 && gridY === 0) || (gridX === EVENT_TILE.x && gridY === EVENT_TILE.y) || isNpcHere || isPropHere)) {
                        const chance = Math.random(); 
                        if (chance > 0.97) { const tree = this.add.sprite(x, y - BLOCK_OFFSET + 20, 'tree').setOrigin(0.5, 0.9).setDepth(y); this.obstacles.add(`${gridX},${gridY}`); } 
                        else if (chance > 0.94) { const rock = this.add.sprite(x, y - BLOCK_OFFSET, 'rock').setOrigin(0.5, 0.8).setDepth(y); this.obstacles.add(`${gridX},${gridY}`); }
                    }
                    const neighborSouthWest = (row + 1 < ROWS) ? ROOM_LAYOUT[row + 1][col] : 0; const neighborSouthEast = (col + 1 < COLS) ? ROOM_LAYOUT[row][col + 1] : 0;
                    if (neighborSouthWest === 0 || neighborSouthEast === 0) { const cliff = this.add.sprite(x, y + 20 - 16, 'cloud_cliff').setOrigin(0.5, 0).setDepth(-3000).setAlpha(0.9); this.terrainGroup.add(cliff); }
                }
            }
        }
    }

    public syncCollectedItems(newCollectedList: string[]) {
        newCollectedList.forEach(id => {
            this.collectedItems.add(id);
            const sprite = this.itemsGroup?.getChildren().find((s: any) => s.name === id) as Phaser.GameObjects.Sprite;
            if (sprite) { this.tweens.add({ targets: sprite, scaleX: 0, scaleY: 0, duration: 300, onComplete: () => sprite.destroy() }); }
        });
    }

    resize(gameSize: Phaser.Structs.Size): void { if (this.playerBody) { this.cameras.main.centerOn(this.playerBody.x, this.playerBody.y); } }
    public changeEnvironment(zoneName: string) { this.terrainGroup.setTint(ZONE_TINTS[zoneName] || 0xffffff); }

    update(): void {
        if (this.sky) { this.sky.tilePositionX += 0.5; this.sky.tilePositionY += 0.2; }
        const depth = this.playerBody.y + BLOCK_OFFSET; this.playerBody.setDepth(depth);
        this.playerFace.setPosition(this.playerBody.x, this.playerBody.y).setDepth(depth + 1).setFlipX(this.playerBody.flipX);
        this.playerHair.setPosition(this.playerBody.x, this.playerBody.y).setDepth(depth + 2).setFlipX(this.playerBody.flipX);
        this.playerNameTag.setPosition(this.playerBody.x, this.playerBody.y - 50).setDepth(depth + 2000);
        this.otherPlayers.forEach(p => {
            const pDepth = p.body.y + BLOCK_OFFSET; p.body.setDepth(pDepth); p.face.setPosition(p.body.x, p.body.y).setDepth(pDepth + 1).setFlipX(p.body.flipX); p.hair.setPosition(p.body.x, p.body.y).setDepth(pDepth + 2).setFlipX(p.body.flipX); p.nameTag.setPosition(p.body.x, p.body.y - 50).setDepth(pDepth + 2000);
        });
        this.chatBubbles.forEach((bubble, id) => {
            const target = (id === this.myPlayerId) ? this.playerBody : this.otherPlayers.get(id)?.body;
            if (target) bubble.x = target.x; else { bubble.destroy(); this.chatBubbles.delete(id); }
        });
        if (this.pet && this.playerBody) {
            const targetX = this.playerBody.x - 30; const targetY = this.playerBody.y - 40; const distance = Phaser.Math.Distance.Between(this.pet.x, this.pet.y, targetX, targetY); if (distance > 3) { this.pet.x = Phaser.Math.Linear(this.pet.x, targetX, 0.08); this.pet.y = Phaser.Math.Linear(this.pet.y, targetY, 0.08); } this.pet.scaleY = 1 + Math.sin(this.time.now / 200) * 0.05; this.pet.scaleX = 1 + Math.cos(this.time.now / 200) * 0.05; this.pet.setDepth(this.pet.y);
        }
        const pointer = this.input.activePointer; const adjustedY = pointer.worldY + BLOCK_OFFSET; const { x: gx, y: gy } = this.isoToGrid(pointer.worldX, adjustedY);
        this.highlightGraphics.clear();
        if (this.isValidTile(gx, gy)) {
            const isNpc = NPCS.some(n => n.x === gx && n.y === gy);
            const isEvent = (gx === EVENT_TILE.x && gy === EVENT_TILE.y); 
            const isItem = this.activeQuestItems.some(i => i.x === gx && i.y === gy && !this.collectedItems.has(i.id));
            const isProp = INTERACTIVE_PROPS.some(p => p.x === gx && p.y === gy);
            const isObstacle = this.obstacles.has(`${gx},${gy}`);
            let cursorColor = 0xffff00; 
            if (isNpc) cursorColor = 0x0000ff; else if (isEvent) cursorColor = 0x00ffff; else if (isProp) cursorColor = 0xff00ff; else if (isItem) cursorColor = 0x00ff00; else if (isObstacle) cursorColor = 0xff0000; 
            const iso = this.gridToIso(gx, gy); const drawY = iso.y - BLOCK_OFFSET;
            const points = [ { x: iso.x, y: drawY - TILE_HEIGHT / 2 }, { x: iso.x + TILE_WIDTH / 2, y: drawY }, { x: iso.x, y: drawY + TILE_HEIGHT / 2 }, { x: iso.x - TILE_WIDTH / 2, y: drawY } ];
            this.highlightGraphics.lineStyle(3, cursorColor, 0.8); this.highlightGraphics.strokePoints(points, true, true);
        }
    }

    private handlePlayerInput(gridX: number, gridY: number): void {
        if (!this.isValidTile(gridX, gridY)) return;
        
        const onInteract = this.registry.get('onInteract');

        // 1. NPC
        const targetNPC = NPCS.find(n => n.x === gridX && n.y === gridY);
        if (targetNPC) {
            const bestTile = this.getNearestValidNeighbor(gridX, gridY);
            if (bestTile) { this.movePlayerToGrid(bestTile.x, bestTile.y, () => { if (onInteract) onInteract({ type: 'npc-dialog', id: targetNPC.dialogueId }); }); }
            return;
        }

        // 2. 👇 OBJETO INTERACTIVO (HOJA) - FIJADO COMUNICACIÓN CON REACT
        const targetProp = INTERACTIVE_PROPS.find(p => p.x === gridX && p.y === gridY);
        if (targetProp) {
            const bestTile = this.getNearestValidNeighbor(gridX, gridY);
            if (bestTile) {
                this.movePlayerToGrid(bestTile.x, bestTile.y, () => {
                    if (onInteract) {
                        onInteract({ type: 'open-tool', id: targetProp.toolId });
                    }
                });
            }
            return;
        }

        // 3. FRUTA
        const targetItem = this.activeQuestItems.find(i => i.x === gridX && i.y === gridY);
        if (targetItem && !this.collectedItems.has(targetItem.id)) {
            this.movePlayerToGrid(gridX, gridY, () => { if (onInteract) onInteract({ type: 'collect-item', id: targetItem.id }); }); return;
        }

        // 4. ÁRBOL
        if (gridX === EVENT_TILE.x && gridY === EVENT_TILE.y) {
            const bestTile = this.getNearestValidNeighbor(gridX, gridY);
            if (bestTile) { this.movePlayerToGrid(bestTile.x, bestTile.y, () => { if (onInteract) onInteract({ type: 'math-challenge', id: '1' }); }); }
            return;
        }

        // 5. MOVIMIENTO NORMAL
        if (!this.obstacles.has(`${gridX},${gridY}`)) { this.movePlayerToGrid(gridX, gridY); }
    }

    private getNearestValidNeighbor(gx: number, gy: number) {
        const neighbors = [ { x: gx, y: gy - 1 }, { x: gx, y: gy + 1 }, { x: gx - 1, y: gy }, { x: gx + 1, y: gy } ];
        const valid = neighbors.filter(n => !this.obstacles.has(`${n.x},${n.y}`) && this.isValidTile(n.x, n.y));
        let best = valid[0]; let minDist = 9999;
        valid.forEach(v => { const d = Phaser.Math.Distance.Between(this.playerGridX, this.playerGridY, v.x, v.y); if (d < minDist) { minDist = d; best = v; } });
        return best;
    }

    private movePlayerToGrid(gridX: number, gridY: number, onArrival?: () => void): void {
        const { x, y } = this.gridToIso(gridX, gridY); const targetY = y - BLOCK_OFFSET;
        const distTiles = Phaser.Math.Distance.Between(this.playerGridX, this.playerGridY, gridX, gridY);
        this.playerBody.play('walk-body', true); this.playerFace.play('walk-face', true); this.playerHair.play('walk-hair', true);
        if (x < this.playerBody.x) this.playerBody.setFlipX(true); else this.playerBody.setFlipX(false);
        this.tweens.add({ targets: this.playerBody, x: x, y: targetY, duration: Math.min(800, Math.max(300, distTiles * 200)), ease: 'Power2',
            onComplete: () => { this.playerBody.stop(); this.playerBody.setFrame(0); this.playerFace.stop(); this.playerFace.setFrame(0); this.playerHair.stop(); this.playerHair.setFrame(0); if (onArrival) onArrival(); }
        });
        this.playerGridX = gridX; this.playerGridY = gridY;
        const onMove = this.registry.get('onMove'); if (onMove) onMove(gridX, gridY);
        if (this.channel) { this.channel.send({ type: 'broadcast', event: 'player-move', payload: { id: this.myPlayerId, x: gridX, y: gridY, name: this.playerName, bodyColor: this.bodyColor, faceColor: this.faceColor, hairColor: this.hairColor } as PlayerData, }); }
    }

    private handleOtherPlayerMove(data: PlayerData): void { if (data.id === this.myPlayerId) return; const { x: gridX, y: gridY, name, bodyColor, faceColor, hairColor } = data; const { x, y } = this.gridToIso(gridX, gridY); const targetY = y - BLOCK_OFFSET; let other = this.otherPlayers.get(data.id); if (other) { this.tweens.add({ targets: other.body, x: x, y: targetY, duration: 300, ease: 'Power2', onComplete: () => { other?.body.stop(); other?.body.setFrame(0); other?.face.stop(); other?.face.setFrame(0); other?.hair.stop(); other?.hair.setFrame(0); } }); if (bodyColor !== other.bodyColor) { other.body.setTint(bodyColor); other.bodyColor = bodyColor; } if (faceColor !== other.faceColor) { other.face.setTint(faceColor); other.faceColor = faceColor; } if (hairColor !== other.hairColor) { other.hair.setTint(hairColor); other.hairColor = hairColor; } other.body.play('walk-body', true); other.face.play('walk-face', true); other.hair.play('walk-hair', true); if (x < other.body.x) other.body.setFlipX(true); else other.body.setFlipX(false); if (name && other.nameTag.text !== name) other.nameTag.setText(name); } else { const body = this.add.sprite(x, targetY, 'body').setOrigin(0.5, 0.8).setDepth(y).setScale(1.5).setTint(bodyColor); const face = this.add.sprite(x, targetY, 'face').setOrigin(0.5, 0.8).setDepth(y+1).setScale(1.5).setTint(faceColor); const hair = this.add.sprite(x, targetY, 'hair').setOrigin(0.5, 0.8).setDepth(y+2).setScale(1.5).setTint(hairColor); body.play('walk-body'); face.play('walk-face'); hair.play('walk-hair'); const nameTag = this.add.text(x, targetY - 50, name || "Visitante", { fontSize: '10px', color: '#ffffff', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 2, align: 'center' }).setOrigin(0.5).setDepth(y + 2000); this.otherPlayers.set(data.id, { body, face, hair, nameTag, gridX, gridY, bodyColor, faceColor, hairColor }); } }
    private sendChat(message: string): void { if (!message.trim()) return; this.createChatBubble(this.playerBody, message.trim(), this.myPlayerId); if (this.channel) { this.channel.send({ type: 'broadcast', event: 'chat', payload: { type: 'chat', message: message.trim(), id: this.myPlayerId } as ChatData, }); } }
    private handleChatMessage(data: ChatData): void { const { id, message } = data; let targetSprite = (id === this.myPlayerId) ? this.playerBody : (this.otherPlayers.get(id)?.body || null); if (targetSprite) this.createChatBubble(targetSprite, message, id); }
    private createChatBubble(sprite: Phaser.GameObjects.Sprite, message: string, playerId: string): void { const old = this.chatBubbles.get(playerId); if (old) { old.destroy(); this.chatBubbles.delete(playerId); } const bubble = this.add.container(sprite.x, sprite.y - 80); const bg = this.add.graphics(); bg.fillStyle(0xffffff, 0.9); bg.fillRoundedRect(-60, -15, 120, 30, 8); bg.lineStyle(2, 0x000000, 0.2); bg.strokeRoundedRect(-60, -15, 120, 30, 8); const text = this.add.text(0, 0, message, { fontSize: '14px', color: '#000000', fontFamily: 'Arial', align: 'center' }).setOrigin(0.5); bubble.add([bg, text]); bubble.setDepth(9999); this.chatBubbles.set(playerId, bubble); this.tweens.add({ targets: bubble, y: sprite.y - 120, alpha: 0, duration: 3000, ease: 'Power2', onComplete: () => { bubble.destroy(); this.chatBubbles.delete(playerId); } }); }
    private setupRealtime(): void { this.channel = this.supabaseClient.channel('the-grove-global', { config: { presence: { key: this.myPlayerId } } }); this.channel.on('broadcast', { event: 'player-move' }, (payload) => this.handleOtherPlayerMove(payload.payload)).on('broadcast', { event: 'chat' }, (payload) => this.handleChatMessage(payload.payload)).on('presence', { event: 'sync' }, () => { const state = this.channel.presenceState(); const presentIds = new Set(Object.keys(state)); this.otherPlayers.forEach((playerData, id) => { if (!presentIds.has(id) && id !== this.myPlayerId) { playerData.body.destroy(); playerData.face.destroy(); playerData.hair.destroy(); playerData.nameTag.destroy(); this.otherPlayers.delete(id); } }); }).subscribe(async (status) => { if (status === 'SUBSCRIBED') { await this.channel.track({ id: this.myPlayerId, x: 0, y: 0, name: this.playerName }); this.channel.send({ type: 'broadcast', event: 'player-move', payload: { id: this.myPlayerId, x: 0, y: 0, name: this.playerName, bodyColor: this.bodyColor, faceColor: this.faceColor, hairColor: this.hairColor } as PlayerData }); } }); }
    shutdown(): void { if (this.channel) this.channel.unsubscribe(); if (this.chatListener) window.removeEventListener('PHASER_CHAT_EVENT', this.chatListener); this.otherPlayers.clear(); this.chatBubbles.clear(); }
}

export default function GameCanvas({ onInteract, currentZone, playerName = "Player", bodyColor = 0xffffff, faceColor = 0xffffff, hairColor = 0xffffff, initialX = 0, initialY = 0, onMove, initialCollectedItems }: any) {
    const gameRef = useRef<Phaser.Game | null>(null); const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (typeof window === 'undefined') return; const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if (!supabaseUrl || !supabaseAnonKey) return; const client = createClient(supabaseUrl, supabaseAnonKey); const playerId = `player-${Math.random().toString(36).substring(2, 9)}`;
        const config: Phaser.Types.Core.GameConfig = { type: Phaser.AUTO, width: window.innerWidth, height: window.innerHeight, parent: containerRef.current || undefined, scene: new MainScene({ key: 'MainScene', supabaseClient: client, playerId, playerName, bodyColor, faceColor, hairColor, initialX, initialY, initialCollectedItems }), physics: { default: 'arcade', arcade: { debug: false } }, backgroundColor: '#62a6d4', scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH } };
        gameRef.current = new Phaser.Game(config); 
        // 👇 SOLUCIÓN ERROR NULL: Registry directo antes de que empiece
        gameRef.current.registry.set('onInteract', onInteract); 
        gameRef.current.registry.set('onMove', onMove); 
        return () => { gameRef.current?.destroy(true); }; }, []); 

    useEffect(() => { if (gameRef.current) { gameRef.current.registry.set('onInteract', onInteract); gameRef.current.registry.set('onMove', onMove); } }, [onInteract, onMove]);
    useEffect(() => { if (gameRef.current) { 
        const scene = gameRef.current.scene.getScene('MainScene') as any; 
        if (scene && scene.playerBody) { 
            scene.playerBody.setTint(bodyColor); scene.playerFace.setTint(faceColor); scene.playerHair.setTint(hairColor); 
            scene.bodyColor = bodyColor; scene.faceColor = faceColor; scene.hairColor = hairColor; 
            scene.channel?.send({ type: 'broadcast', event: 'player-move', payload: { id: scene.myPlayerId, x: scene.playerGridX, y: scene.playerGridY, name: playerName, bodyColor: faceColor, hairColor: hairColor } }); 
        } 
    } }, [bodyColor, faceColor, hairColor, playerName]);
    
    useEffect(() => { 
        if (gameRef.current && gameRef.current.scene.isActive('MainScene') && initialCollectedItems) { 
            const scene = gameRef.current.scene.getScene('MainScene') as MainScene; 
            if (scene && typeof scene.syncCollectedItems === 'function') { scene.syncCollectedItems(initialCollectedItems); } 
        } 
    }, [initialCollectedItems]);

    useEffect(() => { if (gameRef.current && currentZone) { const scene = gameRef.current.scene.getScene('MainScene') as MainScene; if (scene && scene.changeEnvironment) { scene.changeEnvironment(currentZone); } } }, [currentZone]);
    return <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#62a6d4' }} />;
}
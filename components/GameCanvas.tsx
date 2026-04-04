'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

// --- CONSTANTES GLOBALES ---
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const BLOCK_OFFSET = 32;

// Mapa de rutas a archivos JSON por zona
const ZONE_MAPS: Record<string, string> = {
    // --- HUB CENTRAL ---
    'hub_main': '/maps/island_hub.json',

    // --- BÁSICA (1-8) ---
    'grade_1': '/maps/island_grade1.json',
    'grade_2': '/maps/island_grade2.json',
    'grade_3': '/maps/island_grade3.json',
    'grade_4': '/maps/island_grade4.json',
    'grade_5': '/maps/island_grade5.json',
    'grade_6': '/maps/island_grade6.json',
    'grade_7': '/maps/island_grade7.json',
    'grade_8': '/maps/island_grade8.json',

    // --- MEDIA (1-4) ---
    'media_1': '/maps/island_media1.json',
    'media_2': '/maps/island_media2.json',
    'media_3': '/maps/island_media3.json',
    'media_4': '/maps/island_media4.json',

    // --- EXÁMENES ---
    'simce': '/maps/island_simce.json',
    'paes': '/maps/island_paes.json',

    // --- FALLBACK ---
    'default': '/maps/island_hub.json' 
};

const ZONE_TINTS: Record<string, number> = {
    'Números': 0xffffff, 'Álgebra': 0xe06767, 'Geometría': 0x1FB255, 'Datos y Azar': 0x728BE8, 'Hub': 0xffd700
};

// Interfaces de Datos
interface MapData {
    id: string;
    width: number;
    height: number;
    layers: { name: string; data: number[][] }[];
    objects: {
        npcs: NpcDefinition[];
        props: InteractiveProp[];
        events: { type: string; x: number; y: number }[];
    }
}

interface NpcDefinition { id: string; name: string; x: number; y: number; sprite: string; dialogueId: string; }
interface InteractiveProp { id: string; toolId: string; name: string; x: number; y: number; sprite: string; }
interface PlayerData { id: string; x: number; y: number; name?: string; bodyColor: number; faceColor: number; hairColor: number; }
interface ChatData { type: 'chat'; message: string; id: string; }
interface OtherPlayer { body: Phaser.GameObjects.Sprite; face: Phaser.GameObjects.Sprite; hair: Phaser.GameObjects.Sprite; nameTag: Phaser.GameObjects.Text; gridX: number; gridY: number; bodyColor: number; faceColor: number; hairColor: number; }

class MainScene extends Phaser.Scene {
    // --- Referencias ---
    private playerBody!: Phaser.Physics.Arcade.Sprite; 
    private playerFace!: Phaser.GameObjects.Sprite;
    private playerHair!: Phaser.GameObjects.Sprite;
    private playerNameTag!: Phaser.GameObjects.Text;
    private pet!: Phaser.Physics.Arcade.Sprite;
    private sky!: Phaser.GameObjects.TileSprite;
    
    // --- Estado del Jugador ---
    private playerGridX: number = 0; 
    private playerGridY: number = 0;
    private playerName: string = "Player";
    private bodyColor: number = 0xffffff; 
    private faceColor: number = 0xffffff; 
    private hairColor: number = 0xffffff;

    // --- Estado del Mapa ---
    private mapData!: MapData; 
    private currentZoneKey: string = 'default';
    private obstacles: Set<string> = new Set(); 
    private terrainGroup!: Phaser.GameObjects.Group;
    private npcGroup!: Phaser.GameObjects.Group;
    private propsGroup!: Phaser.GameObjects.Group;
    private gridGraphics!: Phaser.GameObjects.Graphics; 
    private highlightGraphics!: Phaser.GameObjects.Graphics;
    
    // --- Multiplayer & UI ---
    private supabaseClient!: SupabaseClient; 
    private myPlayerId!: string;
    private otherPlayers: Map<string, OtherPlayer> = new Map();
    private channel!: RealtimeChannel;
    private chatBubbles: Map<string, Phaser.GameObjects.Container> = new Map();
    private chatListener: ((e: any) => void) | null = null;

    // Offsets calculados dinámicamente
    private offsetRow: number = 0;
    private offsetCol: number = 0;

    constructor(config?: Phaser.Types.Scenes.SettingsConfig & {
        supabaseClient?: SupabaseClient; playerId?: string; playerName?: string; 
        bodyColor?: number; faceColor?: number; hairColor?: number; 
        initialX?: number; initialY?: number;
        currentZone?: string;
    }) {
        super({ key: 'MainScene', ...config });
        if (config?.supabaseClient) this.supabaseClient = config.supabaseClient;
        if (config?.playerId) this.myPlayerId = config.playerId;
        if (config?.currentZone) this.currentZoneKey = config.currentZone;
        
        if (config?.playerName) this.playerName = config.playerName;
        if (config?.bodyColor !== undefined) this.bodyColor = config.bodyColor;
        if (config?.faceColor !== undefined) this.faceColor = config.faceColor;
        if (config?.hairColor !== undefined) this.hairColor = config.hairColor;
        if (config?.initialX !== undefined) this.playerGridX = config.initialX;
        if (config?.initialY !== undefined) this.playerGridY = config.initialY;
    }

    init(data: any): void {
        console.log("INIT SCENE con datos:", data);
        if (data.currentZone) this.currentZoneKey = data.currentZone;
        if (data.playerId) this.myPlayerId = data.playerId;
        if (data.playerName) this.playerName = data.playerName;
        if (data.bodyColor !== undefined) this.bodyColor = data.bodyColor;
        if (data.faceColor !== undefined) this.faceColor = data.faceColor;
        if (data.hairColor !== undefined) this.hairColor = data.hairColor;
        if (data.initialX !== undefined) this.playerGridX = data.initialX;
        if (data.initialY !== undefined) this.playerGridY = data.initialY;
        
        this.obstacles = new Set();
        this.otherPlayers = new Map(); 
    }

    preload(): void {
        this.load.spritesheet('body', '/body.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('face', '/face.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('hair', '/hair.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('npc_ray_z', '/Profesor_Ray_Z.png', { frameWidth: 32, frameHeight: 32 });
        
        this.load.image('pet-seed', '/spirit-seed.png'); 
        this.load.image('tree', '/tree.png');
        this.load.image('rock', '/rock.png'); 
        this.load.image('sky', '/sky.png'); 
        this.load.image('cloud_cliff', '/cloud_cliff.png'); 
        this.load.image('sheet', '/sheet.png');

        this.load.image('block_grass', '/block_grass.png'); 
        this.load.image('block_dirt', '/block_dirt.png'); 
        this.load.image('block_water', '/block_water.png'); 

        const mapFile = ZONE_MAPS[this.currentZoneKey] || ZONE_MAPS['default'];
        const uniqueKey = `levelData_${this.currentZoneKey}`; 
        
        console.log(`[GameCanvas] Preloading map: ${mapFile} as ${uniqueKey}`);
        this.load.json(uniqueKey, mapFile);
    }

    create(): void {
        const uniqueKey = `levelData_${this.currentZoneKey}`;
        this.mapData = this.cache.json.get(uniqueKey);

        if (!this.mapData) { 
            console.error(`FATAL: No se encontraron datos para la clave '${uniqueKey}'. Intentando fallback a default...`);
            this.mapData = this.cache.json.get('levelData_default');
            if (!this.mapData) {
                 const keys = this.cache.json.getKeys();
                 if (keys.length > 0) this.mapData = this.cache.json.get(keys[0]);
            }
            if (!this.mapData) return;
        }

        this.offsetRow = Math.floor(this.mapData.height / 2);
        this.offsetCol = Math.floor(this.mapData.width / 2);

        this.cameras.main.setZoom(1); 
        this.sky = this.add.tileSprite(0, 0, 4000, 4000, 'sky').setDepth(-9999).setScrollFactor(0.1).setAlpha(1); 
        
        this.createTerrain();
        this.createNPCs(); 
        this.createProps(); 

        this.gridGraphics = this.add.graphics().setDepth(-50); 
        this.highlightGraphics = this.add.graphics().setDepth(99999); 

        const { x: playerX, y: playerY } = this.gridToIso(this.playerGridX, this.playerGridY);
        
        let startZ = 0;
        const hLayer = this.mapData.layers.find(l => l.name === 'height');
        if (hLayer) {
            const r = this.playerGridY + this.offsetRow;
            const c = this.playerGridX + this.offsetCol;
            if (hLayer.data[r] && hLayer.data[r][c]) startZ = hLayer.data[r][c];
        }
        const startY = playerY - BLOCK_OFFSET - (startZ * 16);

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
        
        // 👇 DETECCIÓN DE CLIC ACTUALIZADA (Usa el detector de altura)
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const hit = this.getGridCursor(pointer.worldX, pointer.worldY);
            if (hit) {
                this.handlePlayerInput(hit.x, hit.y);
            }
        });

        this.chatListener = (e: any) => { this.sendChat(e.detail); };
        window.addEventListener('PHASER_CHAT_EVENT', this.chatListener);
        
        this.setupRealtime(); 
        this.scale.on('resize', this.resize, this);
        
        this.pet = this.physics.add.sprite(this.playerBody.x - 50, this.playerBody.y, 'pet-seed'); 
        if (this.pet.body) this.pet.body.setSize(16, 16);
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

    // 👇 LA JOYA DE LA CORONA: DETECCIÓN DE COLISIÓN ISOMÉTRICA CON ALTURA
    private getGridCursor(worldX: number, worldY: number): { x: number, y: number } | null {
        if (!this.mapData) return null;

        const groundLayer = this.mapData.layers.find(l => l.name === 'ground');
        const heightLayer = this.mapData.layers.find(l => l.name === 'height');
        
        let bestCandidate = null;
        let maxDepth = -99999;

        // Recorremos todos los bloques renderizados para ver cuál toca el mouse
        // (En un mapa gigante esto se optimizaría, pero para <50x50 es instantáneo)
        for (let row = 0; row < this.mapData.height; row++) {
            for (let col = 0; col < this.mapData.width; col++) {
                const tileType = groundLayer?.data[row][col] || 0;
                if (tileType === 0) continue; // Si es vacío, no detectamos clic

                const tileHeight = (heightLayer?.data[row] && heightLayer.data[row][col]) || 0;
                
                const gridX = col - this.offsetCol;
                const gridY = row - this.offsetRow;
                
                const iso = this.gridToIso(gridX, gridY);
                
                // Calculamos dónde está visualmente la cara SUPERIOR del bloque
                const visualY = iso.y - BLOCK_OFFSET - (tileHeight * 16);
                const visualX = iso.x;

                // Chequeo matemático: ¿Está el mouse dentro del rombo en (visualX, visualY)?
                // Distancia Manhattan normalizada para un rombo de 64x32
                const dx = Math.abs(worldX - visualX);
                const dy = Math.abs(worldY - visualY);
                
                // La fórmula del rombo: (dx / ancho_medio) + (dy / alto_medio) <= 1
                if ((dx / (TILE_WIDTH / 2)) + (dy / (TILE_HEIGHT / 2)) <= 1) {
                    
                    // Si el mouse toca varios bloques (porque se solapan en 2D),
                    // elegimos el que esté visualmente más "al frente" (mayor Z)
                    // Z visual aproximado = row + col + altura
                    const depth = row + col + tileHeight;
                    
                    if (depth > maxDepth) {
                        maxDepth = depth;
                        bestCandidate = { x: gridX, y: gridY };
                    }
                }
            }
        }
        return bestCandidate;
    }

    private isValidTile(gridX: number, gridY: number): boolean {
        if (!this.mapData) return false;
        const row = gridY + this.offsetRow; 
        const col = gridX + this.offsetCol; 
        if (row < 0 || row >= this.mapData.height || col < 0 || col >= this.mapData.width) return false;
        const tileType = this.mapData.layers[0].data[row][col];
        return tileType === 1 || tileType === 2;
    }

    private createTerrain(): void {
        this.terrainGroup = this.add.group();
        const groundLayer = this.mapData.layers.find(l => l.name === 'ground');
        const heightLayer = this.mapData.layers.find(l => l.name === 'height');
        
        if (!groundLayer) return;

        const groundData = groundLayer.data;
        const heightData = heightLayer ? heightLayer.data : Array(this.mapData.height).fill(0).map(() => Array(this.mapData.width).fill(0));
        const eventData = this.mapData.objects.events || [];

        for (let row = 0; row < this.mapData.height; row++) {
            for (let col = 0; col < this.mapData.width; col++) {
                const tileType = groundData[row][col];
                const tileHeight = heightData[row][col] || 0; 
                if (tileType === 0) continue;

                const gridX = col - this.offsetCol; 
                const gridY = row - this.offsetRow; 
                const { x, y } = this.gridToIso(gridX, gridY);

                for (let h = 0; h <= tileHeight; h++) {
                    let textureKey = 'block_dirt'; 
                    if (h === tileHeight) {
                        if (tileType === 1) textureKey = 'block_grass';
                        else if (tileType === 2) textureKey = 'block_dirt';
                        else if (tileType === 3) textureKey = 'block_water';
                    }
                    const elevationOffset = h * 16; 
                    const block = this.add.sprite(x, y - elevationOffset, textureKey);
                    block.setOrigin(0.5, 1); 
                    block.y += 16; 
                    block.setDepth(-1000 + row + col + h); 
                    if (h < tileHeight) block.setTint(0xcccccc);
                    this.terrainGroup.add(block);
                }

                if (tileType === 1 || tileType === 2) {
                    const currentElevationY = y - (tileHeight * 16);
                    const isNpcHere = this.mapData.objects.npcs.some(n => n.x === gridX && n.y === gridY);
                    const isPropHere = this.mapData.objects.props.some(p => p.x === gridX && p.y === gridY);
                    const isEventHere = eventData.some(e => e.x === gridX && e.y === gridY);

                    if (!((gridX === 0 && gridY === 0) || isEventHere || isNpcHere || isPropHere)) {
                        const chance = Math.random(); 
                        if (chance > 0.97) { 
                            const tree = this.add.sprite(x, currentElevationY - BLOCK_OFFSET + 20, 'tree').setOrigin(0.5, 0.9).setDepth(currentElevationY); 
                            this.obstacles.add(`${gridX},${gridY}`); 
                        } else if (chance > 0.94) { 
                            const rock = this.add.sprite(x, currentElevationY - BLOCK_OFFSET, 'rock').setOrigin(0.5, 0.8).setDepth(currentElevationY); 
                            this.obstacles.add(`${gridX},${gridY}`); 
                        }
                    }
                }
                
                if (tileType !== 3 && tileHeight === 0) {
                     const neighborSouthWest = (row + 1 < this.mapData.height) ? groundData[row + 1][col] : 0; 
                     const neighborSouthEast = (col + 1 < this.mapData.width) ? groundData[row][col + 1] : 0;
                     if (neighborSouthWest === 0 || neighborSouthEast === 0) { 
                        const cliff = this.add.sprite(x, y + 16, 'cloud_cliff').setOrigin(0.5, 0).setDepth(-3000).setAlpha(0.9); 
                        this.terrainGroup.add(cliff); 
                     }
                }
            }
        }
        
        eventData.forEach(event => {
            if (event.type === 'math-tree') {
                const { x: tX, y: tY } = this.gridToIso(event.x, event.y);
                this.add.sprite(tX, tY - BLOCK_OFFSET + 20, 'tree').setOrigin(0.5, 0.9).setDepth(tY);
                this.obstacles.add(`${event.x},${event.y}`);
            }
        });
    }

    private createNPCs(): void {
        this.npcGroup = this.add.group();
        this.mapData.objects.npcs.forEach(npc => {
            const { x, y } = this.gridToIso(npc.x, npc.y); 
            let targetZ = 0;
            const hLayer = this.mapData.layers.find(l => l.name === 'height');
            if (hLayer) {
                const r = npc.y + this.offsetRow;
                const c = npc.x + this.offsetCol;
                if (hLayer.data[r] && hLayer.data[r][c]) targetZ = hLayer.data[r][c];
            }
            const drawY = y - BLOCK_OFFSET - (targetZ * 16);
            const npcSprite = this.add.sprite(x, drawY + 8, npc.sprite); 
            npcSprite.setOrigin(0.5, 0.8).setDepth(drawY).setScale(1.5); 
            const nameTag = this.add.text(x, drawY - 60, npc.name, { fontSize: '12px', color: '#ffd700', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 3, align: 'center' }).setOrigin(0.5).setDepth(drawY + 2000); 
            this.obstacles.add(`${npc.x},${npc.y}`);
        });
    }

    private createProps(): void {
        this.propsGroup = this.add.group();
        this.mapData.objects.props.forEach(prop => {
            if (this.isValidTile(prop.x, prop.y)) {
                const { x, y } = this.gridToIso(prop.x, prop.y);
                let targetZ = 0;
                const hLayer = this.mapData.layers.find(l => l.name === 'height');
                if (hLayer) {
                    const r = prop.y + this.offsetRow;
                    const c = prop.x + this.offsetCol;
                    if (hLayer.data[r] && hLayer.data[r][c]) targetZ = hLayer.data[r][c];
                }
                const drawY = y - BLOCK_OFFSET - (targetZ * 16);
                const sprite = this.add.sprite(x, drawY + 10, prop.sprite);
                sprite.setOrigin(0.5, 0.8).setDepth(drawY);
                const label = this.add.text(x, drawY - 40, prop.name, { fontSize: '10px', color: '#aeea00', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 3, align: 'center' }).setOrigin(0.5).setDepth(drawY + 2000);
                this.obstacles.add(`${prop.x},${prop.y}`); 
                this.propsGroup.add(sprite);
            }
        });
    }

    private handlePlayerInput(gridX: number, gridY: number): void {
        if (!this.isValidTile(gridX, gridY)) return;
        const onInteract = this.registry.get('onInteract');

        const targetNPC = this.mapData.objects.npcs.find(n => n.x === gridX && n.y === gridY);
        if (targetNPC) {
            const bestTile = this.getNearestValidNeighbor(gridX, gridY);
            if (bestTile) { this.movePlayerToGrid(bestTile.x, bestTile.y, () => { if (onInteract) onInteract({ type: 'npc-dialog', id: targetNPC.dialogueId }); }); }
            return;
        }

        const targetProp = this.mapData.objects.props.find(p => p.x === gridX && p.y === gridY);
        if (targetProp) {
            const bestTile = this.getNearestValidNeighbor(gridX, gridY);
            if (bestTile) { this.movePlayerToGrid(bestTile.x, bestTile.y, () => { if (onInteract) onInteract({ type: 'open-tool', id: targetProp.toolId }); }); }
            return;
        }

        const targetEvent = (this.mapData.objects.events || []).find(e => e.x === gridX && e.y === gridY);
        if (targetEvent) {
             const bestTile = this.getNearestValidNeighbor(gridX, gridY);
             if (bestTile) { this.movePlayerToGrid(bestTile.x, bestTile.y, () => { if (onInteract) onInteract({ type: 'math-challenge', id: '1' }); }); }
             return;
        }

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
        const { x, y } = this.gridToIso(gridX, gridY); 
        
        let targetZ = 0;
        const heightLayer = this.mapData.layers.find(l => l.name === 'height');
        if (heightLayer) {
            const row = gridY + this.offsetRow;
            const col = gridX + this.offsetCol;
            if (heightLayer.data[row] && heightLayer.data[row][col]) {
                targetZ = heightLayer.data[row][col];
            }
        }
        
        const targetY = y - BLOCK_OFFSET - (targetZ * 16);
        
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
    
    resize(gameSize: Phaser.Structs.Size): void { if (this.playerBody) { this.cameras.main.centerOn(this.playerBody.x, this.playerBody.y); } }
    
    public changeEnvironment(zoneName: string) { 
        this.terrainGroup.setTint(ZONE_TINTS[zoneName] || 0xffffff); 
    }

    update(): void {
        if (!this.playerBody || !this.mapData) return;

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

        const pointer = this.input.activePointer; 
        
        // 👇 USO DE LA NUEVA DETECCIÓN PARA EL CURSOR AMARILLO
        const hit = this.getGridCursor(pointer.worldX, pointer.worldY);
        
        this.highlightGraphics.clear();
        if (hit && this.isValidTile(hit.x, hit.y)) {
            const isNpc = this.mapData.objects.npcs.some(n => n.x === hit!.x && n.y === hit!.y);
            const isProp = this.mapData.objects.props.some(p => p.x === hit!.x && p.y === hit!.y);
            const isEvent = (this.mapData.objects.events || []).some(e => e.x === hit!.x && e.y === hit!.y);
            const isObstacle = this.obstacles.has(`${hit.x},${hit.y}`);
            
            let cursorColor = 0xffff00; 
            if (isNpc) cursorColor = 0x0000ff; 
            else if (isEvent) cursorColor = 0x00ffff;
            else if (isProp) cursorColor = 0xff00ff; 
            else if (isObstacle) cursorColor = 0xff0000; 
            
            // Calculamos altura para dibujar el rombo en el lugar correcto
            let tileHeight = 0;
            const hLayer = this.mapData.layers.find(l => l.name === 'height');
            if (hLayer) {
                const r = hit.y + this.offsetRow;
                const c = hit.x + this.offsetCol;
                if (hLayer.data[r] && hLayer.data[r][c]) tileHeight = hLayer.data[r][c];
            }

            const iso = this.gridToIso(hit.x, hit.y); 
            const drawY = iso.y - BLOCK_OFFSET - (tileHeight * 16);

            const points = [ { x: iso.x, y: drawY - TILE_HEIGHT / 2 }, { x: iso.x + TILE_WIDTH / 2, y: drawY }, { x: iso.x, y: drawY + TILE_HEIGHT / 2 }, { x: iso.x - TILE_WIDTH / 2, y: drawY } ];
            this.highlightGraphics.lineStyle(3, cursorColor, 0.8); this.highlightGraphics.strokePoints(points, true, true);
        }
    }
    
    shutdown(): void { if (this.channel) this.channel.unsubscribe(); if (this.chatListener) window.removeEventListener('PHASER_CHAT_EVENT', this.chatListener); this.otherPlayers.clear(); this.chatBubbles.clear(); }
}

export default function GameCanvas({ onInteract, currentZone, playerName = "Player", bodyColor = 0xffffff, faceColor = 0xffffff, hairColor = 0xffffff, initialX = 0, initialY = 0, onMove }: any) {
    const gameRef = useRef<Phaser.Game | null>(null); const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => { 
        if (typeof window === 'undefined') return; 
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 
        if (!supabaseUrl || !supabaseAnonKey) return; 
        const client = createClient(supabaseUrl, supabaseAnonKey); 
        const playerId = `player-${Math.random().toString(36).substring(2, 9)}`;
        
        const config: Phaser.Types.Core.GameConfig = { 
            type: Phaser.AUTO, width: window.innerWidth, height: window.innerHeight, parent: containerRef.current || undefined, 
            scene: new MainScene({ 
                key: 'MainScene', supabaseClient: client, playerId, playerName, bodyColor, faceColor, hairColor, initialX, initialY,
                currentZone 
            }), 
            physics: { default: 'arcade', arcade: { debug: false } }, backgroundColor: '#62a6d4', scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH } 
        };
        gameRef.current = new Phaser.Game(config); 
        gameRef.current.registry.set('onInteract', onInteract); 
        gameRef.current.registry.set('onMove', onMove); 
        return () => { gameRef.current?.destroy(true); }; 
    }, []); 

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
        if (gameRef.current && currentZone) { 
            const scene = gameRef.current.scene.getScene('MainScene') as MainScene; 
            if (scene) { 
                scene.scene.restart({ 
                    currentZone: currentZone,
                    playerId: scene['myPlayerId'], 
                    playerName: playerName,
                    bodyColor: bodyColor,
                    faceColor: faceColor,
                    hairColor: hairColor,
                    initialX: initialX, 
                    initialY: initialY
                });
            } 
        } 
    }, [currentZone, initialX, initialY]); 

    return <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#62a6d4' }} />;
}
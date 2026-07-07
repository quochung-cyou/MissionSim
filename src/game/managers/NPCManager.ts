import { AssetKeys } from '../constants/AssetKeys';
import { LevelConfig } from '../config/LevelConfig';
import { NPC } from '../entities/NPC';

export interface NPCSpawnPoint {
    x: number;
    y: number;
    idle: string;
    walk: string;
    run: string;
}

export class NPCManager {
    private readonly npcs: NPC[] = [];
    private readonly scientistSets: NPCSpawnPoint[] = [
        { x: 300, y: 200, idle: AssetKeys.Scientists.Scientist1Idle, walk: AssetKeys.Scientists.Scientist1Walk, run: AssetKeys.Scientists.Scientist1Run },
        { x: 900, y: 200, idle: AssetKeys.Scientists.Scientist2Idle, walk: AssetKeys.Scientists.Scientist2Walk, run: AssetKeys.Scientists.Scientist2Run },
        { x: 1500, y: 200, idle: AssetKeys.Scientists.Scientist3Idle, walk: AssetKeys.Scientists.Scientist3Walk, run: AssetKeys.Scientists.Scientist3Run }
    ];

    private selectedIndex = 0;
    private runMode = false;
    private wanderEnabled = false;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly groundLayer: Phaser.Tilemaps.TilemapLayerBase,
        private readonly levelConfig: LevelConfig
    ) {}

    spawn (): void {
        const count = this.levelConfig.npcCount;
        for (let i = 0; i < count; i++) {
            const set = this.scientistSets[i % this.scientistSets.length];
            const spacing = 80;
            const x = set.x + Math.floor(i / this.scientistSets.length) * spacing;
            const npc = new NPC(this.scene, x, set.y, set.idle, set.walk, set.run);
            this.scene.physics.add.collider(npc, this.groundLayer);
            npc.start();
            npc.setWander(this.wanderEnabled);
            this.npcs.push(npc);
        }
        this.select(0);
    }

    update (time: number, delta: number): void {
        this.npcs.forEach(npc => npc.update(time, delta));
    }

    select (index: number): void {
        this.npcs.forEach((npc, i) => {
            npc.selected = i === index;
        });
        this.selectedIndex = index;
    }

    commandTo (targetX: number): void {
        const npc = this.selectedNpc;
        if (npc) {
            npc.goTo(targetX, this.runMode);
        }
    }

    toggleWander (): boolean {
        this.wanderEnabled = !this.wanderEnabled;
        this.npcs.forEach(npc => npc.setWander(this.wanderEnabled));
        return this.wanderEnabled;
    }

    setWander (enabled: boolean): void {
        this.wanderEnabled = enabled;
        this.npcs.forEach(npc => npc.setWander(this.wanderEnabled));
    }

    toggleRunMode (): boolean {
        this.runMode = !this.runMode;
        return this.runMode;
    }

    get selectedNpc (): NPC | undefined {
        return this.npcs[this.selectedIndex];
    }

    get selectedNpcIndex (): number {
        return this.selectedIndex;
    }

    get npcCount (): number {
        return this.npcs.length;
    }

    get isRunModeEnabled (): boolean {
        return this.runMode;
    }

    get isWanderEnabled (): boolean {
        return this.wanderEnabled;
    }
}

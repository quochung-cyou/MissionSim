import { AssetKeys } from '../constants/AssetKeys';
import { LevelConfig, NPCType } from '../config/LevelConfig';
import { NPC } from '../entities/NPC';

export interface NPCSpawnPoint {
    x: number;
    y: number;
    idle: string;
    walk: string;
    run: string;
    special: string;
}

interface NPCEntry {
    npc: NPC;
    type: NPCType;
}

const SCIENTIST_SETS: Record<number, NPCSpawnPoint> = {
    1: { x: 300, y: 320, idle: AssetKeys.Scientists.Scientist1Idle, walk: AssetKeys.Scientists.Scientist1Walk, run: AssetKeys.Scientists.Scientist1Run, special: AssetKeys.Scientists.Scientist1Special },
    2: { x: 900, y: 320, idle: AssetKeys.Scientists.Scientist2Idle, walk: AssetKeys.Scientists.Scientist2Walk, run: AssetKeys.Scientists.Scientist2Run, special: AssetKeys.Scientists.Scientist2Special },
    3: { x: 1500, y: 320, idle: AssetKeys.Scientists.Scientist3Idle, walk: AssetKeys.Scientists.Scientist3Walk, run: AssetKeys.Scientists.Scientist3Run, special: AssetKeys.Scientists.Scientist3Special }
};

export class NPCManager {
    private readonly npcs: NPCEntry[] = [];

    private selectedIndex = 0;
    private runMode = false;
    private wanderEnabled = false;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly groundLayer: Phaser.Tilemaps.TilemapLayerBase,
        private readonly levelConfig: LevelConfig
    ) {}

    spawn (): void {
        const types = this.levelConfig.npcTypes;
        let npcIndex = 0;

        const worldWidth = this.scene.physics.world.bounds.width;
        const margin = 100;

        for (const typeConfig of types) {
            const set = SCIENTIST_SETS[typeConfig.scientistSet];
            for (let i = 0; i < typeConfig.count; i++) {
                const x = margin + Math.random() * (worldWidth - margin * 2);
                const specialKey = typeConfig.scientistSet === 2 ? undefined : set.special;
                const npc = new NPC(this.scene, x, set.y, set.idle, set.walk, set.run, undefined, specialKey);
                this.scene.physics.add.collider(npc, this.groundLayer);
                npc.start();
                npc.setWander(this.wanderEnabled);
                this.npcs.push({ npc, type: typeConfig.type });
                npcIndex++;
            }
        }
        if (this.npcs.length > 0) {
            this.select(0);
        }
    }

    update (time: number, delta: number): void {
        this.npcs.forEach(entry => entry.npc.update(time, delta));
    }

    select (index: number): void {
        this.npcs.forEach((entry, i) => {
            entry.npc.selected = i === index;
        });
        this.selectedIndex = index;
    }

    commandTo (targetX: number): void {
        const entry = this.npcs[this.selectedIndex];
        if (entry) {
            entry.npc.goTo(targetX, this.runMode);
        }
    }

    toggleWander (): boolean {
        this.wanderEnabled = !this.wanderEnabled;
        this.npcs.forEach(entry => entry.npc.setWander(this.wanderEnabled));
        return this.wanderEnabled;
    }

    setWander (enabled: boolean): void {
        this.wanderEnabled = enabled;
        this.npcs.forEach(entry => entry.npc.setWander(this.wanderEnabled));
    }

    toggleRunMode (): boolean {
        this.runMode = !this.runMode;
        return this.runMode;
    }

    get selectedNpc (): NPC | undefined {
        return this.npcs[this.selectedIndex]?.npc;
    }

    get selectedNpcIndex (): number {
        return this.selectedIndex;
    }

    get selectedNpcType (): NPCType | undefined {
        return this.npcs[this.selectedIndex]?.type;
    }

    get npcCount (): number {
        return this.npcs.length;
    }

    getNpcType (index: number): NPCType | undefined {
        return this.npcs[index]?.type;
    }

    get isRunModeEnabled (): boolean {
        return this.runMode;
    }

    get isWanderEnabled (): boolean {
        return this.wanderEnabled;
    }

    getNpc (index: number): NPC | undefined {
        return this.npcs[index]?.npc;
    }

    getBindings (): { npc: NPC; scientistSet: 1 | 2 | 3 }[] {
        const bindings: { npc: NPC; scientistSet: 1 | 2 | 3 }[] = [];
        let idx = 0;
        for (const typeConfig of this.levelConfig.npcTypes) {
            for (let i = 0; i < typeConfig.count; i++) {
                const entry = this.npcs[idx];
                if (entry) {
                    bindings.push({ npc: entry.npc, scientistSet: typeConfig.scientistSet });
                }
                idx++;
            }
        }
        return bindings;
    }
}

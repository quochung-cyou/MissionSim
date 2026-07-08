import { AssetKeys } from '../constants/AssetKeys';

export type NPCType = 'engineer' | 'captain' | 'scientist';

export interface NPCTypeConfig {
    type: NPCType;
    count: number;
    min: number;
    max: number;
    scientistSet: 1 | 2 | 3;
}

export interface MachinePositionsConfig {
    crane: number;
    coolantPump: number;
    oxygenGenerator: number;
    reactor: number;
    terminal: number;
    oilReserve: number;
}

export interface ReactorConfig {
    fuelConsumptionRate: number;
    heatGenerationRate: number;
    powerOutput: number;
    maxHeat: number;
    baseHeat: number;
}

export interface OxygenGeneratorConfig {
    nativeDrainRate: number;
    oxygenPerPower: number;
    maxPower: number;
}

export interface CoolantPumpConfig {
    coolingPerPower: number;
    maxPower: number;
}

export interface CraneConfig {
    powerRequired: number;
    progressRate: number;
    maxPower: number;
}

export interface NpcConfig {
    walkSpeed: number;
    runSpeed: number;
    maxEnergy: number;
    runDrainPerSecond: number;
    energyRegenPerSecond: number;
}

export interface FailureConfig {
    pipeRuptureHeatThreshold: number;
    pipeRuptureDurationSeconds: number;
    pipeRuptureOilDrain: number;
    repairTimeSeconds: number;
    breakerTripCount: number;
    breakerTripWindowSeconds: number;
    resetTimeSeconds: number;
}

export interface MachineConfig {
    positions: MachinePositionsConfig;
    reactor: ReactorConfig;
    oxygenGenerator: OxygenGeneratorConfig;
    coolantPump: CoolantPumpConfig;
    crane: CraneConfig;
    npc: NpcConfig;
    failures: FailureConfig;
}

export interface LevelConfig {
    levelId: number;
    scenarioName: string;
    description: string;
    mapKey: string;
    thumbnailKey: string;
    npcCount: number;
    maxNpcs: number;
    minNpcs: number;
    timeLimit: number;
    musicKey: string;
    basePower: number;
    oilLevel: number;
    maxOilLevel: number;
    machineHeat: number;
    globalOxygen: number;
    npcTypes: NPCTypeConfig[];
    machineConfig: MachineConfig;
}

export const DefaultLevels: LevelConfig[] = [
    {
        levelId: 1,
        scenarioName: 'Cascading Pressure',
        description: 'Control the facility team as pressure builds across multiple systems.',
        mapKey: 'level1',
        thumbnailKey: AssetKeys.Images.Level1Thumb,
        npcCount: 3,
        maxNpcs: 6,
        minNpcs: 1,
        timeLimit: 1200,
        musicKey: AssetKeys.Audio.Level1Loop,
        basePower: 100,
        oilLevel: 5000,
        maxOilLevel: 5000,
        machineHeat: 40,
        globalOxygen: 100,
        npcTypes: [
            { type: 'engineer', count: 1, min: 0, max: 3, scientistSet: 1 },
            { type: 'captain', count: 1, min: 1, max: 1, scientistSet: 2 },
            { type: 'scientist', count: 1, min: 0, max: 3, scientistSet: 3 }
        ],
        machineConfig: {
            positions: {
                crane: 200,
                coolantPump: 600,
                oxygenGenerator: 1000,
                reactor: 1400,
                terminal: 1800,
                oilReserve: 2300,
            },
            reactor: {
                fuelConsumptionRate: 10,
                heatGenerationRate: 20,
                powerOutput: 100,
                maxHeat: 10000,
                baseHeat: 40,
            },
            oxygenGenerator: {
                nativeDrainRate: 1.0,
                oxygenPerPower: 0.05,
                maxPower: 100,
            },
            coolantPump: {
                coolingPerPower: 0.5,
                maxPower: 100,
            },
            crane: {
                powerRequired: 60,
                progressRate: 0.5,
                maxPower: 100,
            },
            npc: {
                walkSpeed: 60,
                runSpeed: 150,
                maxEnergy: 200,
                runDrainPerSecond: 30,
                energyRegenPerSecond: 15,
            },
            failures: {
                pipeRuptureHeatThreshold: 500,
                pipeRuptureDurationSeconds: 5,
                pipeRuptureOilDrain: 50,
                repairTimeSeconds: 10,
                breakerTripCount: 3,
                breakerTripWindowSeconds: 10,
                resetTimeSeconds: 3,
            },
        },
    },
];

export function getDefaultLevelConfig (levelId: number): LevelConfig {
    const level = DefaultLevels.find(l => l.levelId === levelId);
    if (!level) {
        throw new Error(`Level ${levelId} not found`);
    }
    return {
        ...level,
        npcTypes: level.npcTypes.map(t => ({ ...t })),
        machineConfig: {
            ...level.machineConfig,
            positions: { ...level.machineConfig.positions },
            reactor: { ...level.machineConfig.reactor },
            oxygenGenerator: { ...level.machineConfig.oxygenGenerator },
            coolantPump: { ...level.machineConfig.coolantPump },
            crane: { ...level.machineConfig.crane },
            npc: { ...level.machineConfig.npc },
            failures: { ...level.machineConfig.failures },
        }
    };
}

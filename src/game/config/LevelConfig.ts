import { AssetKeys } from '../constants/AssetKeys';

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
        timeLimit: 120,
        musicKey: AssetKeys.Audio.Level1Loop
    }
];

export function getDefaultLevelConfig (levelId: number): LevelConfig {
    const level = DefaultLevels.find(l => l.levelId === levelId);
    if (!level) {
        throw new Error(`Level ${levelId} not found`);
    }
    return { ...level };
}

import { AssetKeys } from '../constants/AssetKeys';

interface EnergyObjectConfig {
    key: string;
    x: number;
    y: number;
    scale: number;
    animated: boolean;
}

export class EnergyObjectManager {
    spawn (scene: Phaser.Scene): void {
        const groundY = 448;

        const energyObjects: EnergyObjectConfig[] = [
            { key: AssetKeys.EnergyObjects.Energy1, x: 200, y: groundY, scale: 1, animated: true },
            { key: AssetKeys.EnergyObjects.Energy2, x: 600, y: groundY, scale: 1, animated: true },
            { key: AssetKeys.EnergyObjects.Energy3, x: 1000, y: groundY, scale: 1, animated: true },
            { key: AssetKeys.EnergyObjects.Machine3, x: 1400, y: groundY, scale: 1, animated: false },
            { key: AssetKeys.EnergyObjects.Machine4, x: 1800, y: groundY, scale: 1, animated: false },
            { key: AssetKeys.EnergyObjects.OilReserve, x: 2300, y: groundY, scale: 0.8, animated: false }
        ];

        energyObjects.forEach(obj => {
            if (obj.animated) {
                scene.add.sprite(obj.x, obj.y, obj.key)
                    .setOrigin(0.5, 1)
                    .setDepth(5)
                    .setScale(obj.scale)
                    .play(obj.key);
            } else {
                scene.add.image(obj.x, obj.y, obj.key)
                    .setOrigin(0.5, 1)
                    .setDepth(5)
                    .setScale(obj.scale);
            }
        });
    }
}

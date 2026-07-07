import { Machine } from '../Machine';
import { ReactorMechanic } from '../../mechanics/ReactorMechanic';
import { IHeatTarget } from '../../mechanics/ITargets';
import { AssetKeys } from '../../constants/AssetKeys';
import { ReactorConfig } from '../../config/LevelConfig';

const HEAT_OFFSET_Y = -185;

export class Reactor extends Machine implements IHeatTarget {
    private readonly reactorMechanic: ReactorMechanic;
    private readonly heatText: Phaser.GameObjects.Text;

    constructor (scene: Phaser.Scene, groundY: number, x: number = 1400, config?: Partial<ReactorConfig>) {
        super(scene, x, groundY, 'Reactor', AssetKeys.EnergyObjects.Machine3, 1, false, 'Mach_3');

        this.reactorMechanic = new ReactorMechanic(config ? {
            fuelConsumptionRate: config.fuelConsumptionRate,
            heatGenerationRate: config.heatGenerationRate,
            powerOutput: config.powerOutput,
            maxHeat: config.maxHeat,
            baseHeat: config.baseHeat,
        } : undefined);
        this.mechanic = this.reactorMechanic;

        this.heatText = scene.add.text(x, groundY + HEAT_OFFSET_Y, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#ff6b6b',
            stroke: '#000000',
            strokeThickness: 3
        })
            .setOrigin(0.5)
            .setDepth(22);

        this.updateDisplay();
    }

    addHeat (amount: number): void {
        this.reactorMechanic.addHeat(amount);
    }

    getHeat (): number {
        return this.reactorMechanic.getHeat();
    }

    setHeat (value: number): void {
        this.reactorMechanic.setHeat(value);
    }

    getStatus (): 'ON' | 'OFF' {
        return this.reactorMechanic.getStatus();
    }

    getMaxHeat (): number {
        return this.reactorMechanic.getMaxHeat();
    }

    getReactorMechanic (): ReactorMechanic {
        return this.reactorMechanic;
    }

    updateDisplay (): void {
        const heat = Math.floor(this.reactorMechanic.getHeat());
        const status = this.reactorMechanic.getStatus();
        this.heatText.setText(`${status} | Heat: ${heat}°C`);

        if (heat > 500) {
            this.heatText.setColor('#ff4444');
        } else if (heat > 200) {
            this.heatText.setColor('#ffaa00');
        } else {
            this.heatText.setColor('#ff6b6b');
        }
    }
}

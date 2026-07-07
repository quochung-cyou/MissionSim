import { Machine } from '../Machine';
import { OxygenMechanic } from '../../mechanics/OxygenMechanic';
import { IPowerConsumer } from '../../mechanics/ITargets';
import { AssetKeys } from '../../constants/AssetKeys';

const INFO_OFFSET_Y = -185;

export class OxygenGenerator extends Machine implements IPowerConsumer {
    private powerAllocated = 0;
    private readonly maxPower: number;
    private lockedOut = false;
    private readonly infoText: Phaser.GameObjects.Text;

    constructor (scene: Phaser.Scene, groundY: number, maxPower: number = 40, x: number = 1000, oxygenPerPower: number = 0.05, nativeDrainRate: number = 1.0) {
        super(scene, x, groundY, 'Oxygen Gen', AssetKeys.EnergyObjects.Energy3, 1, true, 'Mach_2');

        this.maxPower = maxPower;
        this.mechanic = new OxygenMechanic(this, { oxygenEfficiency: oxygenPerPower, drainRate: nativeDrainRate });

        this.infoText = scene.add.text(x, groundY + INFO_OFFSET_Y, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#81c784',
            stroke: '#000000',
            strokeThickness: 3
        })
            .setOrigin(0.5)
            .setDepth(22);

        this.updateDisplay();
    }

    getPowerAllocated (): number {
        return this.powerAllocated;
    }

    setPowerAllocated (value: number): void {
        this.powerAllocated = Math.max(0, Math.min(this.maxPower, value));
    }

    getMaxPower (): number {
        return this.maxPower;
    }

    isLockedOut (): boolean {
        return this.lockedOut;
    }

    setLockedOut (value: boolean): void {
        this.lockedOut = value;
    }

    updateDisplay (): void {
        const mechanic = this.mechanic as OxygenMechanic;
        const output = mechanic.getOxygenOutput();
        this.infoText.setText(`Power: ${this.powerAllocated} | Oxygen: +${output.toFixed(2)}%/s`);
    }
}

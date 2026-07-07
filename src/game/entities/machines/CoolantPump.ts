import { Machine } from '../Machine';
import { CoolantMechanic } from '../../mechanics/CoolantMechanic';
import { IPowerConsumer, IHeatTarget } from '../../mechanics/ITargets';
import { AssetKeys } from '../../constants/AssetKeys';

const INFO_OFFSET_Y = -185;

export class CoolantPump extends Machine implements IPowerConsumer {
    private powerAllocated = 0;
    private readonly maxPower: number;
    private lockedOut = false;
    private readonly infoText: Phaser.GameObjects.Text;

    constructor (scene: Phaser.Scene, groundY: number, reactor: IHeatTarget, maxPower: number = 40, x: number = 600, coolingPerPower: number = 0.5) {
        super(scene, x, groundY, 'Coolant Pump', AssetKeys.EnergyObjects.Energy2, 1, true, 'Mach_1');

        this.maxPower = maxPower;
        this.mechanic = new CoolantMechanic(this, reactor, { coolingEfficiency: coolingPerPower });

        this.infoText = scene.add.text(x, groundY + INFO_OFFSET_Y, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#4fc3f7',
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

    resetBreaker (): void {
        this.lockedOut = false;
    }

    updateDisplay (): void {
        const mechanic = this.mechanic as CoolantMechanic;
        const cooling = this.lockedOut ? 0 : mechanic.getCoolingOutput();
        const prefix = this.lockedOut ? 'LOCKED | ' : '';
        this.infoText.setText(`${prefix}Power: ${this.powerAllocated} | Cool: ${cooling.toFixed(1)}`);
    }
}

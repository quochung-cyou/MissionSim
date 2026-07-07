import { Machine } from '../Machine';
import { PowerDistributionMechanic } from '../../mechanics/PowerDistributionMechanic';
import { IPowerConsumer } from '../../mechanics/ITargets';
import { AssetKeys } from '../../constants/AssetKeys';

const INFO_OFFSET_Y = -185;

export class SubSystemTerminal extends Machine {
    private readonly powerDist: PowerDistributionMechanic;
    private readonly infoText: Phaser.GameObjects.Text;

    constructor (scene: Phaser.Scene, groundY: number, x: number = 1800) {
        super(scene, x, groundY, 'Terminal', AssetKeys.EnergyObjects.Machine4, 1, false, 'Terminal');

        this.powerDist = new PowerDistributionMechanic();
        this.mechanic = this.powerDist;

        this.infoText = scene.add.text(x, groundY + INFO_OFFSET_Y, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#ce93d8',
            stroke: '#000000',
            strokeThickness: 3
        })
            .setOrigin(0.5)
            .setDepth(22);

        this.updateDisplay();
    }

    registerConsumer (consumer: IPowerConsumer, initialAllocation: number = 0): void {
        this.powerDist.register(consumer, initialAllocation);
    }

    allocate (index: number, amount: number): void {
        this.powerDist.allocate(index, amount);
    }

    getPowerDistribution (): PowerDistributionMechanic {
        return this.powerDist;
    }

    updateDisplay (): void {
        const allocations = this.powerDist.getAllocations();
        const total = allocations.reduce((sum, a) => sum + a, 0);
        this.infoText.setText(`Power Usage: ${total}`);
    }
}

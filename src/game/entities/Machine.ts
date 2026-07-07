import { IMechanic, MechanicContext } from '../mechanics/IMechanic';

const NAME_OFFSET_Y = -210;

export class Machine {
    protected mechanic?: IMechanic;
    protected readonly nameText: Phaser.GameObjects.Text;
    readonly machineId: string;

    constructor (
        scene: Phaser.Scene,
        protected readonly x: number,
        groundY: number,
        name: string,
        key: string,
        scale: number = 1,
        animated: boolean = false,
        machineId: string = ''
    ) {
        this.machineId = machineId;
        if (animated) {
            scene.add.sprite(x, groundY, key)
                .setOrigin(0.5, 1)
                .setDepth(5)
                .setScale(scale)
                .play(key);
        } else {
            scene.add.image(x, groundY, key)
                .setOrigin(0.5, 1)
                .setDepth(5)
                .setScale(scale);
        }

        this.nameText = scene.add.text(x, groundY + NAME_OFFSET_Y, name, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        })
            .setOrigin(0.5)
            .setDepth(22);
    }

    tick (deltaSeconds: number, ctx: MechanicContext): void {
        this.mechanic?.tick(deltaSeconds, ctx);
    }

    updateDisplay (): void {}

    getMechanic (): IMechanic | undefined {
        return this.mechanic;
    }

    getX (): number {
        return this.x;
    }
}

export class SquadSizePanel {
    private countText!: Phaser.GameObjects.Text;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly count: number,
        private readonly min: number,
        private readonly max: number,
        private readonly onChange: (newCount: number) => void
    ) {}

    create (x: number, y: number): void {
        this.scene.add.text(x, y - 35, 'SQUAD SIZE', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#90caf9'
        }).setOrigin(0.5).setDepth(10);

        const numberStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '28px',
            color: '#ffffff',
            padding: { top: 6, bottom: 6, left: 6, right: 6 }
        };
        this.countText = this.scene.add.text(x, y + 8, `${this.count}`, numberStyle)
            .setOrigin(0.5)
            .setDepth(10);

        this.createStepButton(x - 70, y + 8, '-', () => this.adjust(-1));
        this.createStepButton(x + 70, y + 8, '+', () => this.adjust(1));
    }

    setCount (count: number): void {
        this.countText.setText(`${count}`);
    }

    bumpUp (): void {
        this.adjust(1);
    }

    private adjust (delta: number): void {
        const current = parseInt(this.countText.text, 10);
        const newCount = current + delta;
        if (newCount < this.min || newCount > this.max) {
            return;
        }
        this.countText.setText(`${newCount}`);
        this.onChange(newCount);
    }

    private createStepButton (x: number, y: number, text: string, onClick: () => void): void {
        const size = 44;
        const bg = this.scene.add.rectangle(x, y, size, size, 0x263238)
            .setStrokeStyle(2, 0x4fc3f7)
            .setInteractive()
            .setDepth(10);

        const label = this.scene.add.text(x, y, text, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(11);

        this.addButtonHover([bg, label], 0x263238, 0x37474f);

        [bg, label].forEach(obj => {
            obj.on('pointerdown', onClick);
        });
    }

    private addButtonHover (objects: Phaser.GameObjects.GameObject[], idleColor: number, hoverColor: number): void {
        const rectangle = objects[0] as Phaser.GameObjects.Rectangle;
        objects.forEach(obj => {
            obj.on('pointerover', () => rectangle.setFillStyle(hoverColor));
            obj.on('pointerout', () => rectangle.setFillStyle(idleColor));
        });
    }
}

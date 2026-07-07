export class StartButton {
    constructor (private readonly scene: Phaser.Scene) {}

    create (x: number, y: number, onClick: () => void): void {
        const width = 220;
        const height = 54;
        const bg = this.scene.add.rectangle(x, y, width, height, 0x2e7d32)
            .setStrokeStyle(3, 0x66bb6a)
            .setInteractive()
            .setDepth(10);

        const label = this.scene.add.text(x, y, 'START MISSION', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(11);

        this.addButtonHover([bg, label], 0x2e7d32, 0x43a047);

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

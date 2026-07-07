import { LevelConfig } from '../../config/LevelConfig';

export class LevelCard {
    constructor (private readonly scene: Phaser.Scene) {}

    create (x: number, y: number, level: LevelConfig): void {
        const cardWidth = 520;
        const cardHeight = 210;

        // Card shadow
        this.scene.add.rectangle(x + 6, y + 6, cardWidth, cardHeight, 0x000000)
            .setAlpha(0.4)
            .setDepth(4);

        // Card background
        this.scene.add.rectangle(x, y, cardWidth, cardHeight, 0x1a1a2e)
            .setStrokeStyle(2, 0x4fc3f7)
            .setAlpha(0.92)
            .setDepth(5);

        // Thumbnail area
        const thumbX = x - 160;
        const thumbY = y;
        this.scene.add.rectangle(thumbX, thumbY, 210, 150, 0x0f0f1a)
            .setStrokeStyle(2, 0x4fc3f7)
            .setDepth(6);

        this.scene.add.image(thumbX, thumbY, level.thumbnailKey)
            .setDisplaySize(200, 140)
            .setDepth(7);

        // Level info
        this.scene.add.text(x + 120, y - 60, `LEVEL ${level.levelId}`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#90caf9'
        }).setOrigin(0.5).setDepth(8);

        this.scene.add.text(x + 120, y - 25, level.scenarioName, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '18px',
            color: '#ffca28'
        }).setOrigin(0.5).setDepth(8);

        this.scene.add.text(x + 120, y + 35, level.description, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#e0e0e0',
            align: 'center',
            lineSpacing: 4,
            wordWrap: { width: 240 }
        }).setOrigin(0.5).setDepth(8);
    }
}

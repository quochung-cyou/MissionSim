export class TitleComponent {
    constructor (private readonly scene: Phaser.Scene) {}

    create (x: number, y: number): void {
        // Shadow
        this.scene.add.text(x + 2, y + 2, 'MissionSim', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '42px',
            color: '#000000'
        }).setOrigin(0.5).setDepth(10);

        // Main title
        this.scene.add.text(x, y, 'MissionSim', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '42px',
            color: '#ffffff',
            stroke: '#1a237e',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(11);

        // Subtitle
        this.scene.add.text(x, y + 70, 'SELECT MISSION', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '16px',
            color: '#90caf9',
            letterSpacing: 2
        }).setOrigin(0.5).setDepth(10);
    }
}

export class PauseOverlay {
    private container: Phaser.GameObjects.Container;
    private isVisible = false;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly onResume: () => void,
        private readonly onQuit: () => void
    ) {
        this.create();
    }

    private create (): void {
        const gameWidth = this.scene.scale.width;
        const gameHeight = this.scene.scale.height;

        const dimBg = this.scene.add.rectangle(0, 0, gameWidth, gameHeight, 0x000000, 0.6)
            .setOrigin(0, 0)
            .setScrollFactor(0);

        const panelWidth = 300;
        const panelHeight = 200;

        const panel = this.scene.add.rectangle(
            gameWidth / 2, gameHeight / 2, panelWidth, panelHeight, 0x1a1a2e
        ).setStrokeStyle(3, 0x6c5ce7).setScrollFactor(0);

        const title = this.scene.add.text(gameWidth / 2, gameHeight / 2 - 60, 'PAUSED', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0);

        const resumeBtn = this.createButton('RESUME', gameWidth / 2, gameHeight / 2, 160, 36, 0x2e7d32, 0x43a047, () => {
            this.hide();
            this.onResume();
        });

        const quitBtn = this.createButton('QUIT TO MENU', gameWidth / 2, gameHeight / 2 + 50, 160, 36, 0xb71c1c, 0xd32f2f, () => {
            this.hide();
            this.onQuit();
        });

        this.container = this.scene.add.container(0, 0, [dimBg, panel, title, resumeBtn, quitBtn])
            .setDepth(1500)
            .setVisible(false);
    }

    show (): void {
        this.isVisible = true;
        this.container.setVisible(true);
    }

    hide (): void {
        this.isVisible = false;
        this.container.setVisible(false);
    }

    get visible (): boolean {
        return this.isVisible;
    }

    private createButton (
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        idleColor: number,
        hoverColor: number,
        onClick: () => void
    ): Phaser.GameObjects.Container {
        const bg = this.scene.add.rectangle(x, y, width, height, idleColor)
            .setStrokeStyle(2, 0xffffff)
            .setScrollFactor(0);

        const label = this.scene.add.text(x, y, text, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '11px',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0);

        [bg, label].forEach(obj => {
            obj.setInteractive();
            obj.on('pointerover', () => bg.setFillStyle(hoverColor));
            obj.on('pointerout', () => bg.setFillStyle(idleColor));
            obj.on('pointerdown', onClick);
        });

        return this.scene.add.container(0, 0, [bg, label]).setScrollFactor(0);
    }
}

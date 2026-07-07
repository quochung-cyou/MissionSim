export class HudManager {
    private timerText: Phaser.GameObjects.Text;
    private isPaused = false;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly onPause: () => void,
        private readonly onLeave: () => void
    ) {
        this.createUI();
    }

    private createUI (): void {
        const gameWidth = this.scene.scale.width;

        // Timer display (top-center)
        this.timerText = this.scene.add.text(gameWidth / 2, 20, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        })
            .setOrigin(0.5, 0)
            .setScrollFactor(0)
            .setDepth(200);

        // Pause button (top-right)
        this.createButton('PAUSE', gameWidth - 90, 16, 74, 30, 0x37474f, 0x546e7a, () => {
            if (!this.isPaused) {
                this.onPause();
            }
        });

        // Leave button (top-right, below pause)
        this.createButton('LEAVE', gameWidth - 90, 52, 74, 30, 0xb71c1c, 0xd32f2f, () => {
            this.onLeave();
        });
    }

    updateTimerDisplay (remainingMs: number): void {
        const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        this.timerText.setText(formatted);

        if (totalSeconds <= 10) {
            this.timerText.setColor('#ff4444');
        } else if (totalSeconds <= 30) {
            this.timerText.setColor('#ffaa00');
        } else {
            this.timerText.setColor('#ffffff');
        }
    }

    setPaused (paused: boolean): void {
        this.isPaused = paused;
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
    ): void {
        const bg = this.scene.add.rectangle(x + width / 2, y + height / 2, width, height, idleColor)
            .setStrokeStyle(2, 0xffffff)
            .setScrollFactor(0)
            .setDepth(200);

        const label = this.scene.add.text(x + width / 2, y + height / 2, text, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#ffffff'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(201);

        [bg, label].forEach(obj => {
            obj.setInteractive();
            obj.on('pointerover', () => bg.setFillStyle(hoverColor));
            obj.on('pointerout', () => bg.setFillStyle(idleColor));
            obj.on('pointerdown', onClick);
        });
    }
}

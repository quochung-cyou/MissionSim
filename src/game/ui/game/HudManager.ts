import { GameEventBus } from '../../events/GameEventBus';
import { GameEvents } from '../../events/GameEvents';

export class HudManager {
    private timerText: Phaser.GameObjects.Text;
    private basePowerText: Phaser.GameObjects.Text;
    private oxygenText: Phaser.GameObjects.Text;
    private statusText: Phaser.GameObjects.Text;
    private isPaused = false;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly onPause: () => void,
        private readonly onLeave: () => void,
        basePower: number = 100,
        oxygen: number = 100,
        bus?: GameEventBus
    ) {
        this.createUI(basePower, oxygen);

        if (bus) {
            bus.on(GameEvents.PowerChanged, (power: unknown) => {
                this.updateBasePower(power as number);
            });
            bus.on(GameEvents.OxygenChanged, (o2: unknown) => {
                this.updateOxygen(o2 as number);
            });
            bus.on(GameEvents.GameOver, (reason: unknown) => {
                this.showEndScreen(reason as string, false);
            });
            bus.on(GameEvents.GameWin, () => {
                this.showEndScreen('EXTRACTION COMPLETE', true);
            });
        }
    }

    private createUI (basePower: number, oxygen: number): void {
        const gameWidth = this.scene.scale.width;

        // Base Power display (top-left)
        this.basePowerText = this.scene.add.text(16, 20, `Base Power: ${basePower}%`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#ffca28',
            stroke: '#000000',
            strokeThickness: 4
        })
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(200);

        // Oxygen display (top-left, below base power)
        this.oxygenText = this.scene.add.text(16, 42, `Oxygen: ${oxygen}%`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#81c784',
            stroke: '#000000',
            strokeThickness: 4
        })
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(200);

        // Status text (center, below timer - for win/loss)
        this.statusText = this.scene.add.text(gameWidth / 2, 60, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        })
            .setOrigin(0.5, 0)
            .setScrollFactor(0)
            .setDepth(250)
            .setVisible(false);

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

    updateBasePower (power: number): void {
        this.basePowerText.setText(`Base Power: ${power}%`);
    }

    updateOxygen (oxygen: number): void {
        this.oxygenText.setText(`Oxygen: ${Math.floor(oxygen)}%`);
        if (oxygen <= 20) {
            this.oxygenText.setColor('#ff4444');
        } else if (oxygen <= 50) {
            this.oxygenText.setColor('#ffaa00');
        } else {
            this.oxygenText.setColor('#81c784');
        }
    }

    showEndScreen (reason: string, isWin: boolean): void {
        this.statusText.setText(isWin ? `WIN: ${reason}` : `GAME OVER: ${reason}`);
        this.statusText.setColor(isWin ? '#4caf50' : '#ff4444');
        this.statusText.setVisible(true);
    }

    setPaused (paused: boolean): void {
        this.isPaused = paused;
    }

    addScenarioButton (onClick: () => void): void {
        const gameWidth = this.scene.scale.width;
        const gameHeight = this.scene.scale.height;
        // Float above the dialog box (depth 1000) so it stays clickable.
        // Keep clear margins so the button is never clipped by the screen edge.
        this.createButton('SCENARIO', gameWidth - 110, gameHeight - 48, 90, 34, 0x6c5ce7, 0x9c27b0, onClick, 1100, 1101);
    }

    private createButton (
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        idleColor: number,
        hoverColor: number,
        onClick: () => void,
        depth = 200,
        labelDepth = 201
    ): void {
        const bg = this.scene.add.rectangle(x + width / 2, y + height / 2, width, height, idleColor)
            .setStrokeStyle(2, 0xffffff)
            .setScrollFactor(0)
            .setDepth(depth);

        const label = this.scene.add.text(x + width / 2, y + height / 2, text, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#ffffff'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(labelDepth);

        [bg, label].forEach(obj => {
            obj.setInteractive();
            obj.on('pointerover', () => bg.setFillStyle(hoverColor));
            obj.on('pointerout', () => bg.setFillStyle(idleColor));
            obj.on('pointerdown', onClick);
        });
    }
}

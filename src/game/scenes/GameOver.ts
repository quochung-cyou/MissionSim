import { Scene } from 'phaser';
import { AssetKeys } from '../constants/AssetKeys';
import { SceneKeys } from '../constants/SceneKeys';
import { LevelConfig } from '../config/LevelConfig';

const FONT = '"Press Start 2P", monospace';

const SCREEN_W = 960;
const SCREEN_H = 640;

const REASON_DETAILS: Record<string, { title: string; description: string }> = {
    meltdown: {
        title: 'MELTDOWN',
        description: 'Reactor heat reached 1000C. The base exploded.'
    },
    suffocation: {
        title: 'SUFFOCATION',
        description: 'Oxygen depleted. The crew could not survive.'
    },
    starvation: {
        title: 'STARVATION',
        description: 'Oil reserves hit zero. All power was lost permanently.'
    },
    timeout: {
        title: 'TIME UP',
        description: 'The mission timer expired before extraction completed.'
    }
};

export class GameOver extends Scene
{
    constructor ()
    {
        super('GameOver');
    }

    create (data: { reason?: string; levelConfig?: LevelConfig })
    {
        const reason = data.reason ?? 'timeout';
        const levelConfig = data.levelConfig;
        const details = REASON_DETAILS[reason] ?? REASON_DETAILS.timeout;

        this.sound.play(AssetKeys.Audio.GameOver, { volume: 0.6 });

        this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x000000)
            .setAlpha(0.92)
            .setDepth(0);

        const cardW = 700;
        const cardH = 480;
        const cardX = SCREEN_W / 2;
        const cardY = SCREEN_H / 2;

        this.add.rectangle(cardX, cardY, cardW, cardH, 0x1a0a0a)
            .setStrokeStyle(3, 0xff4444)
            .setDepth(1);

        this.add.rectangle(cardX, 80, cardW, 50, 0x2a0a0a)
            .setStrokeStyle(2, 0xff4444)
            .setDepth(2);

        this.add.text(cardX, 80, 'MISSION FAILED', {
            fontFamily: FONT,
            fontSize: '18px',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 4
        })
            .setOrigin(0.5)
            .setDepth(3);

        if (levelConfig) {
            const thumbX = 200;
            const thumbY = 200;

            this.add.rectangle(thumbX, thumbY, 200, 130, 0x111122)
                .setStrokeStyle(2, 0xff4444)
                .setDepth(2);

            this.add.image(thumbX, thumbY, levelConfig.thumbnailKey)
                .setDisplaySize(190, 120)
                .setAlpha(0.5)
                .setDepth(3);

            this.add.text(330, 140, `MISSION ${levelConfig.levelId}`, {
                fontFamily: FONT,
                fontSize: '10px',
                color: '#90caf9'
            })
                .setOrigin(0, 0.5)
                .setDepth(3);

            this.add.text(330, 170, levelConfig.scenarioName, {
                fontFamily: FONT,
                fontSize: '14px',
                color: '#ffca28',
                stroke: '#000000',
                strokeThickness: 3
            })
                .setOrigin(0, 0.5)
                .setDepth(3);
        }

        const reasonY = 280;

        this.add.text(cardX, reasonY, details.title, {
            fontFamily: FONT,
            fontSize: '24px',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 6
        })
            .setOrigin(0.5)
            .setDepth(3);

        this.add.text(cardX, reasonY + 50, details.description, {
            fontFamily: FONT,
            fontSize: '10px',
            color: '#cccccc',
            align: 'center',
            lineSpacing: 4,
            wordWrap: { width: 500 }
        })
            .setOrigin(0.5)
            .setDepth(3);

        this.createHomeButton(cardX, 460);
    }

    private createHomeButton (x: number, y: number): void
    {
        const btnW = 200;
        const btnH = 44;

        const bg = this.add.rectangle(x, y, btnW, btnH, 0x6c5ce7)
            .setStrokeStyle(2, 0xffffff)
            .setDepth(5);

        const label = this.add.text(x, y, 'BACK TO HOME', {
            fontFamily: FONT,
            fontSize: '11px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        })
            .setOrigin(0.5)
            .setDepth(6);

        bg.setInteractive();

        bg.on('pointerover', () => {
            bg.setFillStyle(0x9c27b0);
            bg.setScale(1.05);
            label.setScale(1.05);
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x6c5ce7);
            bg.setScale(1);
            label.setScale(1);
        });

        bg.on('pointerdown', () => {
            this.scene.start(SceneKeys.MainMenu);
        });
    }
}

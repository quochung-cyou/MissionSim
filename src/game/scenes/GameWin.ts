import { Scene } from 'phaser';
import { AssetKeys } from '../constants/AssetKeys';
import { SceneKeys } from '../constants/SceneKeys';
import { getDefaultLevelConfig, LevelConfig } from '../config/LevelConfig';
import { GameRecord } from '../services/GameLogger';

const FONT = '"Press Start 2P", monospace';
const SCREEN_W = 960;
const SCREEN_H = 640;

export class GameWin extends Scene
{
    private record!: GameRecord;
    private levelConfig!: LevelConfig;

    constructor ()
    {
        super('GameWin');
    }

    create (data: { record?: GameRecord; levelConfig?: LevelConfig })
    {
        this.record = data.record ?? this.createEmptyRecord();
        this.levelConfig = data.levelConfig ?? getDefaultLevelConfig(1);

        this.sound.play(AssetKeys.Audio.Piano, { volume: 0.6 });

        // Dark green-tinted background
        this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x000000)
            .setAlpha(0.92)
            .setDepth(0);

        // Main card
        const cardW = 700;
        const cardH = 480;
        const cardX = SCREEN_W / 2;
        const cardY = SCREEN_H / 2;

        this.add.rectangle(cardX, cardY, cardW, cardH, 0x0a1a0a)
            .setStrokeStyle(3, 0x4caf50)
            .setDepth(1);

        // Header bar
        this.add.rectangle(cardX, 80, cardW, 50, 0x0a2a0a)
            .setStrokeStyle(2, 0x4caf50)
            .setDepth(2);

        this.add.text(cardX, 80, 'MISSION COMPLETE', {
            fontFamily: FONT,
            fontSize: '18px',
            color: '#4caf50',
            stroke: '#000000',
            strokeThickness: 4,
        })
            .setOrigin(0.5)
            .setDepth(3);

        // Thumbnail and level info
        const thumbX = 200;
        const thumbY = 200;

        this.add.rectangle(thumbX, thumbY, 200, 130, 0x111122)
            .setStrokeStyle(2, 0x4caf50)
            .setDepth(2);

        this.add.image(thumbX, thumbY, this.levelConfig.thumbnailKey)
            .setDisplaySize(190, 120)
            .setDepth(3);

        this.add.text(330, 140, `MISSION ${this.levelConfig.levelId}`, {
            fontFamily: FONT,
            fontSize: '10px',
            color: '#90caf9',
        })
            .setOrigin(0, 0.5)
            .setDepth(3);

        this.add.text(330, 170, this.levelConfig.scenarioName, {
            fontFamily: FONT,
            fontSize: '14px',
            color: '#ffca28',
            stroke: '#000000',
            strokeThickness: 3,
        })
            .setOrigin(0, 0.5)
            .setDepth(3);

        // Stats
        this.createStatsRow(280);

        // Crew
        this.createCrewSection(380);

        // Buttons
        this.createButtons(cardY + cardH / 2 - 50);
    }

    private createStatsRow (y: number): void
    {
        const fs = this.record.finalState;
        if (!fs) return;

        const durationSec = (this.record.durationMs / 1000).toFixed(1);
        const stats = [
            { label: 'Time', value: `${durationSec}s`, color: '#90caf9' },
            { label: 'Ticks', value: `${this.record.tickCount}`, color: '#888888' },
            { label: 'Oxygen', value: `${fs.oxygen}%`, color: '#90caf9' },
            { label: 'Oil', value: `${fs.oil}`, color: '#ffca28' },
            { label: 'Heat', value: `${fs.mach3Heat}°C`, color: '#ff9800' },
            { label: 'Extract', value: `${fs.extractionProgress}%`, color: '#4caf50' },
        ];

        const statW = 100;
        const startX = SCREEN_W / 2 - (stats.length * statW) / 2 + statW / 2;

        for (let i = 0; i < stats.length; i++) {
            const x = startX + i * statW;

            this.add.rectangle(x, y, statW - 8, 44, 0x111122)
                .setStrokeStyle(1, 0x333355)
                .setDepth(3);

            this.add.text(x, y - 10, stats[i].label, {
                fontFamily: FONT,
                fontSize: '7px',
                color: '#666666',
            })
                .setOrigin(0.5)
                .setDepth(4);

            this.add.text(x, y + 8, stats[i].value, {
                fontFamily: FONT,
                fontSize: '10px',
                color: stats[i].color,
                stroke: '#000000',
                strokeThickness: 2,
            })
                .setOrigin(0.5)
                .setDepth(4);
        }
    }

    private createCrewSection (y: number): void
    {
        this.add.text(SCREEN_W / 2, y, 'CREW', {
            fontFamily: FONT,
            fontSize: '9px',
            color: '#666666',
        })
            .setOrigin(0.5)
            .setDepth(3);

        const names = this.record.agents.map(a => a.displayName).join('  |  ');
        this.add.text(SCREEN_W / 2, y + 18, names, {
            fontFamily: FONT,
            fontSize: '10px',
            color: '#ce93d8',
        })
            .setOrigin(0.5)
            .setDepth(3);
    }

    private createButtons (y: number): void
    {
        const btnW = 180;
        const btnH = 40;
        const spacing = 220;
        const startX = SCREEN_W / 2 - spacing / 2;

        // Home button
        this.createButton(startX, y, btnW, btnH, 'BACK HOME', 0x6c5ce7, 0x9c27b0, () => {
            this.scene.start(SceneKeys.MainMenu);
        });

        // History button
        this.createButton(startX + spacing, y, btnW, btnH, 'VIEW HISTORY', 0x2a4a6e, 0x3a6a9e, () => {
            this.scene.start(SceneKeys.GameHistory);
        });
    }

    private createButton (x: number, y: number, w: number, h: number, text: string, bgColor: number, hoverColor: number, onClick: () => void): void
    {
        const bg = this.add.rectangle(x, y, w, h, bgColor)
            .setStrokeStyle(2, 0xffffff)
            .setDepth(10)
            .setInteractive({ useHandCursor: true });

        const label = this.add.text(x, y, text, {
            fontFamily: FONT,
            fontSize: '9px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        })
            .setOrigin(0.5)
            .setDepth(11);

        bg.on('pointerover', () => {
            bg.setFillStyle(hoverColor);
            bg.setScale(1.05);
            label.setScale(1.05);
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(bgColor);
            bg.setScale(1);
            label.setScale(1);
        });
        bg.on('pointerdown', onClick);
    }

    private createEmptyRecord (): GameRecord {
        return {
            id: '0',
            date: new Date().toISOString(),
            result: 'win',
            endReason: 'win',
            durationMs: 0,
            tickCount: 0,
            agentCount: 0,
            agents: [],
            entries: [],
        };
    }
}

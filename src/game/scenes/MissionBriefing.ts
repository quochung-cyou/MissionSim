import { Scene } from 'phaser';
import { LevelConfig } from '../config/LevelConfig';
import { AssetKeys } from '../constants/AssetKeys';
import { SceneKeys } from '../constants/SceneKeys';

const FONT = '"Press Start 2P", monospace';

const SCREEN_W = 960;
const SCREEN_H = 640;

export class MissionBriefing extends Scene
{
    private levelConfig!: LevelConfig & { sessionId?: string };
    private hasStarted = false;

    constructor ()
    {
        super('MissionBriefing');
    }

    create (data: LevelConfig & { sessionId?: string })
    {
        this.levelConfig = data;
        this.hasStarted = false;

        this.sound.play(AssetKeys.Audio.CinematicHit, { volume: 0.7 });

        this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x000000)
            .setAlpha(0.9)
            .setDepth(0);

        const cardX = SCREEN_W / 2;
        const cardY = SCREEN_H / 2;
        const cardW = 820;
        const cardH = 600;

        this.add.rectangle(cardX, cardY, cardW, cardH, 0x0d1b2a)
            .setStrokeStyle(3, 0xe0a06b)
            .setDepth(1);

        this.add.rectangle(cardX, 40, cardW, 60, 0x1a2a3a)
            .setStrokeStyle(2, 0xe0a06b)
            .setDepth(2);

        this.add.text(cardX, 40, 'MISSION BRIEFING', {
            fontFamily: FONT,
            fontSize: '18px',
            color: '#e0a06b',
            stroke: '#000000',
            strokeThickness: 4
        })
            .setOrigin(0.5)
            .setDepth(3);

        this.createThumbnailSection();
        this.createObjectivesSection();
        this.createAgentSection();
        this.createStartButton();
    }

    private createThumbnailSection (): void
    {
        const thumbX = 170;
        const thumbY = 170;

        this.add.rectangle(thumbX, thumbY, 220, 150, 0x111122)
            .setStrokeStyle(2, 0xe0a06b)
            .setDepth(2);

        this.add.image(thumbX, thumbY, this.levelConfig.thumbnailKey)
            .setDisplaySize(210, 140)
            .setDepth(3);

        const infoX = 320;
        this.add.text(infoX, 110, `MISSION ${this.levelConfig.levelId}`, {
            fontFamily: FONT,
            fontSize: '10px',
            color: '#90caf9'
        })
            .setOrigin(0, 0.5)
            .setDepth(3);

        this.add.text(infoX, 140, this.levelConfig.scenarioName, {
            fontFamily: FONT,
            fontSize: '16px',
            color: '#ffca28',
            stroke: '#000000',
            strokeThickness: 3
        })
            .setOrigin(0, 0.5)
            .setDepth(3);

        this.add.text(infoX, 180, this.levelConfig.description, {
            fontFamily: FONT,
            fontSize: '8px',
            color: '#b0bec5',
            lineSpacing: 4,
            wordWrap: { width: 420 }
        })
            .setOrigin(0, 0.5)
            .setDepth(3);

        this.add.text(infoX, 230, `Time Limit: ${this.levelConfig.timeLimit}s`, {
            fontFamily: FONT,
            fontSize: '9px',
            color: '#ce93d8'
        })
            .setOrigin(0, 0.5)
            .setDepth(3);
    }

    private createObjectivesSection (): void
    {
        const sectionY = 290;
        const leftX = 80;
        const rightX = 490;

        this.add.text(SCREEN_W / 2, sectionY - 20, 'OBJECTIVES', {
            fontFamily: FONT,
            fontSize: '12px',
            color: '#e0a06b',
            stroke: '#000000',
            strokeThickness: 3
        })
            .setOrigin(0.5)
            .setDepth(3);

        this.add.rectangle(SCREEN_W / 2, sectionY, 700, 2, 0xe0a06b)
            .setAlpha(0.4)
            .setDepth(3);

        this.add.text(leftX, sectionY + 20, 'WIN CONDITION', {
            fontFamily: FONT,
            fontSize: '10px',
            color: '#4caf50',
            stroke: '#000000',
            strokeThickness: 3
        })
            .setOrigin(0, 0.5)
            .setDepth(3);

        this.add.text(leftX + 20, sectionY + 45, 'Crane extraction reaches 100%.', {
            fontFamily: FONT,
            fontSize: '8px',
            color: '#cccccc',
            wordWrap: { width: 350 }
        })
            .setOrigin(0, 0.5)
            .setDepth(3);

        const losses: Array<{ label: string; text: string }> = [
            { label: 'MELTDOWN', text: 'Reactor heat reaches 1000C. Base explodes.' },
            { label: 'SUFFOCATION', text: 'Oxygen reaches 0%. Crew dies.' },
            { label: 'STARVATION', text: 'Oil reaches 0 before extraction completes.' }
        ];

        losses.forEach((loss, i) => {
            const y = sectionY + 80 + i * 35;

            this.add.text(rightX, y, `LOSS: ${loss.label}`, {
                fontFamily: FONT,
                fontSize: '9px',
                color: '#ff4444',
                stroke: '#000000',
                strokeThickness: 3
            })
                .setOrigin(0, 0.5)
                .setDepth(3);

            this.add.text(rightX + 20, y + 18, loss.text, {
                fontFamily: FONT,
                fontSize: '7px',
                color: '#cccccc',
                wordWrap: { width: 350 }
            })
                .setOrigin(0, 0.5)
                .setDepth(3);
        });
    }

    private createAgentSection (): void
    {
        const y = 470;

        this.add.text(SCREEN_W / 2, y, 'CREW COMPLEMENT', {
            fontFamily: FONT,
            fontSize: '10px',
            color: '#e0a06b',
            stroke: '#000000',
            strokeThickness: 3
        })
            .setOrigin(0.5)
            .setDepth(3);

        const types = this.levelConfig.npcTypes;
        const totalAgents = types.reduce((sum, t) => sum + t.count, 0);
        const spacing = 200;
        const startX = SCREEN_W / 2 - (types.length - 1) * spacing / 2;

        types.forEach((type, i) => {
            const x = startX + i * spacing;

            this.add.rectangle(x, y + 35, 160, 40, 0x1a2a3a)
                .setStrokeStyle(1, 0xe0a06b)
                .setDepth(3);

            this.add.text(x, y + 28, type.type.toUpperCase(), {
                fontFamily: FONT,
                fontSize: '8px',
                color: '#90caf9'
            })
                .setOrigin(0.5)
                .setDepth(4);

            this.add.text(x, y + 44, `x${type.count}`, {
                fontFamily: FONT,
                fontSize: '12px',
                color: '#ffca28'
            })
                .setOrigin(0.5)
                .setDepth(4);
        });

        this.add.text(SCREEN_W / 2, y + 75, `Total Agents: ${totalAgents}`, {
            fontFamily: FONT,
            fontSize: '9px',
            color: '#81c784'
        })
            .setOrigin(0.5)
            .setDepth(4);
    }

    private createStartButton (): void
    {
        const btnW = 220;
        const btnH = 46;
        const btnX = SCREEN_W / 2;
        const btnY = 590;

        const bg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x4caf50)
            .setStrokeStyle(2, 0xffffff)
            .setDepth(5);

        const label = this.add.text(btnX, btnY, 'START MISSION', {
            fontFamily: FONT,
            fontSize: '12px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        })
            .setOrigin(0.5)
            .setDepth(6);

        bg.setInteractive();

        bg.on('pointerover', () => {
            bg.setFillStyle(0x66bb6a);
            bg.setScale(1.05);
            label.setScale(1.05);
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x4caf50);
            bg.setScale(1);
            label.setScale(1);
        });

        bg.on('pointerdown', () => {
            if (this.hasStarted) return;
            this.hasStarted = true;
            console.log('[MissionBriefing] Start clicked. LevelConfig:', JSON.stringify(this.levelConfig.npcTypes));
            this.scene.start(SceneKeys.Game, this.levelConfig);
        });
    }
}

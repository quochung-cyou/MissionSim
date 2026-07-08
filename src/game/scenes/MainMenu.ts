import { Scene } from 'phaser';
import { getDefaultLevelConfig, LevelConfig } from '../config/LevelConfig';
import { ParallaxMenuBackground } from '../ui/main-menu/ParallaxMenuBackground';
import { TitleComponent } from '../ui/main-menu/TitleComponent';
import { LevelCard } from '../ui/main-menu/LevelCard';
import { NpcTypePanel } from '../ui/main-menu/NpcTypePanel';
import { StartButton } from '../ui/main-menu/StartButton';
import { SessionDialog } from '../ui/main-menu/SessionDialog';
import { SceneKeys } from '../constants/SceneKeys';

const SESSION_STORAGE_KEY = 'mission_sim_current_session';

export class MainMenu extends Scene
{
    private selectedLevel: LevelConfig;
    private background!: ParallaxMenuBackground;
    private npcTypePanel!: NpcTypePanel;
    private sessionDialog!: SessionDialog;
    private currentSessionId: string = '';
    private menuContainer: Phaser.GameObjects.Container | null = null;

    constructor ()
    {
        super('MainMenu');
        this.selectedLevel = getDefaultLevelConfig(1);
    }

    create ()
    {
        this.currentSessionId = localStorage.getItem(SESSION_STORAGE_KEY) || '';

        this.background = new ParallaxMenuBackground(this);
        this.background.create();
        this.background.addVignette();

        this.sessionDialog = new SessionDialog(
            this,
            (sessionId: string) => this.saveSessionId(sessionId)
        );

        if (this.currentSessionId) {
            this.buildMenu();
        } else {
            this.sessionDialog.show('');
        }
    }

    update (_time: number, delta: number): void
    {
        this.background.update(delta);
    }

    private saveSessionId (sessionId: string): void
    {
        this.currentSessionId = sessionId;
        localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        this.sessionDialog.hide();
        this.buildMenu();
    }

    private buildMenu (): void
    {
        this.menuContainer?.destroy();
        this.menuContainer = this.add.container(0, 0).setDepth(1);

        new TitleComponent(this).create(512, 70);
        new LevelCard(this).create(512, 290, this.selectedLevel);

        this.npcTypePanel = new NpcTypePanel(
            this,
            this.selectedLevel.npcTypes,
            (types) => {
                this.selectedLevel.npcTypes = types;
                this.selectedLevel.npcCount = types.reduce((sum, t) => sum + t.count, 0);
            }
        );
        this.npcTypePanel.create(512, 460);

        new StartButton(this).create(512, 620, () => this.startGame());

        this.createHistoryButton();
        this.createChangeSessionButton();
        this.showSessionName();
    }

    private showSessionName (): void
    {
        if (!this.currentSessionId) return;
        const text = this.add.text(16, 16, `Session: ${this.currentSessionId}`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#aaaaaa'
        })
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(100);
        this.menuContainer?.add(text);
    }

    private startGame (): void
    {
        if (!this.currentSessionId) {
            this.sessionDialog.show('');
            return;
        }
        this.scene.start('MissionBriefing', { ...this.selectedLevel, sessionId: this.currentSessionId });
    }

    private changeSession (): void
    {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        this.scene.restart();
    }

    private createHistoryButton (): void
    {
        const gameWidth = this.scale.width;
        const buttonWidth = 90;
        const buttonHeight = 30;
        const xPos = gameWidth - buttonWidth / 2 - 16;
        const yPos = buttonHeight / 2 + 16 + 38;

        const bg = this.add.rectangle(xPos, yPos, buttonWidth, buttonHeight, 0x2a4a6e)
            .setStrokeStyle(2, 0xffffff)
            .setScrollFactor(0)
            .setDepth(100);

        const label = this.add.text(xPos, yPos, 'HISTORY', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#ffffff'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(101);

        [bg, label].forEach(obj => {
            obj.setInteractive();
            obj.on('pointerover', () => bg.setFillStyle(0x3a6a9e));
            obj.on('pointerout', () => bg.setFillStyle(0x2a4a6e));
            obj.on('pointerdown', () => this.scene.start(SceneKeys.GameHistory, { sessionId: this.currentSessionId }));
        });

        this.menuContainer?.add([bg, label]);
    }

    private createChangeSessionButton (): void
    {
        const gameWidth = this.scale.width;
        const buttonWidth = 110;
        const buttonHeight = 22;
        const xPos = gameWidth - buttonWidth / 2 - 16;
        const yPos = buttonHeight / 2 + 16;

        const bg = this.add.rectangle(xPos, yPos, buttonWidth, buttonHeight, 0x4a4a6e)
            .setStrokeStyle(1, 0xffffff)
            .setScrollFactor(0)
            .setDepth(100);

        const label = this.add.text(xPos, yPos, 'CHANGE', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#aaaaaa'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(101);

        [bg, label].forEach(obj => {
            obj.setInteractive();
            obj.on('pointerover', () => {
                bg.setFillStyle(0x6a6a8e);
                label.setColor('#ffffff');
            });
            obj.on('pointerout', () => {
                bg.setFillStyle(0x4a4a6e);
                label.setColor('#aaaaaa');
            });
            obj.on('pointerdown', () => this.changeSession());
        });

        this.menuContainer?.add([bg, label]);
    }
}

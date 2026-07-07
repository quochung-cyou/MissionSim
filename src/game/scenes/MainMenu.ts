import { Scene } from 'phaser';
import { getDefaultLevelConfig, LevelConfig } from '../config/LevelConfig';
import { ParallaxMenuBackground } from '../ui/main-menu/ParallaxMenuBackground';
import { TitleComponent } from '../ui/main-menu/TitleComponent';
import { LevelCard } from '../ui/main-menu/LevelCard';
import { NpcTypePanel } from '../ui/main-menu/NpcTypePanel';
import { StartButton } from '../ui/main-menu/StartButton';
import { ApiKeyDialog } from '../ui/game/ApiKeyDialog';
import { ApiKeyManager } from '../utils/ApiKeyManager';
import { SceneKeys } from '../constants/SceneKeys';

export class MainMenu extends Scene
{
    private selectedLevel: LevelConfig;
    private background!: ParallaxMenuBackground;
    private npcTypePanel!: NpcTypePanel;
    private apiKeyDialog!: ApiKeyDialog;

    constructor ()
    {
        super('MainMenu');
        this.selectedLevel = getDefaultLevelConfig(1);
    }

    create ()
    {
        this.background = new ParallaxMenuBackground(this);
        this.background.create();
        this.background.addVignette();

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

        this.createApiKeyButton();
        this.createHistoryButton();

        this.apiKeyDialog = new ApiKeyDialog(
            this,
            (key) => this.saveApiKey(key),
            () => this.hideApiKeyDialog()
        );

        if (!ApiKeyManager.hasApiKey()) {
            this.showApiKeyDialog();
        }
    }

    update (_time: number, delta: number): void
    {
        this.background.update(delta);
    }

    private startGame (): void
    {
        this.scene.start('MissionBriefing', this.selectedLevel);
    }

    private showApiKeyDialog (): void
    {
        const existingKey = ApiKeyManager.getApiKey();
        this.apiKeyDialog.show(existingKey || undefined);
    }

    private hideApiKeyDialog (): void
    {
        this.apiKeyDialog.hide();
    }

    private saveApiKey (key: string): void
    {
        ApiKeyManager.setApiKey(key);
        this.hideApiKeyDialog();
    }

    private createApiKeyButton (): void
    {
        const gameWidth = this.scale.width;
        const buttonWidth = 74;
        const buttonHeight = 30;

        const bg = this.add.rectangle(gameWidth - buttonWidth / 2 - 16, buttonHeight / 2 + 16, buttonWidth, buttonHeight, 0x6c5ce7)
            .setStrokeStyle(2, 0xffffff)
            .setScrollFactor(0)
            .setDepth(100);

        const label = this.add.text(gameWidth - buttonWidth / 2 - 16, buttonHeight / 2 + 16, 'API KEY', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#ffffff'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(101);

        [bg, label].forEach(obj => {
            obj.setInteractive();
            obj.on('pointerover', () => bg.setFillStyle(0x9c27b0));
            obj.on('pointerout', () => bg.setFillStyle(0x6c5ce7));
            obj.on('pointerdown', () => this.showApiKeyDialog());
        });
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
            obj.on('pointerdown', () => this.scene.start(SceneKeys.GameHistory));
        });
    }
}

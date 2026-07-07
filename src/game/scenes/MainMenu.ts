import { Scene } from 'phaser';
import { getDefaultLevelConfig, LevelConfig } from '../config/LevelConfig';
import { ParallaxMenuBackground } from '../ui/main-menu/ParallaxMenuBackground';
import { TitleComponent } from '../ui/main-menu/TitleComponent';
import { LevelCard } from '../ui/main-menu/LevelCard';
import { SquadSizePanel } from '../ui/main-menu/SquadSizePanel';
import { StartButton } from '../ui/main-menu/StartButton';
import { ApiKeyDialog } from '../ui/game/ApiKeyDialog';
import { ApiKeyManager } from '../utils/ApiKeyManager';

export class MainMenu extends Scene
{
    private selectedLevel: LevelConfig;
    private background!: ParallaxMenuBackground;
    private squadPanel!: SquadSizePanel;
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


        this.squadPanel = new SquadSizePanel(
            this,
            this.selectedLevel.npcCount - 1,
            this.selectedLevel.minNpcs,
            this.selectedLevel.maxNpcs,
            (count) => { this.selectedLevel.npcCount = count; }
        );
        this.squadPanel.create(512, 460);


        this.time.delayedCall(80, () => {
            this.squadPanel.bumpUp();
        });

        new StartButton(this).create(512, 560, () => this.startGame());

        this.createApiKeyButton();

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
        this.scene.start('Game', this.selectedLevel);
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
}

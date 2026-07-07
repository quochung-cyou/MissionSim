import { Scene } from 'phaser';
import { LevelManager } from '../levels/LevelManager';
import { BackgroundManager } from '../managers/BackgroundManager';
import { EnergyObjectManager } from '../managers/EnergyObjectManager';
import { NPCManager } from '../managers/NPCManager';
import { CameraController } from '../controllers/CameraController';
import { DialogService } from '../services/DialogService';
import { DebugUIManager } from '../ui/DebugUIManager';
import { LevelConfig } from '../config/LevelConfig';
import { SceneKeys } from '../constants/SceneKeys';
import { HudManager } from '../ui/game/HudManager';
import { PauseOverlay } from '../ui/game/PauseOverlay';

export class Game extends Scene
{
    private levelManager: LevelManager;
    private groundLayer: Phaser.Tilemaps.TilemapLayerBase;
    private backgroundManager: BackgroundManager;
    private energyObjectManager: EnergyObjectManager;
    private npcManager: NPCManager;
    private dialogService: DialogService;
    private cameraController: CameraController;
    private hudManager: HudManager;
    private pauseOverlay: PauseOverlay;
    private remainingTime: number;
    private isPaused = false;
    private bgMusic?: Phaser.Sound.BaseSound;

    constructor ()
    {
        super('Game');
    }

    create (data: LevelConfig)
    {
        this.backgroundManager = new BackgroundManager();
        this.backgroundManager.create(this);

        this.levelManager = new LevelManager(this);
        const { groundLayer } = this.levelManager.create();
        this.groundLayer = groundLayer;

        this.energyObjectManager = new EnergyObjectManager();
        this.energyObjectManager.spawn(this);

        this.npcManager = new NPCManager(this, this.groundLayer, data);
        this.npcManager.spawn();

        this.dialogService = new DialogService(this);
        new DebugUIManager(this, this.npcManager, this.dialogService);

        this.cameraController = new CameraController();
        this.cameraController.setup(this);

        this.remainingTime = data.timeLimit * 1000;

        this.hudManager = new HudManager(
            this,
            () => this.pauseGame(),
            () => this.leaveLevel()
        );
        this.hudManager.updateTimerDisplay(this.remainingTime);

        this.pauseOverlay = new PauseOverlay(
            this,
            () => this.resumeGame(),
            () => this.leaveLevel()
        );

        this.bgMusic = this.sound.add(data.musicKey, { loop: true, volume: 0.5 });
        this.bgMusic.play();
    }

    update (time: number, delta: number)
    {
        if (this.isPaused) return;

        this.remainingTime -= delta;
        this.hudManager.updateTimerDisplay(this.remainingTime);

        if (this.remainingTime <= 0) {
            this.remainingTime = 0;
            this.gameOver();
            return;
        }

        this.npcManager.update(time, delta);
        this.cameraController.update(this, delta);
        this.backgroundManager.update(this);
    }

    private pauseGame (): void
    {
        this.isPaused = true;
        this.physics.pause();
        this.hudManager.setPaused(true);
        this.pauseOverlay.show();
        this.bgMusic?.pause();
    }

    private resumeGame (): void
    {
        this.isPaused = false;
        this.physics.resume();
        this.hudManager.setPaused(false);
        this.pauseOverlay.hide();
        this.bgMusic?.resume();
    }

    private leaveLevel (): void
    {
        this.bgMusic?.stop();
        this.scene.start(SceneKeys.MainMenu);
    }

    private gameOver (): void
    {
        this.bgMusic?.stop();
        this.scene.start(SceneKeys.GameOver);
    }
}

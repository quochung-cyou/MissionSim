import { Scene } from 'phaser';
import { LevelManager } from '../levels/LevelManager';
import { BackgroundManager } from '../managers/BackgroundManager';
import { EnergyObjectManager } from '../managers/EnergyObjectManager';
import { NPCManager } from '../managers/NPCManager';
import { MachineManager } from '../managers/MachineManager';
import { GameStateManager } from '../managers/GameStateManager';
import { CameraController } from '../controllers/CameraController';
import { DialogService } from '../services/DialogService';
import { DebugUIManager } from '../ui/DebugUIManager';
import { LevelConfig } from '../config/LevelConfig';
import { SceneKeys } from '../constants/SceneKeys';
import { HudManager } from '../ui/game/HudManager';
import { PauseOverlay } from '../ui/game/PauseOverlay';
import { GameEventBus } from '../events/GameEventBus';
import { GameState } from '../state/GameState';
import { FailureManager } from '../failures/FailureManager';
import { OilPipeRupture } from '../failures/OilPipeRupture';
import { CoolantLockout } from '../failures/CoolantLockout';
import { TotalBlackout } from '../failures/TotalBlackout';
import { SimulationManager } from '../managers/SimulationManager';
import { MachineRegistry } from '../services/MachineRegistry';
import { ScenarioService } from '../services/ScenarioService';
import { ScenarioOverlay } from '../ui/game/ScenarioOverlay';

export class Game extends Scene
{
    private levelManager: LevelManager;
    private groundLayer: Phaser.Tilemaps.TilemapLayerBase;
    private backgroundManager: BackgroundManager;
    private energyObjectManager: EnergyObjectManager;
    private npcManager: NPCManager;
    private machineManager: MachineManager;
    private gameStateManager: GameStateManager;
    private failureManager: FailureManager;
    private dialogService: DialogService;
    private cameraController: CameraController;
    private hudManager: HudManager;
    private pauseOverlay: PauseOverlay;
    private remainingTime: number;
    private isPaused = false;
    private bgMusic?: Phaser.Sound.BaseSound;
    private eventBus: GameEventBus;
    private gameState: GameState;
    private levelConfig!: LevelConfig;
    private simulationManager!: SimulationManager;
    private machineRegistry!: MachineRegistry;
    private scenarioService!: ScenarioService;
    private scenarioOverlay!: ScenarioOverlay;

    constructor ()
    {
        super('Game');
    }

    create (data: LevelConfig)
    {
        this.levelConfig = data;
        this.isPaused = false;
        this.eventBus = new GameEventBus();
        this.gameState = new GameState(this.eventBus, {
            globalOxygen: data.globalOxygen,
            oilLevel: data.oilLevel,
            maxOilLevel: data.maxOilLevel,
            basePower: data.basePower
        });

        this.backgroundManager = new BackgroundManager();
        this.backgroundManager.create(this);

        this.levelManager = new LevelManager(this);
        const { groundLayer } = this.levelManager.create();
        this.groundLayer = groundLayer;

        this.energyObjectManager = new EnergyObjectManager();
        this.energyObjectManager.spawn(this, data, this.gameState, this.eventBus);

        this.failureManager = new FailureManager();
        const reactor = this.energyObjectManager.getReactor()!;
        const coolantPump = this.energyObjectManager.getCoolantPump()!;
        const terminal = this.energyObjectManager.getTerminal()!;
        const crane = this.energyObjectManager.getCrane()!;
        const oxygenGenerator = this.energyObjectManager.getOxygenGenerator()!;
        const oilReserve = this.energyObjectManager.getOilReserve()!;

        const mc = data.machineConfig;

        this.failureManager.add(new OilPipeRupture(reactor, {
            fixPositionX: mc.positions.oilReserve,
            fixDuration: mc.failures.repairTimeSeconds,
            heatThreshold: mc.failures.pipeRuptureHeatThreshold,
            triggerDurationMs: mc.failures.pipeRuptureDurationSeconds * 1000,
            drainRate: mc.failures.pipeRuptureOilDrain,
        }));
        this.failureManager.add(new CoolantLockout(
            terminal.getPowerDistribution(),
            () => coolantPump.setLockedOut(true),
            () => coolantPump.setLockedOut(false),
            {
                fixPositionX: mc.positions.coolantPump,
                fixDuration: mc.failures.resetTimeSeconds,
            }
        ));
        this.failureManager.add(new TotalBlackout());

        this.machineRegistry = new MachineRegistry(terminal, reactor, crane, coolantPump, oxygenGenerator, oilReserve);

        this.machineManager = new MachineManager(this.gameState, this.eventBus, this.failureManager);
        this.machineManager.add(crane);
        this.machineManager.add(coolantPump);
        this.machineManager.add(this.energyObjectManager.getOxygenGenerator()!);
        this.machineManager.add(reactor);
        this.machineManager.add(terminal);

        this.gameStateManager = new GameStateManager(this.gameState, this.eventBus);
        this.gameStateManager.setReactor(reactor);
        this.gameStateManager.setCrane(crane);

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
            () => this.leaveLevel(),
            data.basePower,
            data.globalOxygen,
            this.eventBus
        );
        this.hudManager.updateTimerDisplay(this.remainingTime);

        this.pauseOverlay = new PauseOverlay(
            this,
            () => this.resumeGame(),
            () => this.leaveLevel()
        );

        this.bgMusic = this.sound.add(data.musicKey, { loop: true, volume: 0.5 });
        this.bgMusic.play();

        this.simulationManager = new SimulationManager(
            this.gameState,
            reactor,
            terminal,
            this.npcManager,
            this.machineManager,
            this.failureManager,
            this.machineRegistry,
            data
        );
        this.simulationManager.setDialogService(this.dialogService);
        this.simulationManager.start();

        this.scenarioService = new ScenarioService(
            this.gameState,
            this.machineRegistry,
            this.simulationManager,
            this.failureManager,
            this.dialogService,
            this.eventBus,
            (seconds) => { this.remainingTime = seconds * 1000; }
        );

        this.scenarioOverlay = new ScenarioOverlay(
            this,
            (text) => this.scenarioService.generateScenario(text),
            (response) => {
                this.scenarioService.executeScenario(response);
                this.resumeScenario();
            },
            () => this.resumeScenario()
        );

        this.hudManager.addScenarioButton(() => {
            if (!this.isPaused && !this.pauseOverlay.visible && !this.scenarioOverlay.visible) {
                this.pauseForScenario();
                this.scenarioOverlay.show();
            }
        });
    }

    update (time: number, delta: number)
    {
        if (this.isPaused) return;

        // Cinematic intro phase: agents can call API and chat, but timer
        // is frozen and no physical game logic runs.
        if (this.simulationManager.isCinematicPhase()) {
            this.simulationManager.tick(delta);
            this.cameraController.update(this, delta);
            this.backgroundManager.update(this);
            return;
        }

        this.remainingTime -= delta;
        this.hudManager.updateTimerDisplay(this.remainingTime);

        if (this.remainingTime <= 0) {
            this.remainingTime = 0;
            this.gameOver();
            return;
        }

        const tickDelta = this.simulationManager.tick(delta);

        this.machineManager.tick(tickDelta);
        this.energyObjectManager.getOilReserve()?.updateDisplay();

        const endReason = this.gameStateManager.tick(tickDelta);
        if (endReason) {
            this.handleGameEnd(endReason);
            return;
        }

        this.npcManager.update(time, tickDelta);
        this.cameraController.update(this, delta);
        this.backgroundManager.update(this);
    }

    private pauseGame (): void
    {
        this.isPaused = true;
        this.simulationManager.stop();
        this.physics.pause();
        this.dialogService.hide();
        this.hudManager.setPaused(true);
        this.pauseOverlay.show();
        this.bgMusic?.pause();
    }

    private resumeGame (): void
    {
        this.isPaused = false;
        this.simulationManager.start();
        this.physics.resume();
        this.hudManager.setPaused(false);
        this.pauseOverlay.hide();
        this.bgMusic?.resume();
    }

    private pauseForScenario (): void
    {
        this.isPaused = true;
        this.simulationManager.stop();
        this.physics.pause();
    }

    private resumeScenario (): void
    {
        this.isPaused = false;
        this.simulationManager.start();
        this.physics.resume();
    }

    private leaveLevel (): void
    {
        this.scenarioOverlay?.hide();
        this.simulationManager.stop();
        this.dialogService.hide();
        this.sound.stopAll();
        this.bgMusic?.stop();
        this.scene.start(SceneKeys.MainMenu);
    }

    private gameOver (): void
    {
        this.scenarioOverlay?.hide();
        this.simulationManager.stop();
        this.simulationManager.finishLogging('timeout', 'timeout');
        this.dialogService.hide();
        this.sound.stopAll();
        this.bgMusic?.stop();
        this.scene.start(SceneKeys.GameOver, { reason: 'timeout', levelConfig: this.levelConfig });
    }

    private handleGameEnd (reason: string): void
    {
        this.scenarioOverlay?.hide();
        this.isPaused = true;
        this.simulationManager.stop();
        const record = this.simulationManager.finishLogging(reason === 'win' ? 'win' : 'lose', reason);
        this.physics.pause();
        this.dialogService.hide();
        this.sound.stopAll();
        this.bgMusic?.stop();

        this.time.delayedCall(3000, () => {
            if (reason === 'win') {
                this.scene.start(SceneKeys.GameWin, { record, levelConfig: this.levelConfig });
            } else {
                this.scene.start(SceneKeys.GameOver, { reason, levelConfig: this.levelConfig });
            }
        });
    }

    shutdown (): void {
        // Fully reset the simulation manager so old workers, broker state, and reservations
        // are cleaned up before the next game starts.
        this.scenarioOverlay?.hide();
        this.simulationManager?.reset();
        this.sound.stopAll();
        this.bgMusic?.stop();
    }
}

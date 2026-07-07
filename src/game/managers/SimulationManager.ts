import { GameState } from '../state/GameState';
import { Reactor } from '../entities/machines/Reactor';
import { SubSystemTerminal } from '../entities/machines/SubSystemTerminal';
import { NPCManager } from './NPCManager';
import { MachineManager } from './MachineManager';
import { FailureManager } from '../failures/FailureManager';
import { LevelConfig } from '../config/LevelConfig';
import { WorldStateBuilder, AgentBinding, WorldState } from '../state/WorldState';
import { MessageBroker } from '../services/MessageBroker';
import { QwenClient } from '../services/QwenClient';
import { AgentWorker } from '../services/AgentWorker';
import { DialogService } from '../services/DialogService';
import { PromptBuilder, AgentRosterEntry } from '../services/PromptBuilder';
import { MachineRegistry } from '../services/MachineRegistry';
import { ActionExecutor } from './ActionExecutor';
import { DialogBridge } from './DialogBridge';
import { InitialAlertSeeder } from './InitialAlertSeeder';
import { GameLogger, GameRecord } from '../services/GameLogger';

export class SimulationManager {
    private broker: MessageBroker;
    private client: QwenClient;
    private workers: AgentWorker[] = [];
    private bindings: AgentBinding[] = [];
    private tickCount = 0;
    private crisisActive = false;
    private started = false;
    private initialAlertSeeded = false;
    private cinematicPhase = false;

    private roster: AgentRosterEntry[] = [];
    private actionExecutor: ActionExecutor;
    private dialogBridge: DialogBridge;
    private alertSeeder: InitialAlertSeeder;

    private dialogService: DialogService | null = null;
    private logger: GameLogger;
    private lastLoggedChatIndex = 0;

    private lastTrendValues = {
        oxygen: 0,
        oil: 0,
        heat: 0,
        extraction: 0,
    };

    private currentTrends = {
        oxygen_per_second: 0,
        oil_per_second: 0,
        mach3_heat_per_second: 0,
        extraction_progress_per_second: 0,
    };

    constructor (
        private readonly gameState: GameState,
        private readonly reactor: Reactor,
        private readonly terminal: SubSystemTerminal,
        private readonly npcManager: NPCManager,
        private readonly machineManager: MachineManager,
        private readonly failureManager: FailureManager,
        private readonly machineRegistry: MachineRegistry,
        private readonly levelConfig: LevelConfig
    ) {
        this.broker = new MessageBroker();
        this.client = new QwenClient({ stream: false, enableThinking: false });
        this.buildBindings();
        this.createWorkers();
        this.actionExecutor = new ActionExecutor(this.bindings, this.machineRegistry, this.levelConfig, this.gameState);
        this.logger = new GameLogger();
        this.logger.start(this.bindings.map(b => ({
            agentId: b.agentId,
            displayName: b.displayName,
            role: b.role,
            scientistSet: b.scientistSet,
        })));
        this.actionExecutor.setOnTaskFinished((agentId, task) => {
            // A task completed — wake all standby agents so they can re-evaluate.
            console.log(`[SimulationManager] Task finished: ${agentId} -> ${task}. Waking standby agents.`);
            this.broker.wakeAllStandbyAgents();
            const binding = this.bindings.find(b => b.agentId === agentId);
            if (binding) {
                this.logger.logTaskComplete(this.tickCount, agentId, binding.displayName, task);
            }
        });
        this.dialogBridge = new DialogBridge(this.broker, this.bindings);
        this.alertSeeder = new InitialAlertSeeder(
            this.machineRegistry, this.levelConfig,
            this.gameState, this.reactor, this.terminal
        );
    }

    private buildBindings (): void {
        const npcBindings = this.npcManager.getBindings();
        const roleCounters: Record<string, number> = {};
        for (const nb of npcBindings) {
            const baseRole = WorldStateBuilder.agentRoleFromScientistSet(nb.scientistSet);
            roleCounters[baseRole] = (roleCounters[baseRole] ?? 0) + 1;
            const index = roleCounters[baseRole];
            const agentId = WorldStateBuilder.agentIdForRole(baseRole, index);
            const displayName = WorldStateBuilder.displayNameForRole(baseRole, index);
            this.bindings.push({
                agentId,
                displayName,
                role: baseRole,
                npc: nb.npc,
                scientistSet: nb.scientistSet,
            });
            nb.npc.setDisplayName(displayName);
            console.log(`[SimulationManager] Binding: ${agentId} (${displayName}) -> NPC at x=${Math.floor(nb.npc.x)}`);
        }
        this.roster = PromptBuilder.buildRoster(this.bindings);
        for (const b of this.bindings) {
            this.broker.registerAgent(b.agentId);
        }
    }

    private createWorkers (): void {
        for (const binding of this.bindings) {
            const worker = new AgentWorker(
                binding,
                this.broker,
                this.client,
                this.levelConfig,
                this.roster,
                () => this.buildFreshState()
            );
            this.workers.push(worker);
        }
    }

    start (): void {
        if (this.started) return;
        this.started = true;
        console.log('[SimulationManager] start()');
        if (!QwenClient.isApiKeyAvailable()) {
            console.warn('[SimulationManager] No API key set — agents will not start.');
            return;
        }

        if (!this.initialAlertSeeded) {
            this.cinematicPhase = true;
            this.broker.setCinematicPhase(true);
            this.alertSeeder.seed(this.dialogService);
            this.initialAlertSeeded = true;
            if (this.dialogService) {
                this.dialogService.onCinematicComplete(() => {
                    this.cinematicPhase = false;
                    this.broker.setCinematicPhase(false);
                    console.log('[SimulationManager] Cinematic phase ended — agents can now act, timer resumes');
                });
            }
        }

        for (const worker of this.workers) {
            worker.start();
            console.log(`[SimulationManager] Worker started: ${worker.getRole()}`);
        }
    }

    setDialogService (dialogService: DialogService): void {
        this.dialogService = dialogService;
    }

    stop (): void {
        console.log('[SimulationManager] stop()');
        this.started = false;
        for (const worker of this.workers) {
            worker.stop();
        }
        this.broker.releaseSpeakerToken();
    }

    reset (): void {
        this.stop();
        this.broker.reset();
        this.tickCount = 0;
        this.crisisActive = false;
        this.dialogBridge.reset();
        this.lastTrendValues = { oxygen: 0, oil: 0, heat: 0, extraction: 0 };
        this.currentTrends = {
            oxygen_per_second: 0,
            oil_per_second: 0,
            mach3_heat_per_second: 0,
            extraction_progress_per_second: 0,
        };
    }

    isCinematicPhase (): boolean {
        return this.cinematicPhase;
    }

    private updateTrends (deltaSeconds: number): void {
        const oxygen = this.gameState.globalOxygen;
        const oil = this.gameState.oilLevel;
        const heat = this.reactor.getHeat();
        const extraction = this.machineRegistry.getCrane()?.getExtractionProgress() ?? 0;

        if (this.tickCount > 1 && deltaSeconds > 0) {
            this.currentTrends.oxygen_per_second = (oxygen - this.lastTrendValues.oxygen) / deltaSeconds;
            this.currentTrends.oil_per_second = (oil - this.lastTrendValues.oil) / deltaSeconds;
            this.currentTrends.mach3_heat_per_second = (heat - this.lastTrendValues.heat) / deltaSeconds;
            this.currentTrends.extraction_progress_per_second = (extraction - this.lastTrendValues.extraction) / deltaSeconds;
        }

        this.lastTrendValues = { oxygen, oil, heat, extraction };
    }

    buildFreshState (): WorldState {
        const failureAlerts = WorldStateBuilder.buildAlerts(this.failureManager);
        const initialAlerts = this.alertSeeder.getSystemAlerts();
        const alerts = [...initialAlerts, ...failureAlerts];

        const OXYGEN_CRISIS_THRESHOLD = 30;
        const isLowOxygen = this.gameState.globalOxygen <= OXYGEN_CRISIS_THRESHOLD;
        if (isLowOxygen) {
            if (!alerts.includes(`hasCrisis: LOW_OXYGEN at ${Math.round(this.gameState.globalOxygen)}%`)) {
                alerts.push(`hasCrisis: LOW_OXYGEN at ${Math.round(this.gameState.globalOxygen)}%`);
            }
        }

        const state = WorldStateBuilder.build(
            this.tickCount,
            alerts,
            this.gameState,
            this.reactor,
            this.terminal,
            this.bindings,
            this.broker.getChatHistory(),
            this.machineRegistry,
            this.actionExecutor.getReservations(),
            this.currentTrends,
        );

        for (const binding of this.bindings) {
            if (this.actionExecutor.isAgentBusy(binding.agentId)) {
                state.agents[binding.agentId].active_task = this.actionExecutor.getBusyTask(binding.agentId) ?? 'none';
                state.agents[binding.agentId].busy_time_remaining = this.actionExecutor.getBusyTimeRemaining(binding.agentId);
            }
            const rejectionReason = this.actionExecutor.getLastRejectionReason(binding.agentId);
            if (rejectionReason) {
                state.agents[binding.agentId].last_action_error = rejectionReason;
            }
        }

        return state;
    }

    tick (deltaMs: number): number {
        this.tickCount++;
        const deltaSeconds = deltaMs / 1000;
        if (this.dialogService) {
            this.dialogService.setCurrentTick(this.tickCount);
        }

        const failureAlerts = WorldStateBuilder.buildAlerts(this.failureManager);
        const initialAlerts = this.alertSeeder.getSystemAlerts();
        const alerts = [...initialAlerts, ...failureAlerts];

        // Low-oxygen crisis: include in system alerts and crisis flag when oxygen drops below 30%
        const OXYGEN_CRISIS_THRESHOLD = 30;
        const isLowOxygen = this.gameState.globalOxygen <= OXYGEN_CRISIS_THRESHOLD;
        if (isLowOxygen) {
            if (!alerts.includes(`hasCrisis: LOW_OXYGEN at ${Math.round(this.gameState.globalOxygen)}%`)) {
                alerts.push(`hasCrisis: LOW_OXYGEN at ${Math.round(this.gameState.globalOxygen)}%`);
            }
        }

        const hasRealCrisis = failureAlerts.length > 0 || isLowOxygen;

        if (hasRealCrisis && !this.crisisActive) {
            this.crisisActive = true;
            this.broker.wakeAllStandbyAgents();
            const director = this.bindings.find(b => b.role === 'Director');
            if (director) {
                this.broker.setDirectorCrisisPriority(this.tickCount + 3);
            }
            this.logger.logCrisis(this.tickCount, `CRISIS ACTIVATED. Alerts: ${alerts.join('; ')}`);
            console.warn(`[SimulationManager] CRISIS ACTIVATED. Alerts: ${alerts.join('; ')}`);
        }

        this.updateTrends(deltaSeconds);

        const state = this.buildFreshState();

        // Update broker with new state
        this.broker.updateState(state);

        // Log new chat entries since last tick
        const chatHistory = this.broker.getChatHistory();
        for (let i = this.lastLoggedChatIndex; i < chatHistory.length; i++) {
            const entry = chatHistory[i];
            this.logger.logChat(entry.timestamp, entry.speaker, entry.display_name, entry.msg, entry.emotion);
        }
        this.lastLoggedChatIndex = chatHistory.length;

        // Bridge chat/alerts to dialog service
        this.dialogBridge.update(this.dialogService);

        // Process action queue — skip during cinematic so actions stay queued
        // and execute once the cinematic phase ends.
        if (this.cinematicPhase) {
            if (this.broker.hasQueuedActions()) {
                console.log(`[SimulationManager] Cinematic phase active — deferring ${this.broker.getActionQueueLength()} queued action(s)`);
            }
        } else {
            const actions = this.broker.drainActionQueue();
            if (actions.length > 0) {
                console.log(`[SimulationManager] Processing ${actions.length} queued action(s)`);
            }
            for (const action of actions) {
                this.actionExecutor.execute(action.role, action.command);
                const binding = this.bindings.find(b => b.agentId === action.role);
                if (binding) {
                    this.logger.logAction(this.tickCount, action.role, binding.displayName, action.command);
                }
            }
        }

        // Crisis flag is cleared when all failures are resolved and oxygen is above threshold.
        if (this.crisisActive && !hasRealCrisis) {
            this.crisisActive = false;
            this.logger.logSystem(this.tickCount, 'Crisis resolved — all failures cleared, oxygen stable');
            console.log('[SimulationManager] Crisis resolved — all failures cleared');
        }

        // Decrement busy timers
        this.actionExecutor.decrementBusyTimers(deltaSeconds);

        // Notify failure manager about agent positions for repair/reset
        const busyInfo = this.actionExecutor.getBusyInfo();
        for (const binding of this.bindings) {
            const info = busyInfo.get(binding.agentId);
            if (info && (info.task === 'repairing' || info.task === 'resetting')) {
                this.machineManager.notifyAgentAt(Math.floor(binding.npc.x));
            }
        }

        return deltaMs;
    }

    getBroker (): MessageBroker {
        return this.broker;
    }

    getBindings (): AgentBinding[] {
        return [...this.bindings];
    }

    isCrisisActive (): boolean {
        return this.crisisActive;
    }

    getLogger (): GameLogger {
        return this.logger;
    }

    getFinalState (): GameRecord['finalState'] {
        const crane = this.machineRegistry.getCrane();
        return {
            oxygen: Math.round(this.gameState.globalOxygen * 100) / 100,
            oil: Math.floor(this.gameState.oilLevel),
            basePower: this.gameState.basePowerCapacity,
            mach3Heat: Math.floor(this.reactor.getHeat()),
            extractionProgress: crane ? Math.floor(crane.getExtractionProgress() * 100) / 100 : 0,
        };
    }

    finishLogging (result: GameRecord['result'], endReason: string): GameRecord {
        return this.logger.finish(result, endReason, this.getFinalState());
    }
}

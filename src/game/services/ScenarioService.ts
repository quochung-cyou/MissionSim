import scenarioPromptRaw from '../prompts/scenario_prompt.txt?raw';
import { ChatMessage, QwenClient } from './QwenClient';
import { GameState } from '../state/GameState';
import { WorldState } from '../state/WorldState';
import { MachineRegistry } from './MachineRegistry';
import { SimulationManager } from '../managers/SimulationManager';
import { FailureManager } from '../failures/FailureManager';
import { DialogService } from './DialogService';
import { GameEventBus } from '../events/GameEventBus';
import { MechanicContext } from '../mechanics/IMechanic';
import { ScenarioAction, ScenarioResponse, PowerAllocations } from '../types/ScenarioAction';

const VALID_ACTION_TYPES = new Set<ScenarioAction['type']>([
    'set_oxygen',
    'set_oil',
    'add_oil',
    'set_heat',
    'add_heat',
    'set_base_power',
    'set_extraction_progress',
    'allocate_power',
    'trip_breaker',
    'reset_breaker',
    'set_coolant_lockout',
    'set_oxygen_lockout',
    'set_crane_lockout',
    'move_npc',
    'set_npc_energy',
    'set_time_remaining',
    'trigger_failure',
    'resolve_failure',
    'show_dialog',
]);

const VALID_FAILURE_TYPES = new Set(['OIL_PIPE_RUPTURE', 'COOLANT_LOCKOUT', 'TOTAL_BLACKOUT']);

export class ScenarioService {
    private readonly client: QwenClient;
    private readonly ctx: MechanicContext;

    constructor (
        private readonly gameState: GameState,
        private readonly machineRegistry: MachineRegistry,
        private readonly simulationManager: SimulationManager,
        private readonly failureManager: FailureManager,
        private readonly dialogService: DialogService,
        eventBus: GameEventBus,
        private readonly setTimeRemaining: (seconds: number) => void,
    ) {
        this.client = new QwenClient({ stream: false, enableThinking: false });
        this.ctx = { state: gameState, bus: eventBus };
    }

    async generateScenario (playerRequest: string): Promise<ScenarioResponse> {
        if (!QwenClient.isApiKeyAvailable()) {
            throw new Error('No API key found. Please set your Qwen API key in the game settings.');
        }

        const state = this.buildWorldStateSnapshot();
        const prompt = this.buildPrompt(state, playerRequest);
        const messages: ChatMessage[] = [
            { role: 'system', content: prompt },
            { role: 'user', content: 'Generate the scenario JSON.' },
        ];

        console.log('[ScenarioService] Generating scenario for request:', playerRequest);
        const raw = await this.client.chat(messages);
        const parsed = this.parseScenarioResponse(raw);
        return this.validateAndClamp(parsed);
    }

    executeScenario (response: ScenarioResponse): void {
        console.log('[ScenarioService] Executing scenario:', response.title, response.actions);
        for (const action of response.actions) {
            this.executeAction(action);
        }
        this.refreshDisplays();
        this.dialogService.enqueueSystemMessage(`${response.title}: ${response.description}`);
    }

    private buildWorldStateSnapshot (): WorldState {
        const state = this.simulationManager.getBroker().getState();
        if (!state) {
            throw new Error('No world state available.');
        }
        // Strip chat history to keep the prompt small and focused.
        return { ...state, chat_history: [] };
    }

    private buildPrompt (state: WorldState, playerRequest: string): string {
        const stateJson = JSON.stringify(state, null, 2);
        return scenarioPromptRaw
            .split('{{WORLD_STATE}}').join(stateJson)
            .split('{{PLAYER_REQUEST}}').join(playerRequest);
    }

    private parseScenarioResponse (content: string): ScenarioResponse {
        const jsonStr = this.extractJson(content);
        try {
            const parsed = JSON.parse(jsonStr);
            return {
                title: String(parsed.title ?? 'Unnamed Scenario'),
                description: String(parsed.description ?? ''),
                actions: Array.isArray(parsed.actions) ? parsed.actions : [],
            };
        } catch (e) {
            console.error('[ScenarioService] Failed to parse scenario JSON:', e);
            throw new Error('The AI returned invalid JSON. Please try again.');
        }
    }

    private extractJson (content: string): string {
        const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) {
            return fenceMatch[1].trim();
        }
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            return content.substring(jsonStart, jsonEnd + 1);
        }
        throw new Error('Failed to extract JSON from AI response.');
    }

    private validateAndClamp (response: ScenarioResponse): ScenarioResponse {
        const clampedActions: ScenarioAction[] = [];
        for (const action of response.actions) {
            if (!action || typeof action !== 'object' || !VALID_ACTION_TYPES.has(action.type)) {
                console.warn('[ScenarioService] Ignoring invalid action:', action);
                continue;
            }
            const clamped = this.clampAction(action);
            if (clamped) {
                clampedActions.push(clamped);
            }
        }
        return {
            title: response.title,
            description: response.description,
            actions: clampedActions,
        };
    }

    private clampAction (action: ScenarioAction): ScenarioAction | null {
        switch (action.type) {
            case 'set_oxygen':
            case 'set_base_power':
                return { type: action.type, value: this.clampNumber(action.value, 0, 100) };
            case 'set_oil':
                return { type: action.type, value: this.clampNumber(action.value, 0, this.gameState.maxOilLevel) };
            case 'add_oil':
                return { type: action.type, value: this.clampNumber(action.value, -this.gameState.maxOilLevel, this.gameState.maxOilLevel) };
            case 'set_heat':
                return { type: action.type, value: this.clampNumber(action.value, 0, this.machineRegistry.getReactor().getMaxHeat()) };
            case 'add_heat':
                return { type: action.type, value: this.clampNumber(action.value, -10000, 10000) };
            case 'set_extraction_progress':
                return { type: action.type, value: this.clampNumber(action.value, 0, 100) };
            case 'set_time_remaining':
                return { type: action.type, seconds: this.clampNumber(action.seconds, 0, 36000) };
            case 'allocate_power':
                return { type: action.type, allocations: this.clampAllocations(action.allocations) };
            case 'trip_breaker':
            case 'reset_breaker':
                return { type: action.type };
            case 'set_coolant_lockout':
            case 'set_oxygen_lockout':
            case 'set_crane_lockout':
                return { type: action.type, locked: !!action.locked };
            case 'move_npc':
                if (!this.findNpc(action.agentId)) return null;
                return {
                    type: action.type,
                    agentId: action.agentId,
                    targetX: this.clampNumber(action.targetX, 0, 5000),
                    run: !!action.run,
                };
            case 'set_npc_energy':
                if (!this.findNpc(action.agentId)) return null;
                return {
                    type: action.type,
                    agentId: action.agentId,
                    value: this.clampNumber(action.value, 0, this.findNpc(action.agentId)!.getMaxEnergy()),
                };
            case 'trigger_failure':
            case 'resolve_failure':
                if (!action.failureType || !VALID_FAILURE_TYPES.has(action.failureType)) return null;
                return { type: action.type, failureType: action.failureType };
            case 'show_dialog':
                if (!action.text) return null;
                return { type: action.type, text: String(action.text), speaker: action.speaker ? String(action.speaker) : undefined };
            default:
                return null;
        }
    }

    private clampNumber (value: unknown, min: number, max: number): number {
        const num = typeof value === 'number' ? value : Number(value);
        if (Number.isNaN(num)) return min;
        return Math.max(min, Math.min(max, num));
    }

    private clampAllocations (allocations: PowerAllocations | undefined): PowerAllocations {
        const base = this.gameState.basePowerCapacity;
        const raw: PowerAllocations = {
            Crane: this.clampNumber(allocations?.Crane, 0, this.machineRegistry.getCrane().getMaxPower()),
            Mach_1: this.clampNumber(allocations?.Mach_1, 0, this.machineRegistry.getCoolantPump().getMaxPower()),
            Mach_2: this.clampNumber(allocations?.Mach_2, 0, this.machineRegistry.getOxygenGenerator().getMaxPower()),
        };
        const total = raw.Crane + raw.Mach_1 + raw.Mach_2;
        if (total > base && total > 0) {
            const ratio = base / total;
            return {
                Crane: Math.floor(raw.Crane * ratio),
                Mach_1: Math.floor(raw.Mach_1 * ratio),
                Mach_2: Math.floor(raw.Mach_2 * ratio),
            };
        }
        return raw;
    }

    private executeAction (action: ScenarioAction): void {
        switch (action.type) {
            case 'set_oxygen':
                this.gameState.globalOxygen = action.value ?? 0;
                break;
            case 'set_oil':
                this.gameState.oilLevel = action.value ?? 0;
                break;
            case 'add_oil':
                this.gameState.oilLevel = this.gameState.oilLevel + (action.value ?? 0);
                break;
            case 'set_heat':
                this.machineRegistry.getReactor().setHeat(action.value ?? 0);
                break;
            case 'add_heat':
                this.machineRegistry.getReactor().addHeat(action.value ?? 0);
                break;
            case 'set_base_power':
                this.gameState.basePowerCapacity = action.value ?? 0;
                break;
            case 'set_extraction_progress':
                this.machineRegistry.getCrane().setExtractionProgress(action.value ?? 0);
                break;
            case 'allocate_power':
                if (action.allocations) {
                    this.machineRegistry.getTerminal().allocate(0, action.allocations.Mach_1);
                    this.machineRegistry.getTerminal().allocate(1, action.allocations.Mach_2);
                    this.machineRegistry.getTerminal().allocate(2, action.allocations.Crane);
                }
                break;
            case 'trip_breaker':
                this.machineRegistry.getTerminal().getPowerDistribution().tripBreaker();
                break;
            case 'reset_breaker':
                this.machineRegistry.getTerminal().getPowerDistribution().resetBreaker();
                break;
            case 'set_coolant_lockout':
                this.machineRegistry.getCoolantPump().setLockedOut(action.locked ?? false);
                break;
            case 'set_oxygen_lockout':
                this.machineRegistry.getOxygenGenerator().setLockedOut(action.locked ?? false);
                break;
            case 'set_crane_lockout':
                this.machineRegistry.getCrane().setLockedOut(action.locked ?? false);
                break;
            case 'move_npc':
                if (action.agentId !== undefined && action.targetX !== undefined) {
                    const npc = this.findNpc(action.agentId);
                    if (npc) npc.goTo(action.targetX, action.run ?? false);
                }
                break;
            case 'set_npc_energy':
                if (action.agentId !== undefined && action.value !== undefined) {
                    const npc = this.findNpc(action.agentId);
                    if (npc) npc.setEnergy(action.value);
                }
                break;
            case 'set_time_remaining':
                if (action.seconds !== undefined) {
                    this.setTimeRemaining(action.seconds);
                }
                break;
            case 'trigger_failure':
                if (action.failureType) {
                    const failure = this.failureManager.getFailure(action.failureType);
                    failure?.forceActivate();
                }
                break;
            case 'resolve_failure':
                if (action.failureType) {
                    const failure = this.failureManager.getFailure(action.failureType);
                    failure?.forceDeactivate(this.ctx);
                }
                break;
            case 'show_dialog':
                if (action.text) {
                    if (action.speaker) {
                        this.dialogService.enqueueAgentMessage(action.speaker, action.text, 1, 'attention');
                    } else {
                        this.dialogService.enqueueSystemMessage(action.text);
                    }
                }
                break;
        }
    }

    private findNpc (agentId: string | undefined) {
        if (!agentId) return undefined;
        const binding = this.simulationManager.getBindings().find(b => b.agentId === agentId);
        return binding?.npc;
    }

    private refreshDisplays (): void {
        this.machineRegistry.getReactor().updateDisplay();
        this.machineRegistry.getCoolantPump().updateDisplay();
        this.machineRegistry.getOxygenGenerator().updateDisplay();
        this.machineRegistry.getCrane().updateDisplay();
        this.machineRegistry.getTerminal().updateDisplay();
        this.machineRegistry.getOilReserve().updateDisplay();
    }
}

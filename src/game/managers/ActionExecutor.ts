import { AgentCommand } from '../services/QwenClient';
import { AgentBinding, BaseRole } from '../state/WorldState';
import { MachineRegistry } from '../services/MachineRegistry';
import { MachineId } from '../constants/MachineId';
import { LevelConfig } from '../config/LevelConfig';
import { GameState } from '../state/GameState';
import { FailureManager } from '../failures/FailureManager';

const ALLOCATE_BUSY_TIME = 1.0;
const POSITION_TOLERANCE = 5;

export interface BusyInfo {
    task: string;
    timeRemaining: number;
}

export class ActionExecutor {
    private readonly busyInfo: Map<string, BusyInfo> = new Map();
    private onTaskFinished: ((agentId: string, task: string) => void) | null = null;

    // Pending sub-actions keyed by agentId. Executed automatically when a move completes.
    private readonly pendingSubActions: Map<string, NonNullable<AgentCommand['sub_action']>> = new Map();
    // machine name -> agentId (who reserved it)
    private readonly machineReservations: Map<string, string> = new Map();
    // agentId -> last rejection reason, surfaced to the agent in the next prompt
    private readonly lastRejectionReasons: Map<string, string> = new Map();
    // agentId -> machine name (inverse lookup)
    private readonly agentReservation: Map<string, string> = new Map();

    constructor (
        private readonly bindings: AgentBinding[],
        private readonly machineRegistry: MachineRegistry,
        private readonly levelConfig: LevelConfig,
        private readonly gameState: GameState,
        private readonly failureManager: FailureManager,
    ) {}

    setOnTaskFinished (callback: (agentId: string, task: string) => void): void {
        this.onTaskFinished = callback;
    }

    execute (agentId: string, command: AgentCommand): { success: boolean; reason?: string } {
        const binding = this.bindings.find(b => b.agentId === agentId);
        if (!binding) {
            const reason = `No binding for agentId ${agentId}`;
            console.warn(`[ActionExecutor] ${reason}`);
            return { success: false, reason };
        }

        const npc = binding.npc;
        const displayName = binding.displayName;
        console.log(`[ActionExecutor] ${displayName} (${agentId}) -> ${command.type}`, command);

        switch (command.type) {
            case 'move': {
                const targetX = command.target_x ?? 0;
                const isRunning = command.mode === 'run';
                const npcCfg = this.levelConfig.machineConfig.npc;
                const speed = isRunning ? npcCfg.runSpeed : npcCfg.walkSpeed;
                const distance = Math.abs(targetX - npc.x);
                const travelTime = distance / speed;

                // If this move carries a sub-action, reserve the target machine now so
                // another agent cannot steal the task while we are en route.
                // Always release any previous reservation first in case the agent retargets.
                this.releaseAgentReservation(agentId);
                if (command.sub_action) {
                    const subType = command.sub_action.type;
                    if (!this.canPerformSubAction(subType, binding.role)) {
                        this.pendingSubActions.delete(agentId);
                        return this.setLastRejectionReason(agentId, `Your role (${binding.role}) cannot perform sub-action ${subType}.`);
                    }
                    const machine = command.sub_action.machine ?? (subType === 'allocate' ? 'Terminal' : undefined);
                    if (machine && this.isReservedByOther(machine, agentId)) {
                        this.pendingSubActions.delete(agentId);
                        return this.setLastRejectionReason(agentId, `Move+sub_action blocked: ${machine} is reserved by another agent.`);
                    }
                    if (machine) this.reserve(machine, agentId);
                    this.pendingSubActions.set(agentId, command.sub_action);
                    console.log(`[ActionExecutor] ${displayName} move to x=${targetX} queued sub-action: ${subType}${machine ? ` @ ${machine}` : ''}`);
                } else {
                    this.pendingSubActions.delete(agentId);
                }

                npc.goTo(targetX, isRunning);
                this.busyInfo.set(agentId, { task: `moving_to_${targetX}`, timeRemaining: travelTime });
                console.log(`[ActionExecutor] ${displayName} moving to x=${targetX} (${isRunning ? 'run' : 'walk'}, ${travelTime.toFixed(1)}s)`);
                return this.clearOnSuccess(agentId);
            }

            case 'allocate': {
                if (!this.canAllocate(binding.role)) {
                    return this.setLastRejectionReason(agentId, `Your role (${binding.role}) cannot allocate power.`);
                }
                if (!command.allocations) {
                    return this.setLastRejectionReason(agentId, 'Allocate command is missing the allocations field.');
                }
                if (this.isReservedByOther('Terminal', agentId)) {
                    return this.setLastRejectionReason(agentId, 'Terminal is reserved by another agent.');
                }

                const { Crane, Mach_1, Mach_2 } = command.allocations;
                const total = Crane + Mach_1 + Mach_2;
                const available = this.gameState.basePowerCapacity;
                if (total > available) {
                    return this.setLastRejectionReason(agentId, `Allocation total ${total} exceeds available base power ${available}.`);
                }

                this.reserve('Terminal', agentId);
                const terminalX = this.machineRegistry.getX(MachineId.Terminal);
                if (Math.abs(npc.x - terminalX) > POSITION_TOLERANCE) {
                    this.releaseAgentReservation(agentId);
                    return this.setLastRejectionReason(agentId, `You are at x=${Math.floor(npc.x)} but must be at the Terminal (x=${terminalX}) to allocate power.`);
                }
                const terminal = this.machineRegistry.getTerminal();
                console.log(`[ActionExecutor] ${displayName} allocating: Crane=${command.allocations.Crane}, Mach_1=${command.allocations.Mach_1}, Mach_2=${command.allocations.Mach_2}`);
                terminal.allocate(0, command.allocations.Mach_1);
                terminal.allocate(1, command.allocations.Mach_2);
                terminal.allocate(2, command.allocations.Crane);
                this.busyInfo.set(agentId, { task: 'allocating', timeRemaining: ALLOCATE_BUSY_TIME });
                npc.playSpecial('Allocating...');
                return this.clearOnSuccess(agentId);
            }

            case 'repair': {
                if (!this.canRepair(binding.role)) {
                    return this.setLastRejectionReason(agentId, `Your role (${binding.role}) cannot repair machines.`);
                }
                const machineName = command.machine ?? '';
                const machineId = this.resolveMachineId(machineName);
                if (!machineId) {
                    return this.setLastRejectionReason(agentId, `Unknown machine "${machineName}" for repair.`);
                }
                if (this.isReservedByOther(machineName, agentId)) {
                    return this.setLastRejectionReason(agentId, `${machineName} is reserved by another agent.`);
                }
                this.reserve(machineName, agentId);
                const repairX = this.machineRegistry.getX(machineId);
                if (Math.abs(npc.x - repairX) > POSITION_TOLERANCE) {
                    this.releaseAgentReservation(agentId);
                    return this.setLastRejectionReason(agentId, `You are at x=${Math.floor(npc.x)} but must be at ${machineName} (x=${repairX}) to repair it.`);
                }
                // If the failure was already fixed by someone else, drain this action silently.
                if (!this.failureManager.hasFixableFailureAt(repairX)) {
                    console.log(`[ActionExecutor] ${displayName} repair at ${machineName} drained — failure already resolved`);
                    this.releaseAgentReservation(agentId);
                    return this.clearOnSuccess(agentId);
                }
                const fixDuration = this.getFixDuration(machineId);
                this.busyInfo.set(agentId, { task: 'repairing', timeRemaining: fixDuration });
                npc.playSpecial('Repairing...');
                console.log(`[ActionExecutor] ${displayName} repairing ${machineName} (${fixDuration}s)`);
                return this.clearOnSuccess(agentId);
            }

            case 'interact':
            case 'reset': {
                if (command.type === 'reset' && !this.canReset(binding.role)) {
                    return this.setLastRejectionReason(agentId, `Your role (${binding.role}) cannot reset breakers.`);
                }
                const machineName = command.machine ?? '';
                const machineId = this.resolveMachineId(machineName);
                if (!machineId) {
                    return this.setLastRejectionReason(agentId, `Unknown machine "${machineName}" for ${command.type}.`);
                }
                if (this.isReservedByOther(machineName, agentId)) {
                    return this.setLastRejectionReason(agentId, `${machineName} is reserved by another agent.`);
                }
                this.reserve(machineName, agentId);
                const machineX = this.machineRegistry.getX(machineId);
                if (Math.abs(npc.x - machineX) > POSITION_TOLERANCE) {
                    this.releaseAgentReservation(agentId);
                    return this.setLastRejectionReason(agentId, `You are at x=${Math.floor(npc.x)} but must be at ${machineName} (x=${machineX}) to ${command.type} it.`);
                }
                // For reset, drain silently if the failure was already resolved.
                if (command.type === 'reset' && !this.failureManager.hasFixableFailureAt(machineX)) {
                    console.log(`[ActionExecutor] ${displayName} reset at ${machineName} drained — breaker already reset`);
                    this.releaseAgentReservation(agentId);
                    return this.clearOnSuccess(agentId);
                }
                const fixDuration = this.getFixDuration(machineId);
                const taskName = command.type === 'reset' ? 'resetting' : `interacting_${machineName}`;
                this.busyInfo.set(agentId, { task: taskName, timeRemaining: fixDuration });
                npc.playSpecial(command.type === 'reset' ? 'Resetting...' : `Interacting: ${machineName}`);
                console.log(`[ActionExecutor] ${displayName} ${command.type} on ${machineName} (${fixDuration}s)`);
                return this.clearOnSuccess(agentId);
            }

            case 'standby':
            case 'none':
            default:
                console.log(`[ActionExecutor] ${displayName} issued ${command.type} command`);
                return { success: true };
        }
    }

    getBusyInfo (): Map<string, BusyInfo> {
        return this.busyInfo;
    }

    getReservations (): Map<string, string> {
        return new Map(this.machineReservations);
    }

    cancelStaleRepairs (): void {
        for (const [agentId, info] of this.busyInfo) {
            if (info.task !== 'repairing' && info.task !== 'resetting') continue;
            const binding = this.bindings.find(b => b.agentId === agentId);
            if (!binding) continue;
            const x = Math.floor(binding.npc.x);
            if (!this.failureManager.hasFixableFailureAt(x)) {
                console.log(`[ActionExecutor] ${binding.displayName} ${info.task} cancelled — failure already resolved`);
                this.busyInfo.delete(agentId);
                binding.npc.stopSpecial();
                this.releaseAgentReservation(agentId);
                if (this.onTaskFinished) this.onTaskFinished(agentId, info.task);
            }
        }
    }

    decrementBusyTimers (deltaSeconds: number): void {
        const finished: { agentId: string; task: string }[] = [];

        for (const [agentId, info] of this.busyInfo) {
            info.timeRemaining -= deltaSeconds;
            if (info.timeRemaining <= 0) {
                this.busyInfo.delete(agentId);
                const binding = this.bindings.find(b => b.agentId === agentId);
                if (binding) {
                    binding.npc.stopSpecial();
                    console.log(`[ActionExecutor] ${binding.displayName} finished task: ${info.task}`);
                    if (this.onTaskFinished) this.onTaskFinished(agentId, info.task);
                }
                finished.push({ agentId, task: info.task });
            }
        }

        for (const { agentId, task } of finished) {
            if (task.startsWith('moving_to_')) {
                // Arrived at destination — fire any queued sub-action without an API round-trip.
                this.executePendingSubAction(agentId);
            } else {
                // Sub-action (or direct action) completed — release the machine reservation.
                this.releaseAgentReservation(agentId);
            }
        }
    }

    isAgentBusy (agentId: string): boolean {
        return this.busyInfo.has(agentId);
    }

    getBusyTask (agentId: string): string | undefined {
        return this.busyInfo.get(agentId)?.task;
    }

    getBusyTimeRemaining (agentId: string): number {
        return Math.ceil(this.busyInfo.get(agentId)?.timeRemaining ?? 0);
    }

    getLastRejectionReason (agentId: string): string | undefined {
        return this.lastRejectionReasons.get(agentId);
    }

    clearLastRejectionReason (agentId: string): void {
        this.lastRejectionReasons.delete(agentId);
    }

    private setLastRejectionReason (agentId: string, reason: string): { success: false; reason: string } {
        this.lastRejectionReasons.set(agentId, reason);
        return { success: false, reason };
    }

    private clearOnSuccess (agentId: string): { success: true } {
        this.lastRejectionReasons.delete(agentId);
        return { success: true };
    }

    private resolveMachineId (name: string): MachineId | undefined {
        const map: Record<string, MachineId> = {
            'Crane': MachineId.Crane,
            'Mach_1': MachineId.CoolantPump,
            'Mach_2': MachineId.OxygenGenerator,
            'Mach_3': MachineId.Reactor,
            'Terminal': MachineId.Terminal,
            'Oil': MachineId.OilReserve,
        };
        return map[name];
    }

    private getFixDuration (machineId: MachineId): number {
        const fc = this.levelConfig.machineConfig.failures;
        if (machineId === MachineId.OilReserve) return fc.repairTimeSeconds;
        if (machineId === MachineId.CoolantPump) return fc.resetTimeSeconds;
        return fc.repairTimeSeconds;
    }

    private isReservedByOther (machine: string, agentId: string): boolean {
        const holder = this.machineReservations.get(machine);
        return holder !== undefined && holder !== agentId;
    }

    private canAllocate (role: BaseRole): boolean {
        return role === 'Director' || role === 'Scientist';
    }

    private canRepair (role: BaseRole): boolean {
        return role === 'Director' || role === 'Mechanic';
    }

    private canReset (role: BaseRole): boolean {
        return role === 'Director' || role === 'Mechanic';
    }

    private canPerformSubAction (subActionType: NonNullable<AgentCommand['sub_action']>['type'], role: BaseRole): boolean {
        switch (subActionType) {
            case 'allocate': return this.canAllocate(role);
            case 'repair': return this.canRepair(role);
            case 'reset': return this.canReset(role);
            case 'interact': return true;
            default: return false;
        }
    }

    private reserve (machine: string, agentId: string): void {
        this.machineReservations.set(machine, agentId);
        this.agentReservation.set(agentId, machine);
    }

    private releaseAgentReservation (agentId: string): void {
        const machine = this.agentReservation.get(agentId);
        if (machine) {
            this.machineReservations.delete(machine);
            this.agentReservation.delete(agentId);
        }
    }

    private executePendingSubAction (agentId: string): void {
        const sub = this.pendingSubActions.get(agentId);
        if (!sub) return;

        const binding = this.bindings.find(b => b.agentId === agentId);
        if (!binding) {
            this.pendingSubActions.delete(agentId);
            this.releaseAgentReservation(agentId);
            return;
        }

        console.log(`[ActionExecutor] ${binding.displayName} arrived — executing queued sub-action: ${sub.type}`);
        this.pendingSubActions.delete(agentId);
        // sub-action inherits the reservation made at move start.
        const wasBusy = this.busyInfo.has(agentId);
        this.execute(agentId, { ...sub });
        // If execute did not start a new task, the reservation is no longer needed.
        if (!wasBusy && !this.busyInfo.has(agentId)) {
            this.releaseAgentReservation(agentId);
        }
    }
}

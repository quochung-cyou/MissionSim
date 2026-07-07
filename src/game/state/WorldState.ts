import { GameState } from './GameState';
import { Reactor } from '../entities/machines/Reactor';
import { SubSystemTerminal } from '../entities/machines/SubSystemTerminal';
import { NPC } from '../entities/NPC';
import { FailureManager } from '../failures/FailureManager';
import { MachineRegistry } from '../services/MachineRegistry';
import { MachineId } from '../constants/MachineId';

export type AgentRole = string;

export const BASE_ROLES = ['Mechanic', 'Scientist', 'Director'] as const;
export type BaseRole = typeof BASE_ROLES[number];

export const ROLE_DISPLAY_NAMES: Record<BaseRole, string> = {
    Mechanic: 'Heavy Mechanic',
    Director: 'Base Director',
    Scientist: 'Safety Scientist',
};

export interface AgentState {
    agent_id: string;
    display_name: string;
    role: BaseRole;
    x: number;
    energy: number;
    active_task: string;
    busy_time_remaining: number;
    last_action_error?: string;
}

export interface EnvironmentTrends {
    oxygen_per_second: number;
    oil_per_second: number;
    mach3_heat_per_second: number;
    extraction_progress_per_second: number;
}

export interface EnvironmentState {
    oxygen: number;
    oil: number;
    base_power: number;
    mach3_heat: number;
    allocations: { Crane: number; Mach_1: number; Mach_2: number };
    extraction_progress: number;
    reactor_status: 'ON' | 'OFF';
    coolant_locked: boolean;
    breaker_tripped: boolean;
    // machine name -> agentId. Machines reserved by an agent for a queued move+sub_action.
    reservations: Record<string, string>;
    trends: EnvironmentTrends;
}

export interface ChatEntry {
    timestamp: number;
    speaker: string;      // agentId (internal identity)
    display_name: string; // user-facing name (e.g. "Safety Scientist")
    msg: string;
    emotion?: string;
}

export interface WorldState {
    tick: number;
    system_alerts: string[];
    environment: EnvironmentState;
    agents: Record<AgentRole, AgentState>;
    chat_history: ChatEntry[];
}

export interface AgentBinding {
    agentId: string;
    displayName: string;
    role: BaseRole;
    npc: NPC;
    scientistSet: 1 | 2 | 3;
}

export class WorldStateBuilder {
    static build (
        tick: number,
        alerts: string[],
        gameState: GameState,
        reactor: Reactor,
        terminal: SubSystemTerminal,
        bindings: AgentBinding[],
        chatHistory: ChatEntry[],
        machineRegistry?: MachineRegistry,
        reservations?: Map<string, string>,
        trends?: EnvironmentTrends,
    ): WorldState {
        const allocations = terminal.getPowerDistribution().getAllocations();
        // Registration order in EnergyObjectManager: [0]=CoolantPump, [1]=OxygenGenerator, [2]=Crane
        const crane = machineRegistry?.getCrane();
        const coolantPump = machineRegistry?.getCoolantPump();
        const reservationRecord: Record<string, string> = {};
        if (reservations) {
            for (const [machine, agentId] of reservations) {
                reservationRecord[machine] = agentId;
            }
        }
        const env: EnvironmentState = {
            oxygen: Math.round(gameState.globalOxygen * 100) / 100,
            oil: Math.floor(gameState.oilLevel),
            base_power: gameState.basePowerCapacity,
            mach3_heat: Math.floor(reactor.getHeat()),
            allocations: {
                Crane: allocations[2] ?? 0,
                Mach_1: allocations[0] ?? 0,
                Mach_2: allocations[1] ?? 0,
            },
            extraction_progress: crane ? Math.floor(crane.getExtractionProgress() * 100) / 100 : 0,
            reactor_status: reactor.getStatus(),
            coolant_locked: coolantPump ? coolantPump.isLockedOut() : false,
            breaker_tripped: terminal.getPowerDistribution().isBreakerTripped(),
            reservations: reservationRecord,
            trends: trends ?? {
                oxygen_per_second: 0,
                oil_per_second: 0,
                mach3_heat_per_second: 0,
                extraction_progress_per_second: 0,
            },
        };

        const agents: Record<string, AgentState> = {};
        for (const binding of bindings) {
            agents[binding.agentId] = {
                agent_id: binding.agentId,
                display_name: binding.displayName,
                role: binding.role,
                x: Math.floor(binding.npc.x),
                energy: Math.floor(binding.npc.getEnergy()),
                active_task: 'none',
                busy_time_remaining: 0,
            };
        }

        return {
            tick,
            system_alerts: [...alerts],
            environment: env,
            agents,
            chat_history: [...chatHistory],
        };
    }

    static buildAlerts (failureManager: FailureManager): string[] {
        const alerts: string[] = [];
        const active = failureManager.getActiveFailures();
        for (const failure of active) {
            alerts.push(`hasCrisis: ${failure.type} at x=${failure.fixPositionX}`);
        }
        return alerts;
    }

    static agentRoleFromScientistSet (scientistSet: 1 | 2 | 3): BaseRole {
        switch (scientistSet) {
            case 1: return 'Mechanic';
            case 2: return 'Director';
            case 3: return 'Scientist';
        }
    }

    static scientistSetFromRole (role: BaseRole): 1 | 2 | 3 {
        switch (role) {
            case 'Mechanic': return 1;
            case 'Director': return 2;
            case 'Scientist': return 3;
        }
    }

    static displayNameForRole (role: BaseRole, index: number): string {
        const base = ROLE_DISPLAY_NAMES[role];
        return index > 1 ? `${base} ${index}` : base;
    }

    static agentIdForRole (role: BaseRole, index: number): string {
        return `${role}_${index}`;
    }

    static machineX (machine: string, registry?: MachineRegistry): number {
        if (registry) {
            const map: Record<string, MachineId> = {
                'Crane': MachineId.Crane,
                'Mach_1': MachineId.CoolantPump,
                'Mach_2': MachineId.OxygenGenerator,
                'Mach_3': MachineId.Reactor,
                'Terminal': MachineId.Terminal,
                'Oil': MachineId.OilReserve,
            };
            const id = map[machine];
            if (id) return registry.getX(id);
        }
        return 0;
    }
}

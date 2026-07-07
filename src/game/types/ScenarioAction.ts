export type ScenarioActionType =
    | 'set_oxygen'
    | 'set_oil'
    | 'add_oil'
    | 'set_heat'
    | 'add_heat'
    | 'set_base_power'
    | 'set_extraction_progress'
    | 'allocate_power'
    | 'trip_breaker'
    | 'reset_breaker'
    | 'set_coolant_lockout'
    | 'set_oxygen_lockout'
    | 'set_crane_lockout'
    | 'move_npc'
    | 'set_npc_energy'
    | 'set_time_remaining'
    | 'trigger_failure'
    | 'resolve_failure'
    | 'show_dialog';

export interface PowerAllocations {
    Crane: number;
    Mach_1: number;
    Mach_2: number;
}

export interface ScenarioAction {
    type: ScenarioActionType;
    value?: number;
    allocations?: PowerAllocations;
    locked?: boolean;
    agentId?: string;
    targetX?: number;
    run?: boolean;
    seconds?: number;
    failureType?: string;
    text?: string;
    speaker?: string;
}

export interface ScenarioResponse {
    title: string;
    description: string;
    actions: ScenarioAction[];
}

import systemPromptRaw from '../prompts/system_prompt.txt?raw';
import persona1Raw from '../prompts/persona_1.txt?raw';
import persona2Raw from '../prompts/persona_2.txt?raw';
import persona3Raw from '../prompts/persona_3.txt?raw';
import { LevelConfig, NPCTypeConfig } from '../config/LevelConfig';
import { AgentBinding } from '../state/WorldState';

export type ScientistSet = 1 | 2 | 3;

export interface AgentRosterEntry {
    agentId: string;
    displayName: string;
    role: string;
    scientistSet: ScientistSet;
}

export interface PromptContext {
    levelConfig: LevelConfig;
    scientistSet: ScientistSet;
    agentId: string;
    displayName: string;
    roster: AgentRosterEntry[];
}

const PERSONA_MAP: Record<ScientistSet, string> = {
    1: persona1Raw,
    2: persona2Raw,
    3: persona3Raw,
};

export class PromptBuilder {
    static buildSystemPrompt (ctx: PromptContext): string {
        const persona = PERSONA_MAP[ctx.scientistSet];
        const interpolated = this.interpolate(systemPromptRaw, ctx.levelConfig, ctx);
        const personaInterpolated = this.interpolatePersona(persona, ctx);
        return `${interpolated}\n\n${personaInterpolated}`;
    }

    static buildPersonaPrompt (scientistSet: ScientistSet): string {
        return PERSONA_MAP[scientistSet];
    }

    static getSystemPromptTemplate (): string {
        return systemPromptRaw;
    }

    static buildRoster (bindings: AgentBinding[]): AgentRosterEntry[] {
        return bindings.map(b => ({
            agentId: b.agentId,
            displayName: b.displayName,
            role: b.role,
            scientistSet: b.scientistSet,
        }));
    }

    private static interpolatePersona (persona: string, ctx: PromptContext): string {
        let result = persona;
        result = result.split('{{AGENT_ID}}').join(ctx.agentId);
        result = result.split('{{AGENT_NAME}}').join(ctx.displayName);
        result = result.split('{{AGENT_COUNT}}').join(String(ctx.roster.length));
        return result;
    }

    private static interpolate (template: string, config: LevelConfig, ctx: PromptContext): string {
        const mc = config.machineConfig;
        const maxSprintTime = mc.npc.maxEnergy / mc.npc.runDrainPerSecond;
        const maxSprintDistance = maxSprintTime * mc.npc.runSpeed;

        const replacements: Record<string, string | number> = {
            // Machine positions
            OIL_X: mc.positions.oilReserve,
            MACH3_X: mc.positions.reactor,
            MACH2_X: mc.positions.oxygenGenerator,
            MACH1_X: mc.positions.coolantPump,
            CRANE_X: mc.positions.crane,
            MACH4_X: mc.positions.terminal,

            // Level config values
            OIL_LEVEL: config.oilLevel,
            MAX_OIL_LEVEL: config.maxOilLevel,
            MACHINE_HEAT: config.machineHeat,
            GLOBAL_OXYGEN: config.globalOxygen,
            BASE_POWER: config.basePower,

            // Reactor mechanics
            MACH3_OIL_CONSUMPTION: mc.reactor.fuelConsumptionRate,
            MACH3_HEAT_RATE: mc.reactor.heatGenerationRate,
            MACH3_MAX_HEAT: mc.reactor.maxHeat,

            // Oxygen generator mechanics
            MACH2_OXYGEN_DRAIN: mc.oxygenGenerator.nativeDrainRate,
            MACH2_OXYGEN_PER_POWER: mc.oxygenGenerator.oxygenPerPower,

            // Coolant pump mechanics
            MACH1_COOLING_PER_POWER: mc.coolantPump.coolingPerPower,
            MACH1_MAX_POWER: mc.coolantPump.maxPower,

            // Crane mechanics
            CRANE_POWER_REQUIRED: mc.crane.powerRequired,
            CRANE_PROGRESS_RATE: mc.crane.progressRate,
            CRANE_MAX_POWER: mc.crane.maxPower,

            // Oxygen generator max power
            MACH2_MAX_POWER: mc.oxygenGenerator.maxPower,

            // NPC movement
            WALK_SPEED: mc.npc.walkSpeed,
            RUN_SPEED: mc.npc.runSpeed,
            MAX_ENERGY: mc.npc.maxEnergy,
            RUN_DRAIN: mc.npc.runDrainPerSecond,
            ENERGY_REGEN: mc.npc.energyRegenPerSecond,
            MAX_SPRINT_TIME: maxSprintTime.toFixed(2),
            MAX_SPRINT_DISTANCE: Math.round(maxSprintDistance),

            // Failure thresholds
            PIPE_RUPTURE_THRESHOLD: mc.failures.pipeRuptureHeatThreshold,
            PIPE_RUPTURE_DURATION: mc.failures.pipeRuptureDurationSeconds,
            PIPE_RUPTURE_DRAIN: mc.failures.pipeRuptureOilDrain,
            REPAIR_TIME: mc.failures.repairTimeSeconds,
            BREAKER_TRIP_COUNT: mc.failures.breakerTripCount,
            BREAKER_TRIP_WINDOW: mc.failures.breakerTripWindowSeconds,
            RESET_TIME: mc.failures.resetTimeSeconds,

            // Agent identity
            AGENT_ID: ctx.agentId,
            AGENT_NAME: ctx.displayName,
            AGENT_COUNT: String(ctx.roster.length),
            ROSTER: this.formatRoster(ctx.roster),
            ROSTER_CAPABILITIES: this.formatRosterCapabilities(ctx.roster),
        };

        let result = template;
        for (const [key, value] of Object.entries(replacements)) {
            result = result.split(`{{${key}}}`).join(String(value));
        }
        return result;
    }

    private static formatRoster (roster: AgentRosterEntry[]): string {
        if (roster.length === 1) {
            const r = roster[0];
            return `- ${r.displayName} (ID: ${r.agentId}, Role: ${r.role})\n\nThis mission has only you. You are responsible for all tasks.`;
        }

        const lines = roster.map(r =>
            `- ${r.displayName} (ID: ${r.agentId}, Role: ${r.role})`
        );

        const director = roster.find(r => r.role === 'Director');
        if (director) {
            lines.push(`\nThe highest command is ${director.displayName} (Director). All agents must follow the Director's coordination orders.`);
        }

        return lines.join('\n');
    }

    private static formatRosterCapabilities (roster: AgentRosterEntry[]): string {
        const header = '## CREW ACTION CAPABILITIES';
        const lines = roster.map(r => {
            const caps = this.capabilitiesForRole(r.role);
            return `- ${r.displayName} (Role: ${r.role}): ${caps}`;
        });
        return [header, ...lines].join('\n');
    }

    private static capabilitiesForRole (role: string): string {
        switch (role) {
            case 'Director':
                return 'Can allocate power at Terminal, repair machines, and reset breakers. Can command/coordinate other agents.';
            case 'Mechanic':
                return 'Can repair machines and reset breakers. CANNOT allocate power — ask the Director or Safety Scientist.';
            case 'Scientist':
                return 'Can allocate power at Terminal. CANNOT repair or reset machines — ask the Heavy Mechanic or Director.';
            default:
                return 'Can move and interact.';
        }
    }

    static scientistSetFromConfig (npcType: NPCTypeConfig): ScientistSet {
        return npcType.scientistSet;
    }
}

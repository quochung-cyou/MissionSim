import { AgentCommand } from './QwenClient';

export interface LogEntry {
    tick: number;
    timestamp: number;
    type: 'chat' | 'action' | 'system' | 'state' | 'crisis' | 'standby' | 'task_complete';
    agent?: string;
    agent_display?: string;
    data: string;
    command?: AgentCommand;
    emotion?: string;
}

export interface GameRecord {
    id: string;
    date: string;
    result: 'win' | 'lose' | 'timeout' | 'incomplete';
    endReason: string;
    durationMs: number;
    tickCount: number;
    agentCount: number;
    agents: { agentId: string; displayName: string; role: string; scientistSet: number }[];
    entries: LogEntry[];
    finalState?: {
        oxygen: number;
        oil: number;
        basePower: number;
        mach3Heat: number;
        extractionProgress: number;
    };
}

const STORAGE_KEY = 'game_history';
const MAX_RECORDS = 20;

export class GameLogger {
    private entries: LogEntry[] = [];
    private startTime = 0;
    private tickCount = 0;
    private agents: { agentId: string; displayName: string; role: string; scientistSet: number }[] = [];

    start (agents: { agentId: string; displayName: string; role: string; scientistSet: number }[]): void {
        this.entries = [];
        this.startTime = Date.now();
        this.tickCount = 0;
        this.agents = agents;
        this.log(0, 'system', 'Game session started');
    }

    setTick (tick: number): void {
        this.tickCount = tick;
    }

    log (tick: number, type: LogEntry['type'], data: string, opts?: {
        agent?: string;
        agent_display?: string;
        command?: AgentCommand;
        emotion?: string;
    }): void {
        this.entries.push({
            tick,
            timestamp: Date.now() - this.startTime,
            type,
            agent: opts?.agent,
            agent_display: opts?.agent_display,
            data,
            command: opts?.command,
            emotion: opts?.emotion,
        });
    }

    logChat (tick: number, agent: string, displayName: string, msg: string, emotion?: string): void {
        // Collapse repeated messages from the same agent to stop hallucinated echoes in history
        const last = this.entries[this.entries.length - 1];
        if (last && last.type === 'chat' && last.agent === agent && last.data === msg) {
            console.log(`[GameLogger] Skipped duplicate chat from ${displayName}: "${msg}"`);
            return;
        }
        this.log(tick, 'chat', msg, { agent, agent_display: displayName, emotion });
    }

    logAction (tick: number, agent: string, displayName: string, command: AgentCommand): void {
        this.log(tick, 'action', `Command: ${command.type}`, { agent, agent_display: displayName, command });
    }

    logSystem (tick: number, msg: string): void {
        this.log(tick, 'system', msg);
    }

    logCrisis (tick: number, msg: string): void {
        this.log(tick, 'crisis', msg);
    }

    logStandby (tick: number, agent: string, displayName: string, reason: string): void {
        this.log(tick, 'standby', reason, { agent, agent_display: displayName });
    }

    logTaskComplete (tick: number, agent: string, displayName: string, task: string): void {
        this.log(tick, 'task_complete', task, { agent, agent_display: displayName });
    }

    finish (result: GameRecord['result'], endReason: string, finalState?: GameRecord['finalState']): GameRecord {
        const record: GameRecord = {
            id: `${Date.now()}`,
            date: new Date().toISOString(),
            result,
            endReason,
            durationMs: Date.now() - this.startTime,
            tickCount: this.tickCount,
            agentCount: this.agents.length,
            agents: this.agents,
            entries: this.entries,
            finalState,
        };
        this.saveToStorage(record);
        return record;
    }

    private saveToStorage (record: GameRecord): void {
        try {
            const existing = GameLogger.loadAll();
            existing.unshift(record);
            const trimmed = existing.slice(0, MAX_RECORDS);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
            console.log(`[GameLogger] Saved game record ${record.id} to localStorage (${trimmed.length} total)`);
        } catch (e) {
            console.error('[GameLogger] Failed to save to localStorage:', e);
        }
    }

    static loadAll (): GameRecord[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            return JSON.parse(raw) as GameRecord[];
        } catch (e) {
            console.error('[GameLogger] Failed to load from localStorage:', e);
            return [];
        }
    }

    static clearAll (): void {
        localStorage.removeItem(STORAGE_KEY);
    }

    static loadById (id: string): GameRecord | null {
        const all = GameLogger.loadAll();
        return all.find(r => r.id === id) ?? null;
    }
}

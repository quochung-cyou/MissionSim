import { AgentCommand } from './QwenClient';
import { BackendClient, RecordSave, RecordsQuery } from './BackendClient';

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
    sessionId?: string;
    sessionDisplayName?: string;
    finalState?: {
        oxygen: number;
        oil: number;
        basePower: number;
        mach3Heat: number;
        extractionProgress: number;
    };
}

export class GameLogger {
    private entries: LogEntry[] = [];
    private startTime = 0;
    private tickCount = 0;
    private agents: { agentId: string; displayName: string; role: string; scientistSet: number }[] = [];
    private sessionId: string = '';

    start (agents: { agentId: string; displayName: string; role: string; scientistSet: number }[]): void {
        this.entries = [];
        this.startTime = Date.now();
        this.tickCount = 0;
        this.agents = agents;
        this.log(0, 'system', 'Game session started');
    }

    setSessionId (sessionId: string): void {
        this.sessionId = sessionId;
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

    async finish (result: GameRecord['result'], endReason: string, finalState?: GameRecord['finalState']): Promise<GameRecord> {
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

        if (this.sessionId) {
            await this.saveToBackend(record);
        } else {
            console.warn('[GameLogger] No sessionId set, skipping backend save');
        }

        return record;
    }

    private async saveToBackend (record: GameRecord): Promise<void> {
        try {
            const recordSave: RecordSave = {
                id: record.id,
                result: record.result,
                durationMs: record.durationMs,
                recordJson: JSON.stringify(record)
            };

            await BackendClient.saveRecord(this.sessionId, recordSave);
            console.log(`[GameLogger] Saved game record ${record.id} to backend for session ${this.sessionId}`);
        } catch (e) {
            console.error('[GameLogger] Failed to save to backend:', e);
        }
    }

    static async loadAll (sessionId: string): Promise<GameRecord[]> {
        try {
            const records = await BackendClient.getRecords(sessionId);
            return records.map(r => JSON.parse(r.record_json) as GameRecord);
        } catch (e) {
            console.error('[GameLogger] Failed to load from backend:', e);
            return [];
        }
    }

    static async loadAllGlobal (query: RecordsQuery = {}): Promise<GameRecord[]> {
        try {
            const records = await BackendClient.getAllRecords(query);
            return records.map(r => {
                const record = JSON.parse(r.record_json) as GameRecord;
                record.sessionId = r.session_id;
                record.sessionDisplayName = r.session_display_name || r.session_id;
                return record;
            });
        } catch (e) {
            console.error('[GameLogger] Failed to load global records from backend:', e);
            return [];
        }
    }

    static async loadById (sessionId: string, id: string): Promise<GameRecord | null> {
        try {
            const records = await BackendClient.getRecords(sessionId);
            const record = records.find(r => r.id === id);
            return record ? JSON.parse(record.record_json) as GameRecord : null;
        } catch (e) {
            console.error('[GameLogger] Failed to load from backend:', e);
            return null;
        }
    }
}

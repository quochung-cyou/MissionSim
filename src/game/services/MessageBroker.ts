import { WorldState, AgentRole, ChatEntry } from '../state/WorldState';
import { AgentCommand } from './QwenClient';

interface QueuedAction {
    role: AgentRole;
    command: AgentCommand;
    timestamp: number;
}

export class MessageBroker {
    private state: WorldState | null = null;
    private chatHistory: ChatEntry[] = [];
    private actionQueue: QueuedAction[] = [];
    private tick = 0;

    private speakerTokenHolder: AgentRole | null = null;
    private speakerTokenPriority: number = 0;
    private directorCrisisPriorityUntil = 0;

    private newMessagesSinceLastRead: Set<AgentRole> = new Set();
    private registeredAgents: Set<AgentRole> = new Set();
    private standbyAgents: Set<AgentRole> = new Set();
    private standbyReasons: Map<AgentRole, string> = new Map();
    private cinematicPhase = false;

    setCinematicPhase (active: boolean): void {
        this.cinematicPhase = active;
    }

    isCinematicPhase (): boolean {
        return this.cinematicPhase;
    }

    setAgentStandby (role: AgentRole, reason: string): void {
        this.standbyAgents.add(role);
        this.standbyReasons.set(role, reason);
        console.log(`[MessageBroker] ${role} entered standby: ${reason}`);
    }

    isAgentStandby (role: AgentRole): boolean {
        return this.standbyAgents.has(role);
    }

    getStandbyReason (role: AgentRole): string | undefined {
        return this.standbyReasons.get(role);
    }

    wakeAllStandbyAgents (): void {
        if (this.standbyAgents.size > 0) {
            console.log(`[MessageBroker] Waking all standby agents: ${Array.from(this.standbyAgents).join(', ')}`);
        }
        this.standbyAgents.clear();
        this.standbyReasons.clear();
    }

    wakeAgent (role: AgentRole): void {
        if (this.standbyAgents.has(role)) {
            console.log(`[MessageBroker] Waking standby agent: ${role}`);
            this.standbyAgents.delete(role);
            this.standbyReasons.delete(role);
        }
    }

    registerAgent (role: AgentRole): void {
        this.registeredAgents.add(role);
    }

    getRegisteredAgents (): AgentRole[] {
        return Array.from(this.registeredAgents);
    }

    updateState (state: WorldState): void {
        this.state = state;
        this.tick = state.tick;
        this.chatHistory = state.chat_history;
    }

    getState (): WorldState | null {
        return this.state;
    }

    hasNewMessagesFor (role: AgentRole): boolean {
        return this.newMessagesSinceLastRead.has(role);
    }

    markMessagesRead (role: AgentRole): void {
        this.newMessagesSinceLastRead.delete(role);
    }

    setDirectorCrisisPriority (untilTick: number): void {
        this.directorCrisisPriorityUntil = untilTick;
        console.log(`[MessageBroker] Director crisis speaker priority active until tick ${untilTick}`);
    }

    requestSpeakerToken (role: AgentRole, priority: number = 0): boolean {
        // Director gets exclusive right to speak for a short window after a crisis starts.
        if (this.tick <= this.directorCrisisPriorityUntil && role !== 'Director') {
            console.log(`[MessageBroker] Speaker token denied for ${role}: Director crisis priority window active until tick ${this.directorCrisisPriorityUntil}`);
            return false;
        }

        if (this.speakerTokenHolder === null) {
            this.speakerTokenHolder = role;
            this.speakerTokenPriority = priority;
            console.log(`[MessageBroker] Speaker token granted to ${role} (priority=${priority})`);
            return true;
        }
        if (this.speakerTokenHolder === role) {
            return true;
        }
        if (priority > this.speakerTokenPriority) {
            console.log(`[MessageBroker] Speaker token preempted: ${this.speakerTokenHolder} -> ${role} (priority ${this.speakerTokenPriority} -> ${priority})`);
            this.speakerTokenHolder = role;
            this.speakerTokenPriority = priority;
            return true;
        }
        console.log(`[MessageBroker] Speaker token denied for ${role} (priority=${priority}), held by ${this.speakerTokenHolder} (priority=${this.speakerTokenPriority})`);
        return false;
    }

    releaseSpeakerToken (): void {
        this.speakerTokenHolder = null;
        this.speakerTokenPriority = 0;
    }

    getSpeakerTokenHolder (): AgentRole | null {
        return this.speakerTokenHolder;
    }

    pushChat (role: AgentRole, displayName: string, msg: string, emotion?: string): void {
        const entry: ChatEntry = {
            timestamp: this.tick,
            speaker: role,
            display_name: displayName,
            msg,
            emotion,
        };
        this.chatHistory.push(entry);
        console.log(`[MessageBroker] Chat pushed: ${displayName} (${role}) @ tick ${this.tick}: "${msg}"`);

        for (const other of this.registeredAgents) {
            if (other !== role) {
                this.newMessagesSinceLastRead.add(other);
            }
        }
    }

    pushAction (role: AgentRole, command: AgentCommand): void {
        this.actionQueue.push({ role, command, timestamp: this.tick });
        console.log(`[MessageBroker] Action queued: ${role} -> ${command.type} @ tick ${this.tick}`);
    }

    drainActionQueue (): QueuedAction[] {
        const actions = [...this.actionQueue];
        this.actionQueue = [];
        if (actions.length > 0) {
            console.log(`[MessageBroker] Drained ${actions.length} action(s) from queue`);
        }
        return actions;
    }

    hasQueuedActions (): boolean {
        return this.actionQueue.length > 0;
    }

    getActionQueueLength (): number {
        return this.actionQueue.length;
    }

    getPendingActions (): { role: AgentRole; command: AgentCommand; tick: number }[] {
        return this.actionQueue.map(a => ({
            role: a.role,
            command: a.command,
            tick: a.timestamp,
        }));
    }

    getChatHistory (): ChatEntry[] {
        return this.collapseRepeatedMessages(this.chatHistory);
    }

    getRecentChat (count: number): ChatEntry[] {
        const collapsed = this.collapseRepeatedMessages(this.chatHistory);
        return collapsed.slice(-count);
    }

    getTick (): number {
        return this.tick;
    }

    reset (): void {
        console.log('[MessageBroker] reset()');
        this.state = null;
        this.chatHistory = [];
        this.actionQueue = [];
        this.tick = 0;
        this.speakerTokenHolder = null;
        this.speakerTokenPriority = 0;
        this.directorCrisisPriorityUntil = 0;
        this.newMessagesSinceLastRead.clear();
        this.registeredAgents.clear();
        this.standbyAgents.clear();
        this.standbyReasons.clear();
        this.cinematicPhase = false;
    }

    private collapseRepeatedMessages (chat: ChatEntry[]): ChatEntry[] {
        const result: ChatEntry[] = [];
        for (const entry of chat) {
            const last = result[result.length - 1];
            if (last && last.speaker === entry.speaker && last.speaker !== 'System' && last.msg === entry.msg) {
                // Same agent repeated the exact same message: keep the newest timestamp only
                result[result.length - 1] = entry;
                console.log(`[MessageBroker] Collapsed repeated message from ${entry.display_name}: "${entry.msg}"`);
            } else {
                result.push(entry);
            }
        }
        return result;
    }
}

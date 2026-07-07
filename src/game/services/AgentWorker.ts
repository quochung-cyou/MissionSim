import { MessageBroker } from './MessageBroker';
import { QwenClient, ChatMessage, AgentCommand } from './QwenClient';
import {
    AgentBinding,
    WorldState,
} from '../state/WorldState';
import { LevelConfig } from '../config/LevelConfig';
import { AgentRosterEntry } from './PromptBuilder';

const POLL_INTERVAL_MS = 1000;
const DIRECTOR_POLL_INTERVAL_MS = 500;
const DIRECTOR_PRIORITY_BONUS = 1_000_000;
const TOKEN_WAIT_MS = 500;
const MAX_CHAT_HISTORY_IN_PROMPT = 10;
const STANDBY_TIMEOUT_MS = 15_000;

const VALID_EMOTIONS = new Set(['calm', 'calm2', 'smile', 'attention', 'aggression', 'special']);

export class AgentWorker {
    private running = false;
    private hasCalledDuringCinematic = false;
    private wasStandby = false;
    private standbySince: number | null = null;
    private wokeFromStandbyTimeout = false;
    private readonly binding: AgentBinding;
    private readonly broker: MessageBroker;
    private readonly client: QwenClient;
    private readonly levelConfig: LevelConfig;
    private readonly roster: AgentRosterEntry[];
    private readonly getFreshState?: () => WorldState | null;
    private readonly pollIntervalMs: number;

    constructor (
        binding: AgentBinding,
        broker: MessageBroker,
        client: QwenClient,
        levelConfig: LevelConfig,
        roster: AgentRosterEntry[],
        getFreshState?: () => WorldState | null
    ) {
        this.binding = binding;
        this.broker = broker;
        this.client = client;
        this.levelConfig = levelConfig;
        this.roster = roster;
        this.getFreshState = getFreshState;
        this.pollIntervalMs = binding.role === 'Director' ? DIRECTOR_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
    }

    getRole (): string {
        return this.binding.agentId;
    }

    getDisplayName (): string {
        return this.binding.displayName;
    }

    start (): void {
        if (this.running) return;
        this.running = true;
        console.log(`[AgentWorker:${this.binding.agentId}] started (${this.binding.displayName})`);
        this.loop();
    }

    stop (): void {
        if (!this.running) return;
        this.running = false;
        console.log(`[AgentWorker:${this.binding.agentId}] stopped`);
    }

    private async loop (): Promise<void> {
        while (this.running) {
            try {
                await this.tick();
            } catch (e) {
                console.error(`[AgentWorker:${this.binding.agentId}] tick error:`, e);
            }
            await sleep(this.pollIntervalMs);
        }
    }

    private async tick (): Promise<void> {
        const state = this.getFreshState ? this.getFreshState() : this.broker.getState();
        if (!state) return;

        // Cinematic phase: allow exactly ONE API call per agent to hide latency,
        // then sleep until the cinematic ends.
        if (this.broker.isCinematicPhase()) {
            if (this.hasCalledDuringCinematic) {
                return;
            }
        } else {
            // Cinematic is over — reset the flag so normal polling resumes.
            this.hasCalledDuringCinematic = false;
        }

        // Standby check: if this agent is on standby, skip entirely.
        // They will be woken by the Broker when a meaningful event occurs.
        // Auto-wake after STANDBY_TIMEOUT_MS so the agent can re-evaluate.
        if (this.broker.isAgentStandby(this.binding.agentId)) {
            if (this.standbySince !== null && Date.now() - this.standbySince >= STANDBY_TIMEOUT_MS) {
                console.log(`[AgentWorker:${this.binding.agentId}] Standby timeout (${STANDBY_TIMEOUT_MS / 1000}s) — auto-waking to re-evaluate.`);
                this.broker.wakeAgent(this.binding.agentId);
                this.standbySince = null;
                this.wokeFromStandbyTimeout = true;
            } else {
                return;
            }
        }

        // If we were on standby but now we're not, clear the status label.
        if (this.wasStandby) {
            this.wasStandby = false;
            this.standbySince = null;
            this.binding.npc.hideStatus();
            console.log(`[AgentWorker:${this.binding.agentId}] Standby ended — status label cleared.`);
        }

        // Protocol 4.2: Strict Task Status Lock — if agent has any active task,
        // they are physically busy and cannot think, speak, or query the API.
        const agentState = state.agents[this.binding.agentId];
        if (!agentState || agentState.busy_time_remaining > 0) {
            return;
        }
        if (agentState.active_task && agentState.active_task !== 'none') {
            return;
        }

        // Trigger condition: alerts always trigger; new messages only trigger
        // when there are no active alerts (prevents chat ping-pong during crisis).
        const hasAlerts = state.system_alerts.length > 0;
        const hasNewMessages = this.broker.hasNewMessagesFor(this.binding.agentId);

        const needsToReact = hasAlerts || (hasNewMessages && !hasAlerts) || this.wokeFromStandbyTimeout;

        if (!needsToReact) {
            return;
        }

        this.wokeFromStandbyTimeout = false;

        console.log(`[AgentWorker:${this.binding.agentId}] Triggered — alerts=${hasAlerts}, newMessages=${hasNewMessages}`);

        // Protocol 4.1: Speaker Token (Mutex Lock)
        const priority = this.computePriority(state);
        if (!this.broker.requestSpeakerToken(this.binding.agentId, priority)) {
            console.log(`[AgentWorker:${this.binding.agentId}] Speaker token denied (priority=${priority}), waiting...`);
            await sleep(TOKEN_WAIT_MS);
            return;
        }

        console.log(`[AgentWorker:${this.binding.agentId}] Speaker token acquired (priority=${priority})`);

        try {
            // Compile prompt: Layer 1 (system) + Layer 2 (persona) + Layer 3 (dynamic context)
            const messages = this.compileMessages(state);
            console.log(`[AgentWorker:${this.binding.agentId}] Calling Qwen API with ${messages.length} messages...`);

            // Query Qwen API
            const response = await this.client.chatAndParse(messages);
            console.log(`[AgentWorker:${this.binding.agentId}] API response received:`, response);

            // Dispatch: push chat + action to broker
            if (response.speak) {
                const emotion = this.validateEmotion(response.emotion);
                this.broker.pushChat(this.binding.agentId, this.binding.displayName, response.speak, emotion);
                console.log(`[AgentWorker:${this.binding.agentId}] Chat pushed (emotion=${emotion}): "${response.speak}"`);
            }
            if (response.command && response.command.type !== 'none' && response.command.type !== 'standby') {
                this.broker.pushAction(this.binding.agentId, response.command);
                console.log(`[AgentWorker:${this.binding.agentId}] Action pushed: ${response.command.type}`, response.command);
            }

            // Mark messages as read
            this.broker.markMessagesRead(this.binding.agentId);

            // During cinematic phase, mark that we've made our one allowed call.
            if (this.broker.isCinematicPhase()) {
                this.hasCalledDuringCinematic = true;
                console.log(`[AgentWorker:${this.binding.agentId}] Cinematic call complete — sleeping until cinematic ends.`);
            }

            // If the agent chose to stand by, register them as standby.
            // They will not query the API again until woken by a game event.
            if (response.command && response.command.type === 'standby') {
                const reason = response.command.standby_reason ?? 'No reason provided';
                console.log(`[AgentWorker:${this.binding.agentId}] Entering standby: ${reason}`);
                this.broker.setAgentStandby(this.binding.agentId, reason);
                this.binding.npc.showStatus(`Standby: ${reason}`);
                this.wasStandby = true;
                this.standbySince = Date.now();
            }

            // If the agent chose none during a crisis (legacy fallback),
            // sleep for 5 seconds so it doesn't spam the API.
            if (response.command && response.command.type === 'none' && state.system_alerts.length > 0) {
                console.log(`[AgentWorker:${this.binding.agentId}] Yielding (none during crisis). Sleeping 5s.`);
                await sleep(5000);
            }
        } catch (error) {
            console.error(`[AgentWorker:${this.binding.agentId}] API call failed:`, error);
        } finally {
            this.broker.releaseSpeakerToken();
            console.log(`[AgentWorker:${this.binding.agentId}] Speaker token released`);
        }
    }

    private computePriority (state: WorldState): number {
        // Director always gets a massive base priority so they can coordinate first.
        const basePriority = this.binding.role === 'Director' ? DIRECTOR_PRIORITY_BONUS : 0;

        if (state.system_alerts.length === 0) return basePriority;

        // Higher priority for agents closer to the crisis
        let maxPriority = 0;
        const myX = state.agents[this.binding.agentId]?.x ?? 0;

        for (const alert of state.system_alerts) {
            const xMatch = alert.match(/x=(\d+)/);
            if (xMatch) {
                const crisisX = parseInt(xMatch[1], 10);
                const distance = Math.abs(myX - crisisX);
                const priority = 10000 - distance;
                if (priority > maxPriority) {
                    maxPriority = priority;
                }
            }
        }
        return basePriority + maxPriority;
    }

    private validateEmotion (emotion: string | undefined): string {
        if (emotion && VALID_EMOTIONS.has(emotion)) {
            return emotion;
        }
        return 'calm';
    }

    private formatPendingActions (actions: { role: string; command: AgentCommand; tick: number }[]): string {
        return actions.map(a => {
            const cmd = a.command;
            let details = cmd.type;
            if (cmd.type === 'move') {
                details += ` to x=${cmd.target_x}${cmd.mode === 'run' ? ' (run)' : ''}`;
                if (cmd.sub_action) {
                    details += `, then ${cmd.sub_action.type}${cmd.sub_action.machine ? ` @ ${cmd.sub_action.machine}` : ''}`;
                }
            } else if (cmd.machine) {
                details += ` @ ${cmd.machine}`;
            } else if (cmd.allocations) {
                const { Crane, Mach_1, Mach_2 } = cmd.allocations;
                details += ` [Crane=${Crane}, Mach_1=${Mach_1}, Mach_2=${Mach_2}]`;
            }
            return `- ${a.role}: ${details} (queued @ tick ${a.tick})`;
        }).join('\n');
    }

    private compileMessages (state: WorldState): ChatMessage[] {
        // Layer 1 + Layer 2: System prompt with persona
        const systemMsg = this.client.buildSystemMessage({
            levelConfig: this.levelConfig,
            scientistSet: this.binding.scientistSet,
            agentId: this.binding.agentId,
            displayName: this.binding.displayName,
            roster: this.roster,
        });

        // Layer 3: Dynamic context — stringified world state
        // Strip chat_history from the JSON because the recent dialogue is already injected above.
        const { chat_history: _, ...stateForPrompt } = state;
        const stateJson = JSON.stringify(stateForPrompt, null, 2);

        const pendingActions = this.broker.getPendingActions();
        const pendingText = pendingActions.length > 0
            ? this.formatPendingActions(pendingActions)
            : '(none)';

        const userContent = `## CURRENT WORLD STATE\n\`\`\`json\n${stateJson}\n\`\`\`\n\n## PENDING ACTIONS (already decided by agents, not yet executed)\n${pendingText}\n\nWhen choosing an action, check the pending actions above. If another agent is already moving to handle a machine or crisis, do not duplicate the effort — choose a different target or go on standby.\n\nBased on the world rules and your persona, output your decision in the specified JSON format.`;

        // Include recent chat history as assistant/user context
        const messages: ChatMessage[] = [systemMsg];

        // If this agent just auto-woke from a standby timeout, remind it to re-verify the situation.
        if (this.wokeFromStandbyTimeout) {
            messages.push({
                role: 'user',
                content: `[STANDBY WAKE-UP REMINDER] You were on standby for approximately 10 seconds and have now been woken. Before acting, re-verify the plan: is your original standby reason still valid? Has the situation improved (e.g., another agent finished the task, the crisis passed, or the machine is now free)? Did you previously miscalculate distances, power, or another agent's intent? Base your next command on the CURRENT world state, not the state from 10 seconds ago. If you speak, briefly note how long you stood by and what changed.`,
            });
        }

        const recentChat = this.broker.getRecentChat(MAX_CHAT_HISTORY_IN_PROMPT);
        for (const entry of recentChat) {
            if (entry.speaker === 'System') {
                messages.push({ role: 'user', content: `[SYSTEM ALERT] ${entry.msg}` });
            } else if (entry.speaker === this.binding.agentId) {
                messages.push({ role: 'assistant', content: entry.msg });
            } else {
                messages.push({ role: 'user', content: `[${entry.display_name}]: ${entry.msg}` });
            }
        }

        // Surface any rejection from the agent's last action so it can correct itself
        const myState = state.agents[this.binding.agentId];
        if (myState?.last_action_error) {
            messages.push({
                role: 'user',
                content: `[ACTION CORRECTION] Last time your action was rejected because: ${myState.last_action_error}. Do not repeat the same mistake; base your next command on the current world state.`,
            });
        }

        messages.push({ role: 'user', content: userContent });

        return messages;
    }
}

function sleep (ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

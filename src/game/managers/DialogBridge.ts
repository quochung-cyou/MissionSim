import { DialogService } from '../services/DialogService';
import { MessageBroker } from '../services/MessageBroker';
import { AgentBinding } from '../state/WorldState';

export class DialogBridge {
    private shownAlerts: Set<string> = new Set();

    constructor (
        private readonly broker: MessageBroker,
        private readonly bindings: AgentBinding[],
    ) {}

    setDialogService (_dialogService: DialogService): void {
        // DialogService is passed in update calls
    }

    update (dialogService: DialogService | null): void {
        if (!dialogService) return;

        const currentTick = this.broker.getTick();
        const recentChat = this.broker.getRecentChat(10);
        for (const entry of recentChat) {
            const key = `${entry.timestamp}_${entry.speaker}`;
            if (this.shownAlerts.has(key)) continue;

            const gap = currentTick - entry.timestamp;
            if (entry.speaker === 'System') {
                if (entry.msg.includes('hasCrisis:')) {
                    this.shownAlerts.add(key);
                    continue;
                }
                dialogService.enqueueSystemMessage(entry.msg, entry.timestamp);
                this.shownAlerts.add(key);
                console.log(`[DialogBridge] System alert enqueued @ tick ${currentTick} (spoken @ tick ${entry.timestamp}, gap=${gap} ticks): ${entry.msg}`);
            } else {
                const binding = this.bindings.find(b => b.agentId === entry.speaker);
                const displayName = entry.display_name;
                const scientistSet = binding?.scientistSet ?? 1;
                dialogService.enqueueAgentMessage(displayName, entry.msg, scientistSet, entry.emotion, entry.timestamp);
                this.shownAlerts.add(key);
                console.log(`[DialogBridge] Agent dialogue enqueued @ tick ${currentTick} (spoken @ tick ${entry.timestamp}, gap=${gap} ticks): ${displayName}: ${entry.msg}`);
            }
        }
    }

    reset (): void {
        this.shownAlerts.clear();
    }
}

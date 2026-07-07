import { IMechanic, MechanicContext } from './IMechanic';
import { IPowerConsumer } from './ITargets';
import { GameEvents } from '../events/GameEvents';

export interface PowerDistributionConfig {
    maxPower: number;
    toggleWindowMs: number;
    maxTogglesBeforeTrip: number;
}

interface AllocationEntry {
    consumer: IPowerConsumer;
    amount: number;
}

export class PowerDistributionMechanic implements IMechanic {
    private readonly cfg: PowerDistributionConfig;
    private readonly entries: AllocationEntry[] = [];
    private toggleTimestamps: number[] = [];
    private breakerTripped = false;

    constructor (config: Partial<PowerDistributionConfig> = {}) {
        this.cfg = {
            maxPower: 100,
            toggleWindowMs: 10000,
            maxTogglesBeforeTrip: 3,
            ...config
        };
    }

    register (consumer: IPowerConsumer, initialAllocation: number = 0): void {
        this.entries.push({ consumer, amount: initialAllocation });
        consumer.setPowerAllocated(initialAllocation);
    }

    allocate (index: number, amount: number): void {
        const entry = this.entries[index];
        if (!entry) return;

        const clamped = Math.max(0, Math.min(entry.consumer.getMaxPower(), amount));
        entry.amount = clamped;
        entry.consumer.setPowerAllocated(clamped);

        this.recordToggle();
    }

    private recordToggle (): void {
        const now = Date.now();
        this.toggleTimestamps.push(now);
        this.toggleTimestamps = this.toggleTimestamps.filter(
            ts => now - ts <= this.cfg.toggleWindowMs
        );

        if (this.toggleTimestamps.length > this.cfg.maxTogglesBeforeTrip) {
            this.breakerTripped = true;
        }
    }

    isBreakerTripped (): boolean {
        return this.breakerTripped;
    }

    resetBreaker (): void {
        this.breakerTripped = false;
        this.toggleTimestamps = [];
    }

    tripBreaker (): void {
        this.breakerTripped = true;
        this.toggleTimestamps = [];
    }

    tick (_deltaSeconds: number, ctx: MechanicContext): void {
        const available = ctx.state.basePowerCapacity;
        const totalAllocated = this.entries.reduce((sum, e) => sum + e.amount, 0);

        if (totalAllocated > available) {
            const ratio = available / totalAllocated;
            this.entries.forEach(entry => {
                const reduced = Math.floor(entry.amount * ratio);
                entry.consumer.setPowerAllocated(reduced);
            });
        }

        this.entries.forEach((entry, index) => {
            ctx.bus.emit(GameEvents.PowerAllocated, { index, amount: entry.amount });
        });
    }

    getAllocations (): number[] {
        return this.entries.map(e => e.amount);
    }

    getEntryCount (): number {
        return this.entries.length;
    }
}

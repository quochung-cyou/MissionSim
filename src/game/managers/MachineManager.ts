import { Machine } from '../entities/Machine';
import { MechanicContext } from '../mechanics/IMechanic';
import { GameState } from '../state/GameState';
import { GameEventBus } from '../events/GameEventBus';
import { FailureManager } from '../failures/FailureManager';

export class MachineManager {
    private readonly machines: Machine[] = [];
    private readonly ctx: MechanicContext;
    private tickAccumulator = 0;
    private readonly tickInterval = 1000;

    constructor (
        state: GameState,
        bus: GameEventBus,
        private readonly failureManager: FailureManager
    ) {
        this.ctx = { state, bus };
    }

    add (machine: Machine): void {
        this.machines.push(machine);
    }

    tick (deltaMs: number): void {
        this.tickAccumulator += deltaMs;

        while (this.tickAccumulator >= this.tickInterval) {
            const deltaSeconds = this.tickInterval / 1000;
            this.tickAccumulator -= this.tickInterval;

            for (const machine of this.machines) {
                machine.tick(deltaSeconds, this.ctx);
            }

            this.failureManager.tick(deltaSeconds, this.ctx);

            for (const machine of this.machines) {
                machine.updateDisplay();
            }
        }
    }

    getMachines (): Machine[] {
        return this.machines;
    }

    getMachineAt (x: number, tolerance: number = 50): Machine | undefined {
        return this.machines.find(m => Math.abs(m.getX() - x) < tolerance);
    }

    notifyAgentAt (x: number): void {
        const deltaSeconds = 1;
        this.failureManager.notifyAgentAt(x, deltaSeconds, this.ctx);
    }
}

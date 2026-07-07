import { Failure } from './Failure';
import { MechanicContext } from '../mechanics/IMechanic';

export class FailureManager {
    private readonly failures: Failure[] = [];

    add (failure: Failure): void {
        this.failures.push(failure);
    }

    tick (deltaSeconds: number, ctx: MechanicContext): void {
        for (const failure of this.failures) {
            failure.tick(deltaSeconds, ctx);
        }
    }

    notifyAgentAt (x: number, deltaSeconds: number, ctx: MechanicContext): void {
        for (const failure of this.failures) {
            if (failure.canFixAt(x)) {
                failure.tryFix(deltaSeconds, ctx);
            } else {
                failure.cancelFix();
            }
        }
    }

    getActiveFailures (): Failure[] {
        return this.failures.filter(f => f.isActive);
    }

    getFailure (type: string): Failure | undefined {
        return this.failures.find(f => f.type === type);
    }

    hasActiveFailure (type: string): boolean {
        return this.failures.some(f => f.type === type && f.isActive);
    }
}

import { Failure } from './Failure';
import { MechanicContext } from '../mechanics/IMechanic';
import { PowerDistributionMechanic } from '../mechanics/PowerDistributionMechanic';

export interface CoolantLockoutConfig {
    fixPositionX: number;
    fixDuration: number;
}

export class CoolantLockout extends Failure {
    readonly type = 'COOLANT_LOCKOUT';
    readonly fixPositionX: number;
    readonly fixDuration: number;

    constructor (
        private readonly powerDist: PowerDistributionMechanic,
        private readonly onLockout: () => void,
        private readonly onUnlock: () => void,
        config: CoolantLockoutConfig
    ) {
        super();
        this.fixPositionX = config.fixPositionX;
        this.fixDuration = config.fixDuration;
    }

    checkTrigger (_deltaSeconds: number, _ctx: MechanicContext): boolean {
        return this.powerDist.isBreakerTripped();
    }

    applyEffect (_deltaSeconds: number, _ctx: MechanicContext): void {
        this.onLockout();
    }

    resolveEffect (_ctx: MechanicContext): void {
        this.powerDist.resetBreaker();
        this.onUnlock();
    }

    getAlertMessage (_ctx: MechanicContext): string {
        return `COOLANT_LOCKOUT: power distribution breaker tripped at position x=${this.fixPositionX}. Coolant pump is locked out and reactor heat will rise until repaired.`;
    }
}

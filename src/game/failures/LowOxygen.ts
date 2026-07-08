import { Failure } from './Failure';
import { MechanicContext } from '../mechanics/IMechanic';
import { GameState } from '../state/GameState';

export interface LowOxygenConfig {
    threshold: number;
}

export class LowOxygen extends Failure {
    readonly type = 'LOW_OXYGEN';
    readonly fixPositionX = -1;
    readonly fixDuration = Infinity;

    private readonly threshold: number;

    constructor (
        private readonly gameState: GameState,
        config: LowOxygenConfig
    ) {
        super();
        this.threshold = config.threshold;
    }

    checkTrigger (_deltaSeconds: number, _ctx: MechanicContext): boolean {
        return this.gameState.globalOxygen <= this.threshold;
    }

    applyEffect (_deltaSeconds: number, _ctx: MechanicContext): void {
        // Low oxygen is a passive crisis state; no additional effect beyond the alert.
    }

    resolveEffect (_ctx: MechanicContext): void {
        // Resolves automatically when oxygen rises above threshold.
    }

    canFixAt (_x: number): boolean {
        return false;
    }

    getAlertMessage (_ctx: MechanicContext): string {
        return `LOW_OXYGEN: oxygen level ${Math.round(this.gameState.globalOxygen)}% is at or below the safe threshold of ${this.threshold}%`;
    }
}

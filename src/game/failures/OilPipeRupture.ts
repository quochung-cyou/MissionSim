import { Failure } from './Failure';
import { MechanicContext } from '../mechanics/IMechanic';
import { IHeatTarget } from '../mechanics/ITargets';

export interface OilPipeRuptureConfig {
    fixPositionX: number;
    fixDuration: number;
    heatThreshold: number;
    triggerDurationMs: number;
    drainRate: number;
}

export class OilPipeRupture extends Failure {
    readonly type = 'OIL_PIPE_RUPTURE';
    readonly fixPositionX: number;
    readonly fixDuration: number;

    private heatAboveThresholdMs = 0;
    private readonly heatThreshold: number;
    private readonly triggerDurationMs: number;
    private readonly drainRate: number;

    constructor (private readonly reactor: IHeatTarget, config: OilPipeRuptureConfig) {
        super();
        this.fixPositionX = config.fixPositionX;
        this.fixDuration = config.fixDuration;
        this.heatThreshold = config.heatThreshold;
        this.triggerDurationMs = config.triggerDurationMs;
        this.drainRate = config.drainRate;
    }

    checkTrigger (_deltaSeconds: number, _ctx: MechanicContext): boolean {
        if (this.reactor.getHeat() > this.heatThreshold) {
            this.heatAboveThresholdMs += _deltaSeconds * 1000;
        } else {
            this.heatAboveThresholdMs = 0;
        }
        return this.heatAboveThresholdMs >= this.triggerDurationMs;
    }

    applyEffect (deltaSeconds: number, ctx: MechanicContext): void {
        ctx.state.oilLevel = ctx.state.oilLevel - this.drainRate * deltaSeconds;
    }

    resolveEffect (_ctx: MechanicContext): void {
        this.heatAboveThresholdMs = 0;
    }

    getAlertMessage (_ctx: MechanicContext): string {
        const currentHeat = Math.round(this.reactor.getHeat());
        const accumulated = Math.round(this.heatAboveThresholdMs / 100) / 10;
        const triggerSeconds = Math.round(this.triggerDurationMs / 100) / 10;
        return `OIL_PIPE_RUPTURE: Mach-3 heat stayed above threshold ${this.heatThreshold}°C (current: ${currentHeat}°C). Pipe ruptured after ${accumulated}s of overload (threshold: ${triggerSeconds}s).`;
    }
}

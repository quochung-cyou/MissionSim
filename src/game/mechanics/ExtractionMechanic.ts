import { IMechanic, MechanicContext } from './IMechanic';
import { IExtractionTarget } from './ITargets';
import { GameEvents } from '../events/GameEvents';

export interface ExtractionMechanicConfig {
    progressRate: number;
    minPowerRequired: number;
}

export class ExtractionMechanic implements IMechanic {
    private readonly cfg: ExtractionMechanicConfig;

    constructor (
        private readonly crane: IExtractionTarget,
        config: Partial<ExtractionMechanicConfig> = {}
    ) {
        this.cfg = {
            progressRate: 1,
            minPowerRequired: 60,
            ...config
        };
    }

    tick (deltaSeconds: number, ctx: MechanicContext): void {
        if (ctx.state.basePowerCapacity <= 0) return;
        if (this.crane.getPowerAllocated() < this.cfg.minPowerRequired) return;

        const newProgress = this.crane.getExtractionProgress() + this.cfg.progressRate * deltaSeconds;
        const clamped = Math.min(100, newProgress);
        this.crane.setExtractionProgress(clamped);

        ctx.bus.emit(GameEvents.ExtractionProgress, clamped);

        if (clamped >= 100) {
            ctx.bus.emit(GameEvents.GameWin);
        }
    }

    getProgress (): number {
        return this.crane.getExtractionProgress();
    }

    getMinPowerRequired (): number {
        return this.cfg.minPowerRequired;
    }
}

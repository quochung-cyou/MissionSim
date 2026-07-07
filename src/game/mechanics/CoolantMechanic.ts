import { IMechanic, MechanicContext } from './IMechanic';
import { IHeatTarget, IPowerConsumer } from './ITargets';

export interface CoolantMechanicConfig {
    coolingEfficiency: number;
}

export class CoolantMechanic implements IMechanic {
    private readonly cfg: CoolantMechanicConfig;

    constructor (
        private readonly pump: IPowerConsumer,
        private readonly reactor: IHeatTarget,
        config: Partial<CoolantMechanicConfig> = {}
    ) {
        this.cfg = {
            coolingEfficiency: 0.5,
            ...config
        };
    }

    tick (deltaSeconds: number, _ctx: MechanicContext): void {
        if (this.pump.isLockedOut()) return;

        const cooling = this.pump.getPowerAllocated() * this.cfg.coolingEfficiency;
        this.reactor.addHeat(-cooling * deltaSeconds);
    }

    getCoolingOutput (): number {
        if (this.pump.isLockedOut()) return 0;
        return this.pump.getPowerAllocated() * this.cfg.coolingEfficiency;
    }
}

import { IMechanic, MechanicContext } from './IMechanic';
import { IPowerConsumer } from './ITargets';

export interface OxygenMechanicConfig {
    oxygenEfficiency: number;
    drainRate: number;
}

export class OxygenMechanic implements IMechanic {
    private readonly cfg: OxygenMechanicConfig;

    constructor (
        private readonly generator: IPowerConsumer,
        config: Partial<OxygenMechanicConfig> = {}
    ) {
        this.cfg = {
            oxygenEfficiency: 0.05,
            drainRate: 1,
            ...config
        };
    }

    tick (deltaSeconds: number, ctx: MechanicContext): void {
        const drain = this.cfg.drainRate * deltaSeconds;
        const output = this.generator.getPowerAllocated() * this.cfg.oxygenEfficiency * deltaSeconds;

        if (output > 0) {
            const before = ctx.state.globalOxygen;
            ctx.state.globalOxygen = before - drain + output;
            const after = ctx.state.globalOxygen;
            console.log(`[OxygenMechanic] power=${this.generator.getPowerAllocated()} output=+${output.toFixed(3)} drain=-${drain.toFixed(3)} | O2: ${before.toFixed(2)} -> ${after.toFixed(2)}`);
        } else {
            ctx.state.globalOxygen = ctx.state.globalOxygen - drain + output;
        }
    }

    getOxygenOutput (): number {
        return this.generator.getPowerAllocated() * this.cfg.oxygenEfficiency;
    }
}

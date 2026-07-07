import { IMechanic, MechanicContext } from './IMechanic';
import { IHeatTarget } from './ITargets';

export interface ReactorMechanicConfig {
    fuelConsumptionRate: number;
    heatGenerationRate: number;
    powerOutput: number;
    maxHeat: number;
    baseHeat: number;
}

export class ReactorMechanic implements IMechanic, IHeatTarget {
    private status: 'ON' | 'OFF' = 'ON';
    private heat: number;
    private readonly cfg: ReactorMechanicConfig;

    constructor (
        config: Partial<ReactorMechanicConfig> = {}
    ) {
        this.cfg = {
            fuelConsumptionRate: 10,
            heatGenerationRate: 20,
            powerOutput: 100,
            maxHeat: 1000,
            baseHeat: 40,
            ...config
        };
        this.heat = this.cfg.baseHeat;
    }

    tick (deltaSeconds: number, ctx: MechanicContext): void {
        if (this.status === 'OFF' || ctx.state.isOilDepleted()) {
            this.status = 'OFF';
            ctx.state.basePowerCapacity = 0;
            return;
        }

        ctx.state.consumeOil(this.cfg.fuelConsumptionRate * deltaSeconds);

        if (ctx.state.isOilDepleted()) {
            this.status = 'OFF';
            ctx.state.basePowerCapacity = 0;
            return;
        }

        this.heat += this.cfg.heatGenerationRate * deltaSeconds;

        ctx.state.basePowerCapacity = this.cfg.powerOutput;
    }

    getStatus (): 'ON' | 'OFF' {
        return this.status;
    }

    getHeat (): number {
        return this.heat;
    }

    setHeat (value: number): void {
        this.heat = value;
    }

    addHeat (amount: number): void {
        this.heat = Math.max(0, this.heat + amount);
    }

    getPowerOutput (): number {
        return this.cfg.powerOutput;
    }

    getMaxHeat (): number {
        return this.cfg.maxHeat;
    }

    shutdown (): void {
        this.status = 'OFF';
    }

    restart (): void {
        this.status = 'ON';
    }
}

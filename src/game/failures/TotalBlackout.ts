import { Failure } from './Failure';
import { MechanicContext } from '../mechanics/IMechanic';

export class TotalBlackout extends Failure {
    readonly type = 'TOTAL_BLACKOUT';
    readonly fixPositionX = -1;
    readonly fixDuration = Infinity;

    checkTrigger (_deltaSeconds: number, ctx: MechanicContext): boolean {
        return ctx.state.isOilDepleted();
    }

    applyEffect (_deltaSeconds: number, ctx: MechanicContext): void {
        ctx.state.basePowerCapacity = 0;
    }

    resolveEffect (_ctx: MechanicContext): void {}

    getAlertMessage (ctx: MechanicContext): string {
        return `TOTAL_BLACKOUT: oil reserves depleted (${Math.round(ctx.state.oilLevel)}/${ctx.state.maxOilLevel}). Base power capacity dropped to 0 and all systems are shutting down.`;
    }

    canFixAt (_x: number): boolean {
        return false;
    }
}

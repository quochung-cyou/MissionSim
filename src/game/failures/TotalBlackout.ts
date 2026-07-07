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

    canFixAt (_x: number): boolean {
        return false;
    }
}

import { MechanicContext } from '../mechanics/IMechanic';
import { GameEvents } from '../events/GameEvents';

export abstract class Failure {
    protected active = false;
    protected fixProgress = 0;

    abstract readonly type: string;
    abstract readonly fixPositionX: number;
    abstract readonly fixDuration: number;

    get isActive (): boolean {
        return this.active;
    }

    abstract checkTrigger (deltaSeconds: number, ctx: MechanicContext): boolean;

    abstract applyEffect (deltaSeconds: number, ctx: MechanicContext): void;

    abstract resolveEffect (ctx: MechanicContext): void;

    abstract getAlertMessage (ctx: MechanicContext): string;

    tick (deltaSeconds: number, ctx: MechanicContext): void {
        if (!this.active) {
            if (this.checkTrigger(deltaSeconds, ctx)) {
                this.active = true;
                this.fixProgress = 0;
                ctx.bus.emit(GameEvents.FailureTriggered, this.type);
            }
        } else {
            this.applyEffect(deltaSeconds, ctx);
        }
    }

    tryFix (deltaSeconds: number, ctx: MechanicContext): void {
        if (!this.active) return;
        this.fixProgress += deltaSeconds;
        if (this.fixProgress >= this.fixDuration) {
            this.active = false;
            this.fixProgress = 0;
            this.resolveEffect(ctx);
            ctx.bus.emit(GameEvents.FailureResolved, this.type);
        }
    }

    forceActivate (): void {
        this.active = true;
        this.fixProgress = 0;
    }

    forceDeactivate (ctx: MechanicContext): void {
        if (!this.active) return;
        this.active = false;
        this.fixProgress = 0;
        this.resolveEffect(ctx);
        ctx.bus.emit(GameEvents.FailureResolved, this.type);
    }

    cancelFix (): void {
        this.fixProgress = 0;
    }

    getFixProgress (): number {
        return this.fixDuration > 0 ? this.fixProgress / this.fixDuration : 0;
    }

    canFixAt (x: number): boolean {
        return this.active && Math.abs(x - this.fixPositionX) < 50;
    }
}

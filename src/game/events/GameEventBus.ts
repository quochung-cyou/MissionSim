import { Events } from 'phaser';
import { GameEvent } from './GameEvents';

type Handler = (payload?: unknown) => void;

export class GameEventBus {
    private readonly emitter = new Events.EventEmitter();

    emit (event: GameEvent, payload?: unknown): void {
        this.emitter.emit(event, payload);
    }

    on (event: GameEvent, handler: Handler): this {
        this.emitter.on(event, handler);
        return this;
    }

    off (event: GameEvent, handler: Handler): this {
        this.emitter.off(event, handler);
        return this;
    }

    once (event: GameEvent, handler: Handler): this {
        this.emitter.once(event, handler);
        return this;
    }

    destroy (): void {
        this.emitter.destroy();
    }
}

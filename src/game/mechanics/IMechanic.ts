import { GameState } from '../state/GameState';
import { GameEventBus } from '../events/GameEventBus';

export interface MechanicContext {
    state: GameState;
    bus: GameEventBus;
}

export interface IMechanic {
    tick (deltaSeconds: number, ctx: MechanicContext): void;
}

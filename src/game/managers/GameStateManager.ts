import { GameState } from '../state/GameState';
import { GameEventBus } from '../events/GameEventBus';
import { GameEvents } from '../events/GameEvents';
import { Reactor } from '../entities/machines/Reactor';
import { Crane } from '../entities/machines/Crane';

export type GameEndReason = 'meltdown' | 'suffocation' | 'starvation' | 'win' | null;

export class GameStateManager {
    private reactor?: Reactor;
    private crane?: Crane;
    private gameEnded = false;
    private endReason: GameEndReason = null;

    constructor (
        private readonly state: GameState,
        private readonly bus: GameEventBus
    ) {
        this.bus.on(GameEvents.GameWin, () => {
            if (this.gameEnded) return;
            this.gameEnded = true;
            this.endReason = 'win';
        });
    }

    setReactor (reactor: Reactor): void {
        this.reactor = reactor;
    }

    setCrane (crane: Crane): void {
        this.crane = crane;
    }

    tick (_deltaMs: number): GameEndReason {
        if (this.gameEnded) return this.endReason;

        if (this.reactor && this.reactor.getHeat() >= this.reactor.getMaxHeat()) {
            this.gameEnded = true;
            this.endReason = 'meltdown';
            this.bus.emit(GameEvents.GameOver, this.endReason);
            return this.endReason;
        }

        if (this.state.isOxygenDepleted()) {
            this.gameEnded = true;
            this.endReason = 'suffocation';
            this.bus.emit(GameEvents.GameOver, this.endReason);
            return this.endReason;
        }

        if (this.state.isOilDepleted() && this.crane && this.crane.getExtractionProgress() < 100) {
            this.gameEnded = true;
            this.endReason = 'starvation';
            this.bus.emit(GameEvents.GameOver, this.endReason);
            return this.endReason;
        }

        return null;
    }

    getEndReason (): GameEndReason {
        return this.endReason;
    }

    isGameEnded (): boolean {
        return this.gameEnded;
    }
}

import { GameEventBus } from '../events/GameEventBus';
import { GameEvents } from '../events/GameEvents';

export interface GameStateConfig {
    globalOxygen: number;
    oilLevel: number;
    maxOilLevel: number;
    basePower: number;
}

export class GameState {
    private oxygen: number;
    private oil: number;
    private maxOil: number;
    private power: number;

    constructor (private readonly bus: GameEventBus, config: GameStateConfig) {
        this.oxygen = config.globalOxygen;
        this.oil = config.oilLevel;
        this.maxOil = config.maxOilLevel;
        this.power = config.basePower;
    }

    get globalOxygen (): number {
        return this.oxygen;
    }

    set globalOxygen (value: number) {
        const clamped = Math.max(0, Math.min(100, value));
        if (this.oxygen === clamped) return;
        this.oxygen = clamped;
        this.bus.emit(GameEvents.OxygenChanged, this.oxygen);
    }

    get oilLevel (): number {
        return this.oil;
    }

    set oilLevel (value: number) {
        const clamped = Math.max(0, Math.min(this.maxOil, value));
        if (this.oil === clamped) return;
        this.oil = clamped;
        this.bus.emit(GameEvents.OilChanged, { level: this.oil, max: this.maxOil });
    }

    get maxOilLevel (): number {
        return this.maxOil;
    }

    get basePowerCapacity (): number {
        return this.power;
    }

    set basePowerCapacity (value: number) {
        const clamped = Math.max(0, Math.min(100, value));
        if (this.power === clamped) return;
        this.power = clamped;
        this.bus.emit(GameEvents.PowerChanged, this.power);
    }

    consumeOil (amount: number): void {
        this.oilLevel = this.oil - amount;
    }

    isOilDepleted (): boolean {
        return this.oil <= 0;
    }

    isOxygenDepleted (): boolean {
        return this.oxygen <= 0;
    }
}

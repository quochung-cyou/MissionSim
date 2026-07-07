import { LevelConfig } from '../config/LevelConfig';
import { OilReserve } from '../entities/OilReserve';
import { Reactor } from '../entities/machines/Reactor';
import { CoolantPump } from '../entities/machines/CoolantPump';
import { OxygenGenerator } from '../entities/machines/OxygenGenerator';
import { SubSystemTerminal } from '../entities/machines/SubSystemTerminal';
import { Crane } from '../entities/machines/Crane';
import { GameState } from '../state/GameState';
import { GameEventBus } from '../events/GameEventBus';

const GROUND_Y = 448;

export class EnergyObjectManager {
    private oilReserve?: OilReserve;
    private reactor?: Reactor;
    private coolantPump?: CoolantPump;
    private oxygenGenerator?: OxygenGenerator;
    private terminal?: SubSystemTerminal;
    private crane?: Crane;

    spawn (scene: Phaser.Scene, config: LevelConfig, state: GameState, bus: GameEventBus): void {
        const mc = config.machineConfig;
        const pos = mc.positions;

        this.reactor = new Reactor(scene, GROUND_Y, pos.reactor, mc.reactor);
        this.coolantPump = new CoolantPump(scene, GROUND_Y, this.reactor, mc.coolantPump.maxPower, pos.coolantPump, mc.coolantPump.coolingPerPower);
        this.oxygenGenerator = new OxygenGenerator(scene, GROUND_Y, mc.oxygenGenerator.maxPower, pos.oxygenGenerator, mc.oxygenGenerator.oxygenPerPower, mc.oxygenGenerator.nativeDrainRate);
        this.crane = new Crane(scene, GROUND_Y, mc.crane.maxPower, pos.crane, mc.crane.powerRequired);
        this.terminal = new SubSystemTerminal(scene, GROUND_Y, pos.terminal);
        this.oilReserve = new OilReserve(scene, pos.oilReserve, GROUND_Y, state, bus);

        this.terminal.registerConsumer(this.coolantPump, 0);
        this.terminal.registerConsumer(this.oxygenGenerator, 0);
        this.terminal.registerConsumer(this.crane, 0);
    }

    getOilReserve (): OilReserve | undefined {
        return this.oilReserve;
    }

    getReactor (): Reactor | undefined {
        return this.reactor;
    }

    getCoolantPump (): CoolantPump | undefined {
        return this.coolantPump;
    }

    getOxygenGenerator (): OxygenGenerator | undefined {
        return this.oxygenGenerator;
    }

    getTerminal (): SubSystemTerminal | undefined {
        return this.terminal;
    }

    getCrane (): Crane | undefined {
        return this.crane;
    }
}

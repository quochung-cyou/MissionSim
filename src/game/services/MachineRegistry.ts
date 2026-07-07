import { Machine } from '../entities/Machine';
import { MachineId } from '../constants/MachineId';
import { SubSystemTerminal } from '../entities/machines/SubSystemTerminal';
import { Reactor } from '../entities/machines/Reactor';
import { Crane } from '../entities/machines/Crane';
import { CoolantPump } from '../entities/machines/CoolantPump';
import { OxygenGenerator } from '../entities/machines/OxygenGenerator';
import { OilReserve } from '../entities/OilReserve';

interface MachineEntry {
    machine: Machine | null;
    oilReserve: OilReserve | null;
    x: number;
}

export class MachineRegistry {
    private readonly entries = new Map<MachineId, MachineEntry>();
    private readonly terminalRef: SubSystemTerminal;
    private readonly reactorRef: Reactor;
    private readonly craneRef: Crane;
    private readonly coolantPumpRef: CoolantPump;
    private readonly oxygenGeneratorRef: OxygenGenerator;
    private readonly oilReserveRef: OilReserve;

    constructor (
        terminal: SubSystemTerminal,
        reactor: Reactor,
        crane: Crane,
        coolantPump: CoolantPump,
        oxygenGenerator: OxygenGenerator,
        oilReserve: OilReserve,
    ) {
        this.terminalRef = terminal;
        this.reactorRef = reactor;
        this.craneRef = crane;
        this.coolantPumpRef = coolantPump;
        this.oxygenGeneratorRef = oxygenGenerator;
        this.oilReserveRef = oilReserve;

        this.registerMachine(MachineId.Crane, crane);
        this.registerMachine(MachineId.CoolantPump, coolantPump);
        this.registerMachine(MachineId.OxygenGenerator, oxygenGenerator);
        this.registerMachine(MachineId.Reactor, reactor);
        this.registerMachine(MachineId.Terminal, terminal);
        this.registerOilReserve(MachineId.OilReserve, oilReserve);
    }

    private registerMachine (id: MachineId, machine: Machine): void {
        this.entries.set(id, { machine, oilReserve: null, x: machine.getX() });
    }

    private registerOilReserve (id: MachineId, oilReserve: OilReserve): void {
        this.entries.set(id, { machine: null, oilReserve, x: oilReserve.getX() });
    }

    get (id: MachineId): Machine | undefined {
        return this.entries.get(id)?.machine ?? undefined;
    }

    getX (id: MachineId): number {
        return this.entries.get(id)?.x ?? 0;
    }

    getTerminal (): SubSystemTerminal {
        return this.terminalRef;
    }

    getReactor (): Reactor {
        return this.reactorRef;
    }

    getCrane (): Crane {
        return this.craneRef;
    }

    getCoolantPump (): CoolantPump {
        return this.coolantPumpRef;
    }

    getOxygenGenerator (): OxygenGenerator {
        return this.oxygenGeneratorRef;
    }

    getOilReserve (): OilReserve {
        return this.oilReserveRef;
    }

    all (): Machine[] {
        const result: Machine[] = [];
        for (const entry of this.entries.values()) {
            if (entry.machine) result.push(entry.machine);
        }
        return result;
    }
}

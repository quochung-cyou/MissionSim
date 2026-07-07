import { DialogService } from '../services/DialogService';
import { MachineRegistry } from '../services/MachineRegistry';
import { MachineId } from '../constants/MachineId';
import { LevelConfig } from '../config/LevelConfig';
import { GameState } from '../state/GameState';
import { Reactor } from '../entities/machines/Reactor';
import { SubSystemTerminal } from '../entities/machines/SubSystemTerminal';

export interface CinematicAlert {
    text: string;
    cameraX: number;
}

export class InitialAlertSeeder {
    constructor (
        private readonly machineRegistry: MachineRegistry,
        private readonly levelConfig: LevelConfig,
        private readonly gameState: GameState,
        private readonly reactor: Reactor,
        private readonly terminal: SubSystemTerminal,
    ) {}

    seed (dialogService: DialogService | null): void {
        const alerts = this.buildAlerts();
        for (const alert of alerts) {
            if (dialogService) {
                dialogService.enqueueCinematicMessage(alert.text, alert.cameraX);
            }
        }
    }

    getSystemAlerts (): string[] {
        return this.buildAlerts().map(a => a.text);
    }

    private buildAlerts (): CinematicAlert[] {
        const mc = this.levelConfig.machineConfig;
        const heat = Math.floor(this.reactor.getHeat());
        const allocations = this.terminal.getPowerDistribution().getAllocations();
        const totalAllocated = allocations.reduce((sum, a) => sum + a, 0);
        const mach1Power = allocations[0] ?? 0;
        const mach2Power = allocations[1] ?? 0;

        const alerts: CinematicAlert[] = [];

        if (totalAllocated === 0) {
            alerts.push({
                text: `CRITICAL: All power allocations at 0. No cooling, no oxygen, no extraction. An agent must go to Terminal and allocate power immediately.`,
                cameraX: this.machineRegistry.getX(MachineId.Terminal),
            });
        }

        if (mach1Power === 0 && this.reactor.getStatus() === 'ON') {
            alerts.push({
                text: `WARNING: Reactor is ON. Heat: ${heat}°C, rising at +${mc.reactor.heatGenerationRate}°C/s. Without coolant, pipe rupture in ~${Math.floor((mc.failures.pipeRuptureHeatThreshold - heat) / mc.reactor.heatGenerationRate)}s.`,
                cameraX: this.machineRegistry.getX(MachineId.Reactor),
            });
        }

        if (mach2Power === 0) {
            alerts.push({
                text: `Oxygen at ${Math.round(this.gameState.globalOxygen)}%, draining at -${mc.oxygenGenerator.nativeDrainRate}%/s. Mach_2 needs power or the crew suffocates.`,
                cameraX: this.machineRegistry.getX(MachineId.OxygenGenerator),
            });
        }

        return alerts;
    }
}

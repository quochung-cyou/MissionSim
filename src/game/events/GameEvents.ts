export const GameEvents = {
    OxygenChanged: 'oxygen-changed',
    PowerChanged: 'power-changed',
    OilChanged: 'oil-changed',
    HeatChanged: 'heat-changed',
    MachineStatusChanged: 'machine-status-changed',
    PowerAllocated: 'power-allocated',
    ExtractionProgress: 'extraction-progress',
    FailureTriggered: 'failure-triggered',
    FailureResolved: 'failure-resolved',
    GameOver: 'game-over',
    GameWin: 'game-win',
    PowerDistributionToggled: 'power-distribution-toggled'
} as const;

export type GameEvent = typeof GameEvents[keyof typeof GameEvents];

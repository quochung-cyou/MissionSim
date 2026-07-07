export interface IHeatTarget {
    addHeat (amount: number): void;
    getHeat (): number;
}

export interface IPowerConsumer {
    getPowerAllocated (): number;
    setPowerAllocated (value: number): void;
    getMaxPower (): number;
    isLockedOut (): boolean;
}

export interface IExtractionTarget {
    getExtractionProgress (): number;
    setExtractionProgress (value: number): void;
    getPowerAllocated (): number;
}

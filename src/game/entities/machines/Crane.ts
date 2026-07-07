import { Machine } from '../Machine';
import { ExtractionMechanic } from '../../mechanics/ExtractionMechanic';
import { IPowerConsumer, IExtractionTarget } from '../../mechanics/ITargets';
import { AssetKeys } from '../../constants/AssetKeys';

const INFO_OFFSET_Y = -185;
const BAR_WIDTH = 120;
const BAR_HEIGHT = 10;
const BAR_OFFSET_Y = -170;

export class Crane extends Machine implements IPowerConsumer, IExtractionTarget {
    private powerAllocated = 0;
    private readonly maxPower: number;
    private lockedOut = false;
    private extractionProgress = 0;
    private readonly extractionMechanic: ExtractionMechanic;
    private readonly infoText: Phaser.GameObjects.Text;
    private readonly progressBarBg: Phaser.GameObjects.Rectangle;
    private readonly progressBarFill: Phaser.GameObjects.Rectangle;

    constructor (scene: Phaser.Scene, groundY: number, maxPower: number = 100, x: number = 200, powerRequired: number = 60) {
        super(scene, x, groundY, 'Crane', AssetKeys.EnergyObjects.Energy1, 1, true, 'Crane');

        this.maxPower = maxPower;
        this.extractionMechanic = new ExtractionMechanic(this, { minPowerRequired: powerRequired });
        this.mechanic = this.extractionMechanic;

        this.infoText = scene.add.text(x, groundY + INFO_OFFSET_Y, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#ffd54f',
            stroke: '#000000',
            strokeThickness: 3
        })
            .setOrigin(0.5)
            .setDepth(22);

        const barY = groundY + BAR_OFFSET_Y;
        this.progressBarBg = scene.add.rectangle(x, barY, BAR_WIDTH, BAR_HEIGHT, 0x000000)
            .setStrokeStyle(2, 0xffffff)
            .setDepth(20);

        this.progressBarFill = scene.add.rectangle(x - BAR_WIDTH / 2 + 1, barY, BAR_WIDTH - 2, BAR_HEIGHT - 2, 0x4caf50)
            .setOrigin(0, 0.5)
            .setDepth(21);

        this.updateDisplay();
    }

    getPowerAllocated (): number {
        return this.powerAllocated;
    }

    setPowerAllocated (value: number): void {
        this.powerAllocated = Math.max(0, Math.min(this.maxPower, value));
    }

    getMaxPower (): number {
        return this.maxPower;
    }

    isLockedOut (): boolean {
        return this.lockedOut;
    }

    setLockedOut (value: boolean): void {
        this.lockedOut = value;
    }

    getExtractionProgress (): number {
        return this.extractionProgress;
    }

    setExtractionProgress (value: number): void {
        this.extractionProgress = Math.max(0, Math.min(100, value));
    }

    updateDisplay (): void {
        if (!this.progressBarBg || !this.progressBarFill) return;

        const required = this.extractionMechanic.getMinPowerRequired();
        this.infoText.setText(`Power: ${this.powerAllocated}/${required} | Extract: ${Math.floor(this.extractionProgress)}%`);

        const fillWidth = Math.max(0, (BAR_WIDTH - 2) * this.extractionProgress / 100);
        this.progressBarFill.setDisplaySize(fillWidth, BAR_HEIGHT - 2);

        const color = this.extractionProgress > 80 ? 0x4caf50 : this.extractionProgress > 40 ? 0xffca28 : 0xff9800;
        this.progressBarFill.setFillStyle(color);
    }
}

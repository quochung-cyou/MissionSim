import { AssetKeys } from '../constants/AssetKeys';
import { GameState } from '../state/GameState';
import { GameEventBus } from '../events/GameEventBus';
import { GameEvents } from '../events/GameEvents';

const BAR_WIDTH = 120;
const BAR_HEIGHT = 12;
const BAR_OFFSET_Y = -180;
const NAME_OFFSET_Y = -210;

export class OilReserve {
    private level: number;
    private maxLevel: number;
    private readonly state: GameState;
    private readonly xPos: number;

    private barBg: Phaser.GameObjects.Rectangle;
    private barFill: Phaser.GameObjects.Rectangle;
    private barText: Phaser.GameObjects.Text;
    private readonly nameText: Phaser.GameObjects.Text;

    constructor (scene: Phaser.Scene, x: number, groundY: number, state: GameState, bus: GameEventBus) {
        this.state = state;
        this.level = state.oilLevel;
        this.maxLevel = state.maxOilLevel;
        this.xPos = x;

        scene.add.image(x, groundY, AssetKeys.EnergyObjects.OilReserve)
            .setOrigin(0.5, 1)
            .setDepth(5)
            .setScale(0.8);

        const barY = groundY + BAR_OFFSET_Y;

        this.barBg = scene.add.rectangle(x, barY, BAR_WIDTH, BAR_HEIGHT, 0x000000)
            .setStrokeStyle(2, 0xffffff)
            .setDepth(20);

        this.barFill = scene.add.rectangle(x - BAR_WIDTH / 2 + 1, barY, BAR_WIDTH - 2, BAR_HEIGHT - 2, 0x8b4513)
            .setOrigin(0, 0.5)
            .setDepth(21);

        this.barText = scene.add.text(x, barY - 16, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#ffca28',
            stroke: '#000000',
            strokeThickness: 3
        })
            .setOrigin(0.5)
            .setDepth(22);

        this.nameText = scene.add.text(x, groundY + NAME_OFFSET_Y, 'Oil Reserve', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        })
            .setOrigin(0.5)
            .setDepth(22);

        bus.on(GameEvents.OilChanged, () => this.updateBar());

        this.updateBar();
    }

    getLevel (): number {
        return this.level;
    }

    getX (): number {
        return this.xPos;
    }

    getMaxLevel (): number {
        return this.maxLevel;
    }

    setLevel (value: number): void {
        this.state.oilLevel = value;
        this.level = this.state.oilLevel;
        this.updateBar();
    }

    updateDisplay (): void {
        this.level = this.state.oilLevel;
        this.updateBar();

        const ratio = this.level / this.maxLevel;
        this.nameText.setColor(ratio > 0.3 ? '#ffffff' : '#ff4444');
    }

    private updateBar (): void {
        if (!this.barBg || !this.barFill || !this.barText) return;

        const ratio = this.level / this.maxLevel;
        const fillWidth = Math.max(0, (BAR_WIDTH - 2) * ratio);
        this.barFill.setDisplaySize(fillWidth, BAR_HEIGHT - 2);

        const color = ratio > 0.5 ? 0x8b4513 : ratio > 0.2 ? 0xcc6600 : 0xff3300;
        this.barFill.setFillStyle(color);

        this.barText.setText(`Oil: ${Math.floor(this.level)}/${this.maxLevel}`);
    }
}

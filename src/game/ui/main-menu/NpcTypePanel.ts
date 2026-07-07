import { NPCType, NPCTypeConfig } from '../../config/LevelConfig';

interface TypePanelEntry {
    config: NPCTypeConfig;
    countText: Phaser.GameObjects.Text;
}

export class NpcTypePanel {
    private entries: TypePanelEntry[] = [];

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly npcTypes: NPCTypeConfig[],
        private readonly onChange: (types: NPCTypeConfig[]) => void
    ) {}

    create (x: number, y: number): void {
        this.scene.add.text(x, y - 90, 'SQUAD COMPOSITION', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#90caf9'
        }).setOrigin(0.5).setDepth(10);

        const rowHeight = 52;
        const labelOffset = -160;

        this.npcTypes.forEach((typeConfig, index) => {
            const rowY = y + index * rowHeight - 30;

            this.scene.add.text(x + labelOffset, rowY, this.capitalize(typeConfig.type), {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '11px',
                color: '#e0e0e0'
            }).setOrigin(0, 0.5).setDepth(10);

            const countText = this.scene.add.text(x, rowY, `${typeConfig.count}`, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '20px',
                color: '#ffffff',
                padding: { top: 4, bottom: 4, left: 6, right: 6 }
            }).setOrigin(0.5).setDepth(10);

            if (typeConfig.min !== typeConfig.max) {
                this.createStepButton(x - 60, rowY, '-', () => this.adjust(index, -1));
                this.createStepButton(x + 60, rowY, '+', () => this.adjust(index, 1));
            }

            this.entries.push({ config: typeConfig, countText });
        });
    }

    private adjust (index: number, delta: number): void {
        const entry = this.entries[index];
        if (!entry) return;

        const current = entry.config.count;
        const newCount = current + delta;
        if (newCount < entry.config.min || newCount > entry.config.max) {
            return;
        }

        entry.config.count = newCount;
        entry.countText.setText(`${newCount}`);
        this.onChange(this.npcTypes);
    }

    private capitalize (type: NPCType): string {
        return type.charAt(0).toUpperCase() + type.slice(1);
    }

    private createStepButton (x: number, y: number, text: string, onClick: () => void): void {
        const size = 36;
        const bg = this.scene.add.rectangle(x, y, size, size, 0x263238)
            .setStrokeStyle(2, 0x4fc3f7)
            .setInteractive()
            .setDepth(10);

        const label = this.scene.add.text(x, y, text, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(11);

        [bg, label].forEach(obj => {
            obj.on('pointerover', () => bg.setFillStyle(0x37474f));
            obj.on('pointerout', () => bg.setFillStyle(0x263238));
            obj.on('pointerdown', onClick);
        });
    }
}

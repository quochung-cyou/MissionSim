import { Emotion } from './Dialog';
import { NPCManager } from '../managers/NPCManager';
import { DialogService } from '../services/DialogService';

interface MachineTarget {
    label: string;
    x: number;
}

export class DebugUIManager {
    private wanderButtonLabel?: Phaser.GameObjects.Text;
    private runModeButtonLabel?: Phaser.GameObjects.Text;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly npcManager: NPCManager,
        private readonly dialogService: DialogService
    ) {
        this.createUI();
    }

    private createUI (): void {
        const startX = 16;
        const startY = 16;
        const buttonWidth = 74;
        const buttonHeight = 26;
        const gap = 6;

        // NPC select buttons
        for (let i = 0; i < this.npcManager.npcCount; i++) {
            this.createButton(
                `NPC ${i + 1}`,
                startX + i * (buttonWidth + gap),
                startY,
                buttonWidth,
                buttonHeight,
                () => this.npcManager.select(i)
            );
        }

        // Machine target buttons
        const targets: MachineTarget[] = [
            { label: 'Crane', x: 200 },
            { label: 'Mach 1', x: 600 },
            { label: 'Mach 2', x: 1000 },
            { label: 'Mach 3', x: 1400 },
            { label: 'Mach 4', x: 1800 },
            { label: 'Oil', x: 2300 }
        ];

        targets.forEach((target, index) => {
            this.createButton(
                target.label,
                startX + index * (buttonWidth + gap),
                startY + buttonHeight + gap,
                buttonWidth,
                buttonHeight,
                () => this.npcManager.commandTo(target.x)
            );
        });

        // Wander toggle button
        this.wanderButtonLabel = this.createButton(
            'Wander: OFF',
            startX,
            startY + 2 * (buttonHeight + gap),
            buttonWidth + 24,
            buttonHeight,
            () => {
                const enabled = this.npcManager.toggleWander();
                this.wanderButtonLabel?.setText(enabled ? 'Wander: ON' : 'Wander: OFF');
            }
        );

        // Run mode toggle button
        this.runModeButtonLabel = this.createButton(
            'Run Mode: OFF',
            startX + buttonWidth + 30,
            startY + 2 * (buttonHeight + gap),
            buttonWidth + 24,
            buttonHeight,
            () => {
                const enabled = this.npcManager.toggleRunMode();
                this.runModeButtonLabel?.setText(enabled ? 'Run Mode: ON' : 'Run Mode: OFF');
            }
        );

        // Dialog debug button
        this.createButton(
            'Dialog',
            startX + 2 * (buttonWidth + 30) + 24,
            startY + 2 * (buttonHeight + gap),
            buttonWidth,
            buttonHeight,
            () => this.dialogService.showForNpc(this.npcManager.selectedNpcIndex, 'calm')
        );

        // Emotion test buttons
        const emotions: Emotion[] = ['calm', 'calm2', 'smile', 'attention', 'aggression', 'special'];
        emotions.forEach((emotion, index) => {
            this.createButton(
                emotion,
                startX + index * (buttonWidth + gap),
                startY + 3 * (buttonHeight + gap),
                buttonWidth,
                buttonHeight,
                () => this.dialogService.showForNpc(this.npcManager.selectedNpcIndex, emotion)
            );
        });
    }

    private createButton (
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        onClick: () => void
    ): Phaser.GameObjects.Text {
        const bg = this.scene.add.rectangle(x + width / 2, y + height / 2, width, height, 0x222222)
            .setStrokeStyle(2, 0xffffff)
            .setScrollFactor(0)
            .setDepth(100);

        const label = this.scene.add.text(x + width / 2, y + height / 2, text, {
            color: '#ffffff',
            fontSize: '13px'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(101);

        const activate = () => {
            onClick();
            bg.setFillStyle(0x444444);
        };
        const deactivate = () => {
            bg.setFillStyle(0x222222);
        };

        [bg, label].forEach(obj => {
            obj.setInteractive();
            obj.on('pointerdown', activate);
            obj.on('pointerup', deactivate);
            obj.on('pointerout', deactivate);
        });

        return label;
    }
}

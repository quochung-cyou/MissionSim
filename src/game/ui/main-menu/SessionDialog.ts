import { Scene } from 'phaser';

export class SessionDialog {
    private scene: Scene;
    private onSave: (sessionId: string) => void;
    private panel!: Phaser.GameObjects.Container;
    private inputElement!: HTMLInputElement;
    private sessionId: string = '';

    constructor (
        scene: Scene,
        onSave: (sessionId: string) => void
    ) {
        this.scene = scene;
        this.onSave = onSave;
    }

    show (existingSessionId: string = ''): void {
        this.sessionId = existingSessionId;

        const panelX = this.scene.scale.width / 2;
        const panelY = this.scene.scale.height / 2;
        const panelWidth = 400;
        const panelHeight = 220;

        // Full-screen blocker to catch clicks outside the dialog
        const blocker = this.scene.add.rectangle(this.scene.scale.width / 2, this.scene.scale.height / 2, this.scene.scale.width, this.scene.scale.height, 0x000000, 0)
            .setScrollFactor(0)
            .setDepth(199)
            .setInteractive();

        // Panel background
        const bg = this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a1a2e)
            .setStrokeStyle(3, 0x6c5ce7)
            .setScrollFactor(0)
            .setDepth(200);

        // Title
        const title = this.scene.add.text(panelX, panelY - 75, 'ENTER SESSION NAME', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#ffffff'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(201);

        // Required hint
        const hint = this.scene.add.text(panelX, panelY - 50, 'Required to save game history', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#888888'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(201);

        // Input field container
        const inputContainer = this.scene.add.container(panelX, panelY - 10);
        const inputBg = this.scene.add.rectangle(0, 0, 300, 40, 0x16213e)
            .setStrokeStyle(2, 0x6c5ce7)
            .setScrollFactor(0)
            .setDepth(201);

        // Create HTML input
        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.value = this.sessionId;
        this.inputElement.placeholder = 'Session name...';
        this.inputElement.style.cssText = `
            width: 280px;
            height: 30px;
            background: transparent;
            border: none;
            color: white;
            font-family: 'Press Start 2P', monospace;
            font-size: 10px;
            text-align: center;
            outline: none;
        `;

        this.inputElement.addEventListener('input', (e) => {
            this.sessionId = (e.target as HTMLInputElement).value;
        });

        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.save();
            }
            // Escape intentionally does nothing — session name is required
        });

        const inputField = this.scene.add.dom(0, 0, this.inputElement)
            .setScrollFactor(0)
            .setDepth(202);

        inputContainer.add([inputBg, inputField]);

        // Save button (single, centered)
        const saveButton = this.createButton(panelX, panelY + 60, 'SAVE', () => this.save());

        this.panel = this.scene.add.container(0, 0, [blocker, bg, title, hint, inputContainer, saveButton])
            .setScrollFactor(0)
            .setDepth(200);

        // Focus input after a short delay
        setTimeout(() => this.inputElement?.focus(), 100);
    }

    hide (): void {
        if (this.panel) {
            this.panel.destroy();
        }
    }

    private save (): void {
        const sessionId = this.sessionId.trim();
        if (sessionId) {
            this.onSave(sessionId);
            this.hide();
        }
    }

    private createButton (x: number, y: number, text: string, onClick: () => void): Phaser.GameObjects.Container {
        const buttonWidth = 100;
        const buttonHeight = 34;

        const bg = this.scene.add.rectangle(x, y, buttonWidth, buttonHeight, 0x6c5ce7)
            .setStrokeStyle(2, 0xffffff)
            .setScrollFactor(0)
            .setDepth(201);

        const label = this.scene.add.text(x, y, text, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '11px',
            color: '#ffffff'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(202);

        const container = this.scene.add.container(0, 0, [bg, label])
            .setScrollFactor(0)
            .setDepth(201);

        [bg, label].forEach(obj => {
            obj.setInteractive();
            obj.on('pointerover', () => bg.setFillStyle(0x9c27b0));
            obj.on('pointerout', () => bg.setFillStyle(0x6c5ce7));
            obj.on('pointerdown', onClick);
        });

        return container;
    }
}

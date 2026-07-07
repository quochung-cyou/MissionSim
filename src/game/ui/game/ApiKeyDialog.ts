export class ApiKeyDialog {
    private container: Phaser.GameObjects.Container;
    private inputElement?: HTMLInputElement;
    private isVisible = false;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly onSave: (key: string) => void,
        private readonly onCancel: () => void
    ) {
        this.create();
    }

    private create (): void {
        const gameWidth = this.scene.scale.width;
        const gameHeight = this.scene.scale.height;

        const dimBg = this.scene.add.rectangle(0, 0, gameWidth, gameHeight, 0x000000, 0.7)
            .setOrigin(0, 0);

        const panelWidth = 400;
        const panelHeight = 280;
        const panelX = gameWidth / 2;
        const panelY = gameHeight / 2;

        const panel = this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a1a2e)
            .setStrokeStyle(3, 0x6c5ce7);

        const title = this.scene.add.text(panelX, panelY - 100, 'API KEY REQUIRED', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '16px',
            color: '#ffca28'
        }).setOrigin(0.5);

        const instruction = this.scene.add.text(panelX, panelY - 60, 'Get your key at:', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#90caf9'
        }).setOrigin(0.5);

        const url = this.scene.add.text(panelX, panelY - 40, 'https://home.qwencloud.com/api-keys', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '9px',
            color: '#4fc3f7'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        url.on('pointerdown', () => {
            window.open('https://home.qwencloud.com/api-keys', '_blank');
        });

        const storageNote = this.scene.add.text(panelX, panelY + 60, 'Key saved to browser localStorage', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#b0bec5'
        }).setOrigin(0.5);

        const saveBtn = this.createButton('SAVE', panelX, panelY + 100, 120, 36, 0x2e7d32, 0x43a047, () => {
            const key = this.inputElement?.value || '';
            if (key.trim()) {
                this.hide();
                this.onSave(key.trim());
            }
        });

        const cancelBtn = this.createButton('CANCEL', panelX, panelY + 145, 120, 36, 0xb71c1c, 0xd32f2f, () => {
            this.hide();
            this.onCancel();
        });

        const clearBtn = this.createButton('CLEAR', panelX, panelY + 190, 120, 36, 0xff9800, 0xffb74d, () => {
            if (this.inputElement) {
                this.inputElement.value = '';
                this.inputElement.focus();
            }
        });

        this.container = this.scene.add.container(0, 0, [dimBg, panel, title, instruction, url, storageNote, saveBtn, cancelBtn, clearBtn])
            .setDepth(400)
            .setVisible(false);
    }

    show (existingKey?: string): void {
        this.isVisible = true;
        this.container.setVisible(true);
        this.createHtmlInput(existingKey);
    }

    hide (): void {
        this.isVisible = false;
        this.container.setVisible(false);
        this.removeHtmlInput();
    }

    get visible (): boolean {
        return this.isVisible;
    }

    private createHtmlInput (existingKey?: string): void {
        if (this.inputElement) return;

        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.placeholder = 'Enter your API key...';
        this.inputElement.style.position = 'fixed';
        this.inputElement.style.left = '50%';
        this.inputElement.style.top = '50%';
        this.inputElement.style.transform = 'translate(-50%, 20px)';
        this.inputElement.style.width = '200px';
        this.inputElement.style.padding = '8px';
        this.inputElement.style.fontFamily = '"Press Start 2P", monospace';
        this.inputElement.style.fontSize = '10px';
        this.inputElement.style.border = '2px solid #6c5ce7';
        this.inputElement.style.borderRadius = '4px';
        this.inputElement.style.backgroundColor = '#0f0f1a';
        this.inputElement.style.color = '#ffffff';
        this.inputElement.style.zIndex = '500';

        if (existingKey) {
            this.inputElement.value = this.maskKey(existingKey);
        }

        document.body.appendChild(this.inputElement);
        this.inputElement.focus();
    }

    private removeHtmlInput (): void {
        if (this.inputElement) {
            document.body.removeChild(this.inputElement);
            this.inputElement = undefined;
        }
    }

    private createButton (
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        idleColor: number,
        hoverColor: number,
        onClick: () => void
    ): Phaser.GameObjects.Container {
        const bg = this.scene.add.rectangle(x, y, width, height, idleColor)
            .setStrokeStyle(2, 0xffffff);

        const label = this.scene.add.text(x, y, text, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '11px',
            color: '#ffffff'
        }).setOrigin(0.5);

        [bg, label].forEach(obj => {
            obj.setInteractive();
            obj.on('pointerover', () => bg.setFillStyle(hoverColor));
            obj.on('pointerout', () => bg.setFillStyle(idleColor));
            obj.on('pointerdown', onClick);
        });

        return this.scene.add.container(0, 0, [bg, label]);
    }

    private maskKey (key: string): string {
        if (!key) return '';
        if (key.length <= 8) return key;
        return key.substring(0, 8) + '******';
    }
}

import { ScenarioResponse, ScenarioAction } from '../../types/ScenarioAction';

const FONT = '"Press Start 2P", monospace';

export class ScenarioOverlay {
    private container: Phaser.GameObjects.Container;
    private dimBg: Phaser.GameObjects.Rectangle;
    private inputElement?: HTMLTextAreaElement;
    private contentContainer: Phaser.GameObjects.Container;
    private currentResponse?: ScenarioResponse;
    private isVisible = false;

    constructor (
        private readonly scene: Phaser.Scene,
        private readonly onGenerate: (text: string) => Promise<ScenarioResponse>,
        private readonly onExecute: (response: ScenarioResponse) => void,
        private readonly onCancel: () => void,
    ) {
        this.create();
    }

    show (): void {
        if (this.isVisible) return;
        this.isVisible = true;
        this.scene.input.keyboard?.disableGlobalCapture();
        this.dimBg.setInteractive();
        this.container.setVisible(true);
        this.currentResponse = undefined;
        this.renderInput();
        this.createHtmlInput();
    }

    hide (): void {
        if (!this.isVisible) return;
        this.isVisible = false;
        this.scene.input.keyboard?.enableGlobalCapture();
        this.dimBg.disableInteractive();
        this.container.setVisible(false);
        this.removeHtmlInput();
        this.contentContainer.removeAll(true);
        this.currentResponse = undefined;
    }

    get visible (): boolean {
        return this.isVisible;
    }

    private create (): void {
        const gameWidth = this.scene.scale.width;
        const gameHeight = this.scene.scale.height;

        this.dimBg = this.scene.add.rectangle(0, 0, gameWidth, gameHeight, 0x000000, 0.7)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setInteractive();

        this.dimBg.on('pointerdown', () => {
            // Clicking the dim background does nothing — must use buttons.
        });

        const panelWidth = 520;
        const panelHeight = 400;
        const panel = this.scene.add.rectangle(gameWidth / 2, gameHeight / 2, panelWidth, panelHeight, 0x1a1a2e)
            .setStrokeStyle(3, 0x6c5ce7)
            .setScrollFactor(0);

        const title = this.scene.add.text(gameWidth / 2, gameHeight / 2 - panelHeight / 2 + 30, 'SPECIAL SCENARIO', {
            fontFamily: FONT,
            fontSize: '16px',
            color: '#ffca28',
        }).setOrigin(0.5).setScrollFactor(0);

        this.contentContainer = this.scene.add.container(gameWidth / 2, gameHeight / 2 + 10)
            .setScrollFactor(0);

        this.container = this.scene.add.container(0, 0, [this.dimBg, panel, title, this.contentContainer])
            .setDepth(2000)
            .setVisible(false);

        this.container.on('destroy', () => {
            this.removeHtmlInput();
        });

        this.dimBg.disableInteractive();
    }

    private renderInput (): void {
        this.contentContainer.removeAll(true);
        const y = -70;

        const label = this.scene.add.text(0, y, 'Describe an event:', {
            fontFamily: FONT,
            fontSize: '10px',
            color: '#90caf9',
        }).setOrigin(0.5).setDepth(2001);

        const generateBtn = this.createButton(0, 110, 'GENERATE', 0x2e7d32, 0x43a047, () => this.handleGenerate());
        const cancelBtn = this.createButton(140, 110, 'CANCEL', 0xb71c1c, 0xd32f2f, () => this.handleCancel());

        this.contentContainer.add([label, generateBtn, cancelBtn]);
    }

    private renderLoading (): void {
        this.contentContainer.removeAll(true);
        const text = this.scene.add.text(0, 0, 'Consulting the AI...', {
            fontFamily: FONT,
            fontSize: '12px',
            color: '#ffffff',
        }).setOrigin(0.5).setDepth(2001);
        this.contentContainer.add(text);
    }

    private renderPreview (response: ScenarioResponse): void {
        this.contentContainer.removeAll(true);

        const titleText = this.scene.add.text(0, -120, response.title, {
            fontFamily: FONT,
            fontSize: '12px',
            color: '#ffca28',
            align: 'center',
            wordWrap: { width: 460 },
        }).setOrigin(0.5).setDepth(2001);

        const descText = this.scene.add.text(0, -70, response.description, {
            fontFamily: FONT,
            fontSize: '9px',
            color: '#cccccc',
            align: 'center',
            lineSpacing: 4,
            wordWrap: { width: 460 },
        }).setOrigin(0.5).setDepth(2001);

        let actionY = -10;
        const actionObjects: Phaser.GameObjects.GameObject[] = [];
        if (response.actions.length === 0) {
            const noActions = this.scene.add.text(0, actionY, '(No mechanical effects)', {
                fontFamily: FONT,
                fontSize: '8px',
                color: '#888888',
            }).setOrigin(0.5).setDepth(2001);
            actionObjects.push(noActions);
        } else {
            for (const action of response.actions) {
                const line = this.scene.add.text(0, actionY, this.formatAction(action), {
                    fontFamily: FONT,
                    fontSize: '8px',
                    color: '#b0bec5',
                    align: 'center',
                    wordWrap: { width: 460 },
                }).setOrigin(0.5).setDepth(2001);
                actionObjects.push(line);
                actionY += 22;
            }
        }

        const executeBtn = this.createButton(-70, 140, 'EXECUTE', 0x2e7d32, 0x43a047, () => this.handleExecute());
        const cancelBtn = this.createButton(70, 140, 'CANCEL', 0xb71c1c, 0xd32f2f, () => this.handleCancel());

        this.contentContainer.add([titleText, descText, ...actionObjects, executeBtn, cancelBtn]);
    }

    private formatAction (action: ScenarioAction): string {
        switch (action.type) {
            case 'set_oxygen': return `Set Oxygen: ${action.value}%`;
            case 'set_oil': return `Set Oil: ${action.value}`;
            case 'add_oil': return `Add Oil: ${action.value}`;
            case 'set_heat': return `Set Heat: ${action.value}°C`;
            case 'add_heat': return `Add Heat: ${action.value}°C`;
            case 'set_base_power': return `Set Base Power: ${action.value}%`;
            case 'set_extraction_progress': return `Set Extraction: ${action.value}%`;
            case 'allocate_power': {
                const a = action.allocations ?? { Crane: 0, Mach_1: 0, Mach_2: 0 };
                return `Allocate Power: Crane=${a.Crane}, Mach_1=${a.Mach_1}, Mach_2=${a.Mach_2}`;
            }
            case 'trip_breaker': return 'Trip Breaker';
            case 'reset_breaker': return 'Reset Breaker';
            case 'set_coolant_lockout': return `Coolant Lockout: ${action.locked}`;
            case 'set_oxygen_lockout': return `Oxygen Lockout: ${action.locked}`;
            case 'set_crane_lockout': return `Crane Lockout: ${action.locked}`;
            case 'move_npc': return `Move ${action.agentId} to x=${action.targetX}${action.run ? ' (run)' : ''}`;
            case 'set_npc_energy': return `Set ${action.agentId} energy: ${action.value}`;
            case 'set_time_remaining': return `Set Timer: ${action.seconds}s`;
            case 'trigger_failure': return `Trigger Failure: ${action.failureType}`;
            case 'resolve_failure': return `Resolve Failure: ${action.failureType}`;
            case 'show_dialog': return `Dialog: "${action.text}"`;
            default: return `Unknown action: ${(action as ScenarioAction).type}`;
        }
    }

    private createButton (x: number, y: number, text: string, idleColor: number, hoverColor: number, onClick: () => void): Phaser.GameObjects.Container {
        const bg = this.scene.add.rectangle(x, y, 120, 34, idleColor)
            .setStrokeStyle(2, 0xffffff)
            .setDepth(2001)
            .setScrollFactor(0);

        const label = this.scene.add.text(x, y, text, {
            fontFamily: FONT,
            fontSize: '10px',
            color: '#ffffff',
        }).setOrigin(0.5).setDepth(2002).setScrollFactor(0);

        [bg, label].forEach(obj => {
            obj.setInteractive();
            obj.on('pointerover', () => bg.setFillStyle(hoverColor));
            obj.on('pointerout', () => bg.setFillStyle(idleColor));
            obj.on('pointerdown', onClick);
        });

        return this.scene.add.container(0, 0, [bg, label]).setScrollFactor(0);
    }

    private async handleGenerate (): Promise<void> {
        const text = this.inputElement?.value.trim() ?? '';
        if (!text) return;

        this.renderLoading();
        this.removeHtmlInput();

        try {
            const response = await this.onGenerate(text);
            this.currentResponse = response;
            this.renderPreview(response);
        } catch (e) {
            console.error('[ScenarioOverlay] Generation failed:', e);
            this.contentContainer.removeAll(true);
            const errorText = this.scene.add.text(0, 0, `Error: ${(e as Error).message}`, {
                fontFamily: FONT,
                fontSize: '9px',
                color: '#ff4444',
                align: 'center',
                wordWrap: { width: 460 },
            }).setOrigin(0.5).setDepth(2001);
            const backBtn = this.createButton(0, 80, 'BACK', 0x6c5ce7, 0x9c27b0, () => {
                this.renderInput();
                this.createHtmlInput(text);
            });
            this.contentContainer.add([errorText, backBtn]);
        }
    }

    private handleExecute (): void {
        if (!this.currentResponse) return;
        this.onExecute(this.currentResponse);
        this.hide();
    }

    private handleCancel (): void {
        this.onCancel();
        this.hide();
    }

    private createHtmlInput (existingText: string = ''): void {
        if (this.inputElement) return;

        this.inputElement = document.createElement('textarea');
        this.inputElement.value = existingText;
        this.inputElement.placeholder = 'e.g., A solar flare surges the reactor...';
        this.inputElement.style.position = 'fixed';
        this.inputElement.style.left = '50%';
        this.inputElement.style.top = '50%';
        this.inputElement.style.transform = 'translate(-50%, -20px)';
        this.inputElement.style.width = '400px';
        this.inputElement.style.height = '120px';
        this.inputElement.style.padding = '8px';
        this.inputElement.style.fontFamily = 'Arial, sans-serif';
        this.inputElement.style.fontSize = '12px';
        this.inputElement.style.border = '2px solid #6c5ce7';
        this.inputElement.style.borderRadius = '4px';
        this.inputElement.style.backgroundColor = '#0f0f1a';
        this.inputElement.style.color = '#ffffff';
        this.inputElement.style.zIndex = '2500';
        this.inputElement.style.resize = 'none';

        document.body.appendChild(this.inputElement);
        this.inputElement.focus();

        this.inputElement.addEventListener('keydown', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                this.handleGenerate();
            }
            if (e.key === 'Escape') {
                this.handleCancel();
            }
        });
    }

    private removeHtmlInput (): void {
        if (this.inputElement) {
            document.body.removeChild(this.inputElement);
            this.inputElement = undefined;
        }
    }
}

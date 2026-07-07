import { Math as PMath, Physics } from 'phaser';

export type NPCState = 'idle' | 'walk' | 'goToTarget' | 'runToTarget';

export interface NPCConfig {
    idleMinMs: number;
    idleMaxMs: number;
    walkMinMs: number;
    walkMaxMs: number;
    walkSpeed: number;
    runSpeed: number;
    maxEnergy: number;
    runDrainPerSecond: number;
    energyRegenPerSecond: number;
}

// NPC overhead UI offsets — tune these to move labels/bars closer or further from the head.
// Negative values move the element ABOVE the NPC's center. Smaller absolute values = closer to head.
const NAME_LABEL_OFFSET_Y = -70;
const STATUS_LABEL_OFFSET_Y = -55;
const WORKING_ICON_OFFSET_Y = -40;
const STAMINA_BAR_OFFSET_Y = -25;
const STAMINA_LABEL_OFFSET_X = -35; // left of the bar center

export class NPC extends Physics.Arcade.Sprite {
    private aiState: NPCState = 'idle';
    private aiTimer: number = 0;
    private walkDirection: number = 1;
    private targetX: number | null = null;
    private wanderEnabled = true;
    private isSelected = false;
    private energy: number;
    private energyBarBg: Phaser.GameObjects.Rectangle;
    private energyBarFill: Phaser.GameObjects.Rectangle;
    private staminaLabel: Phaser.GameObjects.Text;
    private workingIcon: Phaser.GameObjects.Text;
    private statusLabel: Phaser.GameObjects.Text;
    private nameLabel: Phaser.GameObjects.Text;
    private isWorking = false;

    private readonly config: NPCConfig;
    private readonly specialKey: string | null;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        private readonly idleKey: string,
        private readonly walkKey: string,
        private readonly runKey: string,
        config?: Partial<NPCConfig>,
        specialKey?: string
    ) {
        super(scene, x, y, idleKey);

        this.config = {
            idleMinMs: 1000,
            idleMaxMs: 3000,
            walkMinMs: 1000,
            walkMaxMs: 2500,
            walkSpeed: 60,
            runSpeed: 150,
            maxEnergy: 200,
            runDrainPerSecond: 30,
            energyRegenPerSecond: 15,
            ...config
        };

        this.energy = this.config.maxEnergy;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setDepth(10);
        this.setCollideWorldBounds(true);

        const body = this.body as Physics.Arcade.Body;

        // NPC bounding box config (width% of sprite, height% of sprite)
        // Tweak these if the collision feels off
        body.setSize(this.width * 0.6, this.height * 0.9);
        body.setOffset(this.width * 0.2, this.height * 0.1);

        // Stamina bar above the NPC
        const barWidth = 50;
        const barHeight = 6;
        this.energyBarBg = scene.add.rectangle(x, y + STAMINA_BAR_OFFSET_Y, barWidth, barHeight, 0x000000)
            .setStrokeStyle(1, 0xffffff)
            .setDepth(11)
            .setVisible(false);
        this.energyBarFill = scene.add.rectangle(x - barWidth / 2 + 1, y + STAMINA_BAR_OFFSET_Y, barWidth - 2, barHeight - 2, 0x00ff00)
            .setOrigin(0, 0.5)
            .setDepth(12)
            .setVisible(false);
        this.staminaLabel = scene.add.text(x + STAMINA_LABEL_OFFSET_X, y + STAMINA_BAR_OFFSET_Y, 'Stamina', {
            fontFamily: 'Arial',
            fontSize: '10px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
        })
            .setOrigin(1, 0.5)
            .setDepth(12)
            .setVisible(false);

        this.specialKey = specialKey ?? null;

        this.workingIcon = scene.add.text(x, y + WORKING_ICON_OFFSET_Y, '\u2699', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 3,
        })
            .setOrigin(0.5)
            .setDepth(13)
            .setVisible(false);

        this.statusLabel = scene.add.text(x, y + STATUS_LABEL_OFFSET_Y, '', {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            backgroundColor: '#000000aa',
            padding: { x: 4, y: 2 },
            wordWrap: { width: 180 },
        })
            .setOrigin(0.5)
            .setDepth(14)
            .setVisible(false);

        this.nameLabel = scene.add.text(x, y + NAME_LABEL_OFFSET_Y, '', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            backgroundColor: '#000000aa',
            padding: { x: 6, y: 2 },
        })
            .setOrigin(0.5)
            .setDepth(15)
            .setVisible(false);
    }

    start(): void {
        this.setIdle();
    }

    goTo(x: number, run = false): void {
        this.targetX = x;
        this.aiState = run ? 'runToTarget' : 'goToTarget';
        this.play(run ? this.runKey : this.walkKey);
        this.moveToward(x, run && this.energy > 0);
    }

    getEnergy(): number {
        return this.energy;
    }

    setEnergy(value: number): void {
        this.energy = Math.max(0, Math.min(this.config.maxEnergy, value));
    }

    getMaxEnergy(): number {
        return this.config.maxEnergy;
    }

    setWander(enabled: boolean): void {
        this.wanderEnabled = enabled;
        if (!enabled && this.aiState !== 'goToTarget' && this.aiState !== 'runToTarget') {
            this.setIdle();
        }
    }

    playSpecial(label?: string): void {
        this.isWorking = true;
        this.setVelocityX(0);
        this.workingIcon.setVisible(true);
        if (label) {
            this.statusLabel.setText(label);
            this.statusLabel.setVisible(true);
        }
        if (this.specialKey) {
            this.play(this.specialKey);
        } else {
            this.play(this.idleKey);
        }
    }

    stopSpecial(): void {
        if (this.isWorking) {
            this.isWorking = false;
            this.workingIcon.setVisible(false);
            this.statusLabel.setVisible(false);
            this.setIdle();
        }
    }

    showStatus(text: string): void {
        this.statusLabel.setText(text);
        this.statusLabel.setVisible(true);
    }

    hideStatus(): void {
        this.statusLabel.setVisible(false);
    }

    setDisplayName(name: string): void {
        this.nameLabel.setText(name);
        this.nameLabel.setVisible(true);
    }

    get working(): boolean {
        return this.isWorking;
    }

    get wandering(): boolean {
        return this.wanderEnabled;
    }

    get selected(): boolean {
        return this.isSelected;
    }

    set selected(value: boolean) {
        this.isSelected = value;
    }

    update(_time: number, delta: number): void {
        const body = this.body as Physics.Arcade.Body;

        this.nameLabel.setPosition(this.x, this.y + NAME_LABEL_OFFSET_Y);

        if (this.isWorking) {
            this.workingIcon.setPosition(this.x, this.y + WORKING_ICON_OFFSET_Y);
            this.statusLabel.setPosition(this.x, this.y + STATUS_LABEL_OFFSET_Y);
            this.updateEnergyBar();
            return;
        }

        // Keep status label (e.g. standby) positioned above NPC even when not working
        if (this.statusLabel.visible) {
            this.statusLabel.setPosition(this.x, this.y + STATUS_LABEL_OFFSET_Y);
        }

        if (this.aiState === 'goToTarget' || this.aiState === 'runToTarget') {
            this.updateMoveToTarget(delta);
            this.updateEnergyBar();
            return;
        }

        // Regenerate energy whenever not running
        this.regenerateEnergy(delta);

        // Don't switch out of idle while in mid-air
        if (this.aiState === 'idle' && !body.blocked.down) {
            this.updateEnergyBar();
            return;
        }

        if (!this.wanderEnabled) {
            if (this.aiState !== 'idle') {
                this.setIdle();
            }
            this.updateEnergyBar();
            return;
        }

        this.aiTimer -= delta;

        if (this.aiTimer <= 0) {
            this.aiState === 'idle' ? this.setWalk() : this.setIdle();
        }

        this.updateEnergyBar();
    }

    private updateMoveToTarget(delta: number): void {
        if (this.targetX === null) {
            this.setIdle();
            return;
        }

        const dist = this.targetX - this.x;

        if (Math.abs(dist) < 5) {
            this.setIdle();
            this.targetX = null;
            return;
        }

        const isRunning = this.aiState === 'runToTarget' && this.energy > 0;

        if (this.aiState === 'runToTarget' && this.energy <= 0) {
            // Out of energy: switch to walking
            this.aiState = 'goToTarget';
            this.play(this.walkKey);
        }

        if (isRunning) {
            this.drainEnergy(delta);
        } else {
            this.regenerateEnergy(delta);
        }

        this.moveToward(this.targetX, isRunning);
    }

    private updateEnergyBar(): void {
        const barWidth = 50;
        const barHeight = 6;
        const maxFillWidth = barWidth - 2;
        const fillHeight = barHeight - 2;

        this.energyBarBg.setPosition(this.x, this.y + STAMINA_BAR_OFFSET_Y);
        this.energyBarFill.setPosition(this.x - barWidth / 2 + 1, this.y + STAMINA_BAR_OFFSET_Y);
        this.staminaLabel.setPosition(this.x + STAMINA_LABEL_OFFSET_X, this.y + STAMINA_BAR_OFFSET_Y);

        const ratio = this.energy / this.config.maxEnergy;
        const fillWidth = Math.max(0, maxFillWidth * ratio);
        this.energyBarFill.setDisplaySize(fillWidth, fillHeight);

        // Show bar when energy is not full or when moving
        const show = this.energy < this.config.maxEnergy ||
            this.aiState === 'goToTarget' ||
            this.aiState === 'runToTarget' ||
            this.aiState === 'walk';

        this.energyBarBg.setVisible(show);
        this.energyBarFill.setVisible(show);
        this.staminaLabel.setVisible(show);
    }

    private moveToward(x: number, running: boolean): void {
        const direction = x > this.x ? 1 : -1;
        this.walkDirection = direction;
        const speed = running ? this.config.runSpeed : this.config.walkSpeed;
        this.setVelocityX(direction * speed);
        this.setFlipX(direction < 0);
    }

    private drainEnergy(delta: number): void {
        const drain = (this.config.runDrainPerSecond * delta) / 1000;
        this.energy = Math.max(0, this.energy - drain);
    }

    private regenerateEnergy(delta: number): void {
        if (this.energy >= this.config.maxEnergy) {
            return;
        }
        const regen = (this.config.energyRegenPerSecond * delta) / 1000;
        this.energy = Math.min(this.config.maxEnergy, this.energy + regen);
    }

    private setIdle(): void {
        this.aiState = 'idle';
        this.setVelocityX(0);
        this.play(this.idleKey);
        this.aiTimer = PMath.Between(this.config.idleMinMs, this.config.idleMaxMs);
    }

    private setWalk(): void {
        this.aiState = 'walk';
        this.walkDirection = Math.random() < 0.5 ? -1 : 1;
        this.setVelocityX(this.walkDirection * this.config.walkSpeed);
        this.setFlipX(this.walkDirection < 0);
        this.play(this.walkKey);
        this.aiTimer = PMath.Between(this.config.walkMinMs, this.config.walkMaxMs);
    }
}

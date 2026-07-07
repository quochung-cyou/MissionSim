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

    private readonly config: NPCConfig;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        private readonly idleKey: string,
        private readonly walkKey: string,
        private readonly runKey: string,
        config?: Partial<NPCConfig>
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

        // Energy bar above the NPC
        const barWidth = 50;
        const barHeight = 6;
        const barOffsetY = -78;
        this.energyBarBg = scene.add.rectangle(x, y + barOffsetY, barWidth, barHeight, 0x000000)
            .setStrokeStyle(1, 0xffffff)
            .setDepth(11)
            .setVisible(false);
        this.energyBarFill = scene.add.rectangle(x - barWidth / 2 + 1, y + barOffsetY, barWidth - 2, barHeight - 2, 0x00ff00)
            .setOrigin(0, 0.5)
            .setDepth(12)
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

    getMaxEnergy(): number {
        return this.config.maxEnergy;
    }

    setWander(enabled: boolean): void {
        this.wanderEnabled = enabled;
        if (!enabled && this.aiState !== 'goToTarget' && this.aiState !== 'runToTarget') {
            this.setIdle();
        }
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
        const barOffsetY = -78;
        const maxFillWidth = barWidth - 2;
        const fillHeight = barHeight - 2;

        this.energyBarBg.setPosition(this.x, this.y + barOffsetY);
        this.energyBarFill.setPosition(this.x - barWidth / 2 + 1, this.y + barOffsetY);

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

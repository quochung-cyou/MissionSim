import { AssetKeys } from '../constants/AssetKeys';

export type Emotion = 'calm' | 'calm2' | 'smile' | 'attention' | 'aggression' | 'special';
export type Scientist = 1 | 2 | 3;

export interface AvatarRef {
    scientist: Scientist;
    emotion: Emotion;
}

// TUNING CONFIG — change these values to adjust the dialog layout
export const DialogConfig = {
    height: 140,
    padding: 0,
    avatarSize: 48,
    avatarGap: 120,       // space between avatar and text
    nameFontSize: 16,    // px
    bodyFontSize: 12,    // px
    lineSpacing: 6,
    textTopOffset: 15,   // extra vertical nudge for name text
    textPaddingY: 4      // extra vertical space above text to prevent clipping
} as const;

export class Dialog {
    private readonly container: Phaser.GameObjects.Container;
    private readonly avatar: Phaser.GameObjects.Image;
    private readonly nameText: Phaser.GameObjects.Text;
    private readonly bodyText: Phaser.GameObjects.Text;
    private typewriterSound?: Phaser.Sound.BaseSound;
    private typewriterTimer?: Phaser.Time.TimerEvent;
    private typewriterIndex = 0;
    private typewriterText = '';

    constructor (scene: Phaser.Scene) {
        const width = scene.scale.width;
        const cfg = DialogConfig;
        const textX = cfg.padding + cfg.avatarSize + cfg.avatarGap;
        const nameY = cfg.padding + cfg.textTopOffset;
        const bodyY = nameY + cfg.nameFontSize + 6;

        this.container = scene.add.container(0, scene.scale.height - cfg.height)
            .setScrollFactor(0)
            .setDepth(1000)
            .setVisible(false);

        const background = scene.add.rectangle(width / 2, cfg.height / 2, width, cfg.height, 0x565656)
            .setStrokeStyle(2, 0xffffff)
            .setOrigin(0.5);

        this.avatar = scene.add.image(cfg.padding, cfg.padding, '')
            .setOrigin(0, 0)
            .setDisplaySize(cfg.avatarSize, cfg.avatarSize);

        this.nameText = scene.add.text(textX, nameY, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: `${cfg.nameFontSize}px`,
            color: '#ffffff',
            padding: { top: cfg.textPaddingY, bottom: 0, left: 0, right: 0 }
        });

        this.bodyText = scene.add.text(textX, bodyY, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: `${cfg.bodyFontSize}px`,
            color: '#ffffff',
            lineSpacing: cfg.lineSpacing,
            wordWrap: { width: width - textX - cfg.padding },
            padding: { top: cfg.textPaddingY, bottom: 0, left: 0, right: 0 }
        });

        this.container.add([background, this.avatar, this.nameText, this.bodyText]);

        this.typewriterSound = scene.sound.add(AssetKeys.Audio.Typewriter, { loop: true, volume: 0.3 });
    }

    show (name: string, text: string, avatar: AvatarRef): void {
        this.nameText.setText(name);
        this.avatar.setTexture(this.resolveAvatarKey(avatar));
        this.container.setVisible(true);

        this.startTypewriter(text);
    }

    hide (): void {
        this.stopTypewriter();
        this.container.setVisible(false);
    }

    isVisible (): boolean {
        return this.container.visible;
    }

    private resolveAvatarKey (avatar: AvatarRef): string {
        const scientist = avatar.scientist;
        const emotion = avatar.emotion;

        const map: Record<Scientist, Record<Emotion, string>> = {
            1: {
                calm: AssetKeys.Avatars.Scientist1.Calm,
                calm2: AssetKeys.Avatars.Scientist1.Calm2,
                smile: AssetKeys.Avatars.Scientist1.Smile,
                attention: AssetKeys.Avatars.Scientist1.Attention,
                aggression: AssetKeys.Avatars.Scientist1.Aggression,
                special: AssetKeys.Avatars.Scientist1.Special
            },
            2: {
                calm: AssetKeys.Avatars.Scientist2.Calm,
                calm2: AssetKeys.Avatars.Scientist2.Calm2,
                smile: AssetKeys.Avatars.Scientist2.Smile,
                attention: AssetKeys.Avatars.Scientist2.Attention,
                aggression: AssetKeys.Avatars.Scientist2.Aggression,
                special: AssetKeys.Avatars.Scientist2.Special
            },
            3: {
                calm: AssetKeys.Avatars.Scientist3.Calm,
                calm2: AssetKeys.Avatars.Scientist3.Calm2,
                smile: AssetKeys.Avatars.Scientist3.Smile,
                attention: AssetKeys.Avatars.Scientist3.Attention,
                aggression: AssetKeys.Avatars.Scientist3.Aggression,
                special: AssetKeys.Avatars.Scientist3.Special
            }
        };

        return map[scientist][emotion];
    }

    private startTypewriter (text: string): void {
        this.stopTypewriter();
        this.typewriterText = text;
        this.typewriterIndex = 0;
        this.bodyText.setText('');

        this.typewriterSound?.play();

        this.typewriterTimer = this.container.scene.time.addEvent({
            delay: 30,
            callback: this.onTypewriterTick,
            callbackScope: this,
            loop: true
        });
    }

    private onTypewriterTick (): void {
        if (this.typewriterIndex >= this.typewriterText.length) {
            this.stopTypewriter();
            return;
        }

        this.typewriterIndex++;
        this.bodyText.setText(this.typewriterText.substring(0, this.typewriterIndex));
    }

    private stopTypewriter (): void {
        if (this.typewriterTimer) {
            this.typewriterTimer.remove();
            this.typewriterTimer = undefined;
        }
        this.typewriterSound?.stop();
    }
}

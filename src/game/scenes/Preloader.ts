import { Scene } from 'phaser';
import { AssetKeys } from '../constants/AssetKeys';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        this.add.image(cx, cy, AssetKeys.Images.Background);
        this.add.rectangle(cx, cy, 468, 32).setStrokeStyle(1, 0xffffff);

        const bar = this.add.rectangle(cx - 230, cy, 4, 28, 0xffffff);

        this.load.on('progress', (progress: number) => {
            bar.width = 4 + (460 * progress);
        });
    }

    preload ()
    {
        this.load.setPath('assets');

        this.load.image(AssetKeys.Images.Logo, 'logo.png');
        this.load.image(AssetKeys.Images.Level1Thumb, 'level1_thumb.png');
        this.load.tilemapTiledJSON(AssetKeys.Tilemaps.Level1, 'level1.json');
        this.load.image(AssetKeys.Tilesets.Tileset, 'tileset.png');

        this.load.image(AssetKeys.Background.Day1, 'background/Day/1.png');
        this.load.image(AssetKeys.Background.Day2, 'background/Day/2.png');
        this.load.image(AssetKeys.Background.Day3, 'background/Day/3.png');
        this.load.image(AssetKeys.Background.Day4, 'background/Day/4.png');
        this.load.image(AssetKeys.Background.Day5, 'background/Day/5.png');
        this.load.image(AssetKeys.Background.Overlay, 'background/Overlay.png');

        this.load.spritesheet(AssetKeys.EnergyObjects.Energy1, 'energy_object/1.png', { frameWidth: 264, frameHeight: 160 });
        this.load.spritesheet(AssetKeys.EnergyObjects.Energy2, 'energy_object/2.png', { frameWidth: 100, frameHeight: 70 });
        this.load.spritesheet(AssetKeys.EnergyObjects.Energy3, 'energy_object/3.png', { frameWidth: 74, frameHeight: 36 });
        this.load.image(AssetKeys.EnergyObjects.Machine3, 'energy_object/1_5.png');
        this.load.image(AssetKeys.EnergyObjects.Machine4, 'energy_object/1_6.png');
        this.load.image(AssetKeys.EnergyObjects.OilReserve, 'energy_object/2_oil.png');

        const frameSize = { frameWidth: 128, frameHeight: 128 };

        this.load.spritesheet(AssetKeys.Scientists.Scientist1Idle, 'Scientists_1/Idle.png', frameSize);
        this.load.spritesheet(AssetKeys.Scientists.Scientist1Walk, 'Scientists_1/Walk.png', frameSize);
        this.load.spritesheet(AssetKeys.Scientists.Scientist1Run, 'Scientists_1/Run.png', frameSize);
        this.load.spritesheet(AssetKeys.Scientists.Scientist2Idle, 'Scientists_2/Idle.png', frameSize);
        this.load.spritesheet(AssetKeys.Scientists.Scientist2Walk, 'Scientists_2/Walk.png', frameSize);
        this.load.spritesheet(AssetKeys.Scientists.Scientist2Run, 'Scientists_2/Run.png', frameSize);
        this.load.spritesheet(AssetKeys.Scientists.Scientist3Idle, 'Scientists_3/Idle.png', frameSize);
        this.load.spritesheet(AssetKeys.Scientists.Scientist3Walk, 'Scientists_3/Walk.png', frameSize);
        this.load.spritesheet(AssetKeys.Scientists.Scientist3Run, 'Scientists_3/Run.png', frameSize);

        this.loadAvatarSet(AssetKeys.Avatars.Scientist1, 'avatar/Scientists_1');
        this.loadAvatarSet(AssetKeys.Avatars.Scientist2, 'avatar/Scientists_2');
        this.loadAvatarSet(AssetKeys.Avatars.Scientist3, 'avatar/Scientists_3');

        this.load.audio(AssetKeys.Audio.Level1Loop, 'sound/level1_loop.wav');
        this.load.audio(AssetKeys.Audio.Typewriter, 'sound/typewrite.wav');
    }

    private loadAvatarSet (keys: Record<string, string>, basePath: string): void {
        this.load.image(keys.Calm, `${basePath}/Calm.png`);
        this.load.image(keys.Calm2, `${basePath}/Calm 2.png`);
        this.load.image(keys.Smile, `${basePath}/Smile.png`);
        this.load.image(keys.Attention, `${basePath}/Attention.png`);
        this.load.image(keys.Aggression, `${basePath}/Aggression.png`);
        this.load.image(keys.Special, `${basePath}/Special.png`);
    }

    create ()
    {
        this.createScientistAnimations();
        this.createEnergyObjectAnimations();
        this.scene.start('MainMenu');
    }

    private createScientistAnimations (): void
    {
        this.createLoopAnimation(AssetKeys.Scientists.Scientist1Idle, 6, 6);
        this.createLoopAnimation(AssetKeys.Scientists.Scientist1Walk, 12, 12);
        this.createLoopAnimation(AssetKeys.Scientists.Scientist1Run, 12, 12);
        this.createLoopAnimation(AssetKeys.Scientists.Scientist2Idle, 6, 6);
        this.createLoopAnimation(AssetKeys.Scientists.Scientist2Walk, 12, 12);
        this.createLoopAnimation(AssetKeys.Scientists.Scientist2Run, 11, 12);
        this.createLoopAnimation(AssetKeys.Scientists.Scientist3Idle, 7, 6);
        this.createLoopAnimation(AssetKeys.Scientists.Scientist3Walk, 12, 12);
        this.createLoopAnimation(AssetKeys.Scientists.Scientist3Run, 12, 12);
    }

    private createEnergyObjectAnimations (): void
    {
        this.createLoopAnimation(AssetKeys.EnergyObjects.Energy1, 8, 8);
        this.createLoopAnimation(AssetKeys.EnergyObjects.Energy2, 6, 6);
        this.createLoopAnimation(AssetKeys.EnergyObjects.Energy3, 4, 6);
    }

    private createLoopAnimation (textureKey: string, frameCount: number, frameRate: number): void
    {
        this.anims.create({
            key: textureKey,
            frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: frameCount - 1 }),
            frameRate,
            repeat: -1
        });
    }
}

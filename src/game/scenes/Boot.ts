import { Scene } from 'phaser';
import { AssetKeys } from '../constants/AssetKeys';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        this.load.image(AssetKeys.Images.Background, 'assets/background/Day/1.png');
    }

    create ()
    {
        this.scene.start('Preloader');
    }
}

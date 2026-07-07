import { AssetKeys } from '../constants/AssetKeys';

interface BackgroundLayer {
    key: string;
    factor: number;
    depth: number;
}

export class BackgroundManager {
    private readonly layers: Phaser.GameObjects.TileSprite[] = [];

    create (scene: Phaser.Scene): void {
        const bgY = 0;
        const imgHeight = 324;
        const tileScale = scene.scale.height / imgHeight;

        const layerConfigs: BackgroundLayer[] = [
            { key: AssetKeys.Background.Day1, factor: 0.0, depth: -10 },
            { key: AssetKeys.Background.Day2, factor: 0.1, depth: -9 },
            { key: AssetKeys.Background.Day3, factor: 0.2, depth: -8 },
            { key: AssetKeys.Background.Day4, factor: 0.3, depth: -7 },
            { key: AssetKeys.Background.Day5, factor: 0.4, depth: -6 }
        ];

        layerConfigs.forEach(layer => {
            const bg = scene.add.tileSprite(0, bgY, scene.scale.width, scene.scale.height, layer.key)
                .setOrigin(0, 0)
                .setDepth(layer.depth)
                .setScrollFactor(0)
                .setTileScale(tileScale, tileScale);

            (bg as any).parallaxFactor = layer.factor;
            this.layers.push(bg);
        });
    }

    update (scene: Phaser.Scene): void {
        const scrollX = scene.cameras.main.scrollX;
        this.layers.forEach(bg => {
            const factor = (bg as any).parallaxFactor;
            bg.tilePositionX = scrollX * factor;
        });
    }
}

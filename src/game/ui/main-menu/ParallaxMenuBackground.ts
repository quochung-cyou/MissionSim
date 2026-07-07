import { AssetKeys } from '../../constants/AssetKeys';

interface ParallaxLayer {
    key: string;
    factor: number;
    depth: number;
}

export class ParallaxMenuBackground {
    private readonly layers: Phaser.GameObjects.TileSprite[] = [];
    private autoScroll = 0;

    constructor (private readonly scene: Phaser.Scene) {}

    create (): void {
        const imgHeight = 324;
        const tileScale = this.scene.scale.height / imgHeight;

        const layerConfigs: ParallaxLayer[] = [
            { key: AssetKeys.Background.Day1, factor: 0.05, depth: -10 },
            { key: AssetKeys.Background.Day2, factor: 0.15, depth: -9 },
            { key: AssetKeys.Background.Day3, factor: 0.25, depth: -8 },
            { key: AssetKeys.Background.Day4, factor: 0.35, depth: -7 },
            { key: AssetKeys.Background.Day5, factor: 0.45, depth: -6 }
        ];

        layerConfigs.forEach(layer => {
            const bg = this.scene.add.tileSprite(0, 0, this.scene.scale.width, this.scene.scale.height, layer.key)
                .setOrigin(0, 0)
                .setDepth(layer.depth)
                .setScrollFactor(0)
                .setTileScale(tileScale, tileScale)
                .setAlpha(0.9);
            (bg as any).parallaxFactor = layer.factor;
            this.layers.push(bg);
        });
    }

    update (delta: number): void {
        this.autoScroll += 0.05 * delta;
        this.layers.forEach(bg => {
            const factor = (bg as any).parallaxFactor;
            bg.tilePositionX = this.autoScroll * factor;
        });
    }

    addVignette (): void {
        this.scene.add.rectangle(
            this.scene.scale.width / 2,
            this.scene.scale.height / 2,
            this.scene.scale.width,
            this.scene.scale.height,
            0x000000
        )
            .setAlpha(0.35)
            .setDepth(0);
    }
}

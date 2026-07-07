import { AssetKeys } from '../constants/AssetKeys';

export interface LevelData {
    map: Phaser.Tilemaps.Tilemap;
    groundLayer: Phaser.Tilemaps.TilemapLayerBase;
}

export class LevelManager {
    constructor(private readonly scene: Phaser.Scene) {}

    create(): LevelData {
        const map = this.scene.add.tilemap(AssetKeys.Tilemaps.Level1);
        const tileset = map.addTilesetImage(AssetKeys.Tilesets.Tileset, AssetKeys.Tilesets.Tileset);

        if (!tileset) {
            throw new Error(`Tileset '${AssetKeys.Tilesets.Tileset}' could not be loaded. Check the tileset name in Tiled matches the asset key.`);
        }

        const groundLayer = map.createLayer('object', tileset, 0, 0);
        const decoLayer = map.createLayer('layer1', tileset, 0, 0);

        if (!groundLayer) {
            throw new Error('Tile layer "object" not found in the tilemap.');
        }

        groundLayer.setDepth(0);
        decoLayer?.setDepth(1);

        groundLayer.setCollisionByExclusion([-1]);

        this.scene.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        return { map, groundLayer };
    }
}

import { Scale } from 'phaser';

export const GameConfig = {
    width: 960,
    height: 640,
    tileSize: 32,
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 800 },
            debug: false
        }
    }
} as const;

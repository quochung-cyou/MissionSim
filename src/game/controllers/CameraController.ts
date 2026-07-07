import { Input } from 'phaser';

export class CameraController {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys!: { [key: string]: Input.Keyboard.Key };

    setup (scene: Phaser.Scene): void {
        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.wasdKeys = {
            a: scene.input.keyboard!.addKey(Input.Keyboard.KeyCodes.A),
            d: scene.input.keyboard!.addKey(Input.Keyboard.KeyCodes.D)
        };
    }

    update (scene: Phaser.Scene, delta: number): void {
        const speed = 0.4 * delta;
        const camera = scene.cameras.main;

        if (this.cursors.left.isDown || this.wasdKeys.a.isDown) {
            camera.scrollX -= speed;
        }
        else if (this.cursors.right.isDown || this.wasdKeys.d.isDown) {
            camera.scrollX += speed;
        }
    }
}

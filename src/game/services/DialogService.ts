import { Dialog, Emotion } from '../ui/Dialog';

interface DialogData {
    name: string;
    text: string;
}

export class DialogService {
    private readonly dialog: Dialog;

    private readonly dialogs: DialogData[] = [
        {
            name: 'Dr. Alpha',
            text: 'The reactor readings are stable, but the secondary cooling line is showing pressure fluctuations. I will check the crane area first.'
        },
        {
            name: 'Dr. Beta',
            text: 'The output from machine one is below threshold. We need to inspect the conveyor belt and recalibrate the sensors before the next shift.'
        },
        {
            name: 'Dr. Gamma',
            text: 'The oil reserve is at sixty percent. I am heading to the storage tanks to verify the manual gauges against the digital readout.'
        }
    ];

    constructor (scene: Phaser.Scene) {
        this.dialog = new Dialog(scene);
    }

    showForNpc (npcIndex: number, emotion: Emotion = 'calm'): void {
        const data = this.dialogs[npcIndex % this.dialogs.length];
        const scientist = ((npcIndex % 3) + 1) as 1 | 2 | 3;
        this.dialog.show(data.name, data.text, { scientist, emotion });
    }

    hide (): void {
        this.dialog.hide();
    }
}

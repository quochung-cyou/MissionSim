import { Scene } from 'phaser';
import { SceneKeys } from '../constants/SceneKeys';
import { GameLogger, GameRecord } from '../services/GameLogger';
import {
    ButtonPair,
    createButton,
    FONT,
    SCREEN_H,
    SCREEN_W,
} from './history/HistoryConstants';
import { HistoryDetailView } from './history/HistoryDetailView';
import { HistoryListView } from './history/HistoryListView';

type ViewMode = 'list' | 'detail';

export class GameHistory extends Scene
{
    private records: GameRecord[] = [];
    private currentView: ViewMode = 'list';
    private listView: HistoryListView | null = null;
    private detailView: HistoryDetailView | null = null;

    private backButton: ButtonPair | null = null;
    private clearButton: ButtonPair | null = null;

    constructor ()
    {
        super('GameHistory');
    }

    create ()
    {
        this.records = GameLogger.loadAll();

        this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x0a0a1a)
            .setDepth(0);

        this.add.text(SCREEN_W / 2, 30, 'GAME HISTORY', {
            fontFamily: FONT,
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        })
            .setOrigin(0.5)
            .setDepth(1);

        this.createButtons();
        this.showList();

        this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _over: Phaser.GameObjects.GameObject, _deltaX: number, deltaY: number) => {
            if (this.currentView === 'list' && this.listView) {
                this.listView.handleWheel(deltaY);
            } else if (this.currentView === 'detail' && this.detailView) {
                this.detailView.handleWheel(deltaY);
            }
        });

        this.input.keyboard?.on('keydown-ESC', () => {
            if (this.currentView === 'detail') {
                this.showList();
            } else {
                this.scene.start(SceneKeys.MainMenu);
            }
        });
    }

    private createButtons (): void
    {
        this.backButton = createButton(
            this,
            100,
            SCREEN_H - 30,
            160,
            36,
            'BACK',
            '11px',
            0x6c5ce7,
            0x9c27b0,
            0xffffff,
            '#ffffff',
            () => this.scene.start(SceneKeys.MainMenu)
        );

        this.clearButton = createButton(
            this,
            SCREEN_W - 80,
            SCREEN_H - 30,
            120,
            36,
            'CLEAR ALL',
            '9px',
            0x444466,
            0x664444,
            0xff6666,
            '#ff6666',
            () => {
                GameLogger.clearAll();
                this.scene.restart();
            }
        );
    }

    private updateBackButton (mode: ViewMode): void
    {
        if (!this.backButton) return;

        const label = mode === 'detail' ? '< BACK TO LIST' : 'BACK';
        const fontSize = mode === 'detail' ? '10px' : '11px';
        this.backButton.text.setText(label);
        this.backButton.text.setFontSize(fontSize);

        this.backButton.bg.removeAllListeners('pointerdown');
        this.backButton.bg.on('pointerdown', () => {
            if (mode === 'detail') {
                this.showList();
            } else {
                this.scene.start(SceneKeys.MainMenu);
            }
        });
    }

    private showList (): void
    {
        this.currentView = 'list';
        this.detailView?.destroy();
        this.detailView = null;

        this.listView = new HistoryListView(this, this.records, (record) => this.showDetail(record));
        this.updateBackButton('list');
        this.clearButton?.bg.setVisible(true);
        this.clearButton?.text.setVisible(true);
    }

    private showDetail (record: GameRecord): void
    {
        this.currentView = 'detail';
        this.listView?.destroy();
        this.listView = null;

        this.detailView = new HistoryDetailView(this, record);
        this.updateBackButton('detail');
        this.clearButton?.bg.setVisible(false);
        this.clearButton?.text.setVisible(false);
    }
}

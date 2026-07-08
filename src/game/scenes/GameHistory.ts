import { Scene } from 'phaser';
import { SceneKeys } from '../constants/SceneKeys';
import { RecordsQuery } from '../services/BackendClient';
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
type SortBy = 'date' | 'duration' | 'agents';

export class GameHistory extends Scene
{
    private records: GameRecord[] = [];
    private currentView: ViewMode = 'list';
    private listView: HistoryListView | null = null;
    private detailView: HistoryDetailView | null = null;
    private sessionId: string = '';
    private showAllSessions = false;
    private sessionNameFilter = '';
    private sortBy: SortBy = 'date';
    private sortOrder: 'asc' | 'desc' = 'desc';

    private backButton: ButtonPair | null = null;
    private filterButton: ButtonPair | null = null;
    private filterContainer: Phaser.GameObjects.Container | null = null;
    private sortContainer: Phaser.GameObjects.Container | null = null;
    private filterInputElement: HTMLInputElement | null = null;
    private sortButtons: Map<SortBy, { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }> = new Map();
    private orderButton: { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } | null = null;

    constructor ()
    {
        super('GameHistory');
    }

    async create (data?: { sessionId?: string })
    {
        this.sessionId = data?.sessionId || '';
        this.showAllSessions = false;
        this.sessionNameFilter = '';
        this.sortBy = 'date';
        this.sortOrder = 'desc';

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

        this.createFilterControls();
        this.createSortControls();
        this.createButtons();
        await this.loadRecords();
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

    private async loadRecords (): Promise<void>
    {
        try {
            if (this.showAllSessions) {
                const query: RecordsQuery = {
                    sessionName: this.sessionNameFilter || undefined,
                    sortBy: this.sortBy,
                    sortOrder: this.sortOrder
                };
                this.records = await GameLogger.loadAllGlobal(query);
            } else if (this.sessionId) {
                const loaded = await GameLogger.loadAll(this.sessionId);
                this.records = this.sortRecords(loaded);
            } else {
                this.records = [];
            }
        } catch (e) {
            console.error('[GameHistory] Failed to load records:', e);
            this.records = [];
        }
    }

    private sortRecords (records: GameRecord[]): GameRecord[] {
        const sorted = [...records];
        sorted.sort((a, b) => {
            let comparison = 0;
            switch (this.sortBy) {
                case 'date':
                    comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                    break;
                case 'duration':
                    comparison = a.durationMs - b.durationMs;
                    break;
                case 'agents':
                    comparison = a.agentCount - b.agentCount;
                    break;
            }
            return this.sortOrder === 'asc' ? comparison : -comparison;
        });
        return sorted;
    }

    private getHeaderText (): string
    {
        if (this.showAllSessions) {
            return `${this.records.length} game(s) — all sessions`;
        }
        if (this.sessionId) {
            return `${this.records.length} game(s) — session: ${this.sessionId}`;
        }
        return `${this.records.length} game(s) recorded`;
    }

    private createFilterControls (): void
    {
        this.filterContainer = this.add.container(0, 0).setDepth(5).setVisible(false);

        const label = this.add.text(30, 58, 'Filter:', {
            fontFamily: FONT,
            fontSize: '9px',
            color: '#aaaaaa'
        })
            .setOrigin(0, 0.5)
            .setDepth(5);

        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.value = this.sessionNameFilter;
        inputElement.placeholder = 'session name...';
        inputElement.style.cssText = `
            width: 160px;
            height: 24px;
            background: #16213e;
            border: 1px solid #6c5ce7;
            color: white;
            font-family: 'Press Start 2P', monospace;
            font-size: 8px;
            padding: 0 8px;
            outline: none;
        `;

        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        inputElement.addEventListener('input', () => {
            this.sessionNameFilter = inputElement.value;
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.applyFilter(), 400);
        });

        this.filterInputElement = inputElement;

        const inputField = this.add.dom(140, 58, inputElement)
            .setDepth(6);

        const clearButton = this.createSortButton(260, 58, 'X', () => {
            inputElement.value = '';
            this.sessionNameFilter = '';
            this.applyFilter();
        }, true);

        this.filterContainer.add([label, inputField, clearButton.container]);
    }

    private createSortControls (): void
    {
        this.sortContainer = this.add.container(0, 0).setDepth(5);

        const sortOptions: SortBy[] = ['date', 'duration', 'agents'];
        const startX = SCREEN_W - 320;
        let currentX = startX;

        this.add.text(startX, 58, 'Sort:', {
            fontFamily: FONT,
            fontSize: '9px',
            color: '#aaaaaa'
        })
            .setOrigin(0, 0.5)
            .setDepth(5);

        currentX += 42;

        const orderButton = this.createSortButton(currentX, 58, '↓', () => {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            this.applyFilter();
        }, true);
        this.sortContainer!.add(orderButton.container);
        this.orderButton = orderButton;
        currentX += 42;

        sortOptions.forEach((option) => {
            const button = this.createSortButton(currentX, 58, option.toUpperCase(), () => {
                if (this.sortBy === option) {
                    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortBy = option;
                    this.sortOrder = 'desc';
                }
                this.applyFilter();
            }, false);
            this.sortButtons.set(option, button);
            this.sortContainer!.add(button.container);
            currentX += 86;
        });
    }

    private updateSortButtonStates (): void
    {
        this.orderButton?.text.setText(this.sortOrder === 'asc' ? '↑' : '↓');
        for (const [option, button] of this.sortButtons) {
            const active = this.sortBy === option;
            button.bg.setData('active', active);
            button.bg.setFillStyle(active ? 0x6c5ce7 : 0x2a4a6e);
            button.text.setColor(active ? '#ffffff' : '#aaaaaa');
        }
    }

    private createSortButton (
        x: number,
        y: number,
        label: string,
        onClick: () => void,
        fixedWidth: boolean
    ): { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }
    {
        const width = fixedWidth ? 26 : label.length * 8 + 18;
        const height = 24;

        const bg = this.add.rectangle(x, y, width, height, 0x2a4a6e)
            .setStrokeStyle(1, 0xffffff)
            .setDepth(5);

        const text = this.add.text(x, y, label, {
            fontFamily: FONT,
            fontSize: '8px',
            color: '#ffffff'
        })
            .setOrigin(0.5)
            .setDepth(6);

        const container = this.add.container(0, 0, [bg, text]).setDepth(5);

        [bg, text].forEach(obj => {
            obj.setInteractive();
            obj.on('pointerover', () => {
                if (!bg.getData('active')) bg.setFillStyle(0x4a6a8e);
            });
            obj.on('pointerout', () => {
                if (!bg.getData('active')) bg.setFillStyle(0x2a4a6e);
            });
            obj.on('pointerdown', () => {
                onClick();
                this.updateSortButtonStates();
            });
        });

        return { container, bg, text };
    }

    private async applyFilter (): Promise<void>
    {
        await this.loadRecords();
        this.showList();
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

        this.filterButton = createButton(
            this,
            SCREEN_W - 110,
            SCREEN_H - 30,
            180,
            36,
            'ALL SESSIONS',
            '9px',
            0x2a4a6e,
            0x4a6a8e,
            0xffffff,
            '#ffffff',
            () => this.toggleFilter()
        );
    }

    private async toggleFilter (): Promise<void>
    {
        this.showAllSessions = !this.showAllSessions;
        this.sessionNameFilter = '';
        if (this.filterInputElement) {
            this.filterInputElement.value = '';
        }
        this.filterContainer?.setVisible(this.showAllSessions);
        await this.loadRecords();
        this.showList();
    }

    private updateFilterButton (): void
    {
        if (!this.filterButton) return;
        const label = this.showAllSessions ? 'THIS SESSION' : 'ALL SESSIONS';
        this.filterButton.text.setText(label);
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
        this.listView?.destroy();
        this.listView = null;

        this.updateFilterButton();
        this.updateSortButtonStates();
        this.filterContainer?.setVisible(this.showAllSessions);
        this.sortContainer?.setVisible(true);

        this.listView = new HistoryListView(
            this,
            this.records,
            (record) => this.showDetail(record),
            this.getHeaderText()
        );
        this.updateBackButton('list');
        this.filterButton?.bg.setVisible(true);
        this.filterButton?.text.setVisible(true);
    }

    private showDetail (record: GameRecord): void
    {
        this.currentView = 'detail';
        this.listView?.destroy();
        this.listView = null;

        this.filterContainer?.setVisible(false);
        this.sortContainer?.setVisible(false);

        this.detailView = new HistoryDetailView(this, record);
        this.updateBackButton('detail');
        this.filterButton?.bg.setVisible(false);
        this.filterButton?.text.setVisible(false);
    }
}

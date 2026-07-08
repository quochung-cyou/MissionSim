import { GameRecord } from '../../services/GameLogger';
import {
    FONT,
    SCREEN_H,
    SCREEN_W,
    createScrollPanel,
    formatRecordStats,
    formatRecordTitle,
    RESULT_COLORS,
    ScrollPanel,
} from './HistoryConstants';

const CARD_W = 820;
const CARD_H = 80;
const CARD_X = SCREEN_W / 2;
const START_Y = 85;
const GAP = 10;
const SCROLL_SPEED = 40;

export class HistoryListView {
    private readonly scene: Phaser.Scene;
    private readonly container: Phaser.GameObjects.Container;
    private readonly panel: ScrollPanel;
    private readonly onSelect: (record: GameRecord) => void;
    private readonly recordCards: { bg: Phaser.GameObjects.Rectangle; record: GameRecord }[] = [];

    constructor (
        scene: Phaser.Scene,
        records: GameRecord[],
        onSelect: (record: GameRecord) => void,
        headerText?: string
    ) {
        this.scene = scene;
        this.onSelect = onSelect;
        this.container = scene.add.container(0, 0).setDepth(2);

        const header = headerText ?? `${records.length} game(s) recorded`;
        const count = this.scene.add.text(SCREEN_W / 2, 62, header, {
            fontFamily: FONT,
            fontSize: '9px',
            color: '#666666',
        })
            .setOrigin(0.5);

        this.container.add(count);

        const panelHeight = SCREEN_H - START_Y - 80;
        this.panel = createScrollPanel(scene, SCREEN_W / 2, START_Y + panelHeight / 2, CARD_W, panelHeight, this.container.depth);
        // panel.content is kept at the root of the scene display list so its mask works.

        if (records.length === 0) {
            const empty = this.scene.add.text(SCREEN_W / 2, SCREEN_H / 2, 'No game records found.\nPlay a game to see history here.', {
                fontFamily: FONT,
                fontSize: '12px',
                color: '#666666',
                align: 'center',
                lineSpacing: 8,
            })
                .setOrigin(0.5);
            this.container.add(empty);
            this.panel.setContentHeight(0);
            return;
        }

        let totalHeight = 0;
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const y = i * (CARD_H + GAP);
            const cardContainer = this.createCard(record, y);
            this.panel.content.add(cardContainer);
            totalHeight = y + CARD_H;
        }

        this.panel.setContentHeight(totalHeight);
    }

    private createCard (record: GameRecord, y: number): Phaser.GameObjects.Container {
        const card = this.scene.add.container(0, 0);

        const resultColor = RESULT_COLORS[record.result] ?? '#ffffff';

        const bg = this.scene.add.rectangle(CARD_X, y + CARD_H / 2, CARD_W, CARD_H, 0x1a1a2e)
            .setStrokeStyle(2, 0x333355)
            .setInteractive({ useHandCursor: true });

        const title = this.scene.add.text(CARD_X - CARD_W / 2 + 16, y + 10,
            formatRecordTitle(record), {
                fontFamily: FONT,
                fontSize: '12px',
                color: resultColor,
                stroke: '#000000',
                strokeThickness: 3,
            })
            .setOrigin(0, 0.5);

        const sessionText = record.sessionDisplayName
            ? `Session: ${record.sessionDisplayName}`
            : null;

        const sessionRow = sessionText
            ? this.scene.add.text(CARD_X - CARD_W / 2 + 16, y + 28,
                sessionText, {
                    fontFamily: FONT,
                    fontSize: '8px',
                    color: '#aaaaaa',
                })
                .setOrigin(0, 0.5)
            : null;

        const dateRow = this.scene.add.text(CARD_X - CARD_W / 2 + 16, y + (sessionRow ? 44 : 32),
            new Date(record.date).toLocaleString(), {
                fontFamily: FONT,
                fontSize: '8px',
                color: '#888888',
            })
            .setOrigin(0, 0.5);

        const statsRow = this.scene.add.text(CARD_X - CARD_W / 2 + 16, y + (sessionRow ? 60 : 50),
            formatRecordStats(record), {
                fontFamily: FONT,
                fontSize: '8px',
                color: '#aaaaaa',
            })
            .setOrigin(0, 0.5);

        const arrow = this.scene.add.text(CARD_X + CARD_W / 2 - 20, y + CARD_H / 2, '>', {
            fontFamily: FONT,
            fontSize: '14px',
            color: '#666666',
        })
            .setOrigin(0.5);

        bg.on('pointerover', () => {
            bg.setFillStyle(0x2a2a4e);
            arrow.setColor('#ffffff');
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(0x1a1a2e);
            arrow.setColor('#666666');
        });
        bg.on('pointerdown', () => this.onSelect(record));

        this.recordCards.push({ bg, record });

        const cardItems: (Phaser.GameObjects.GameObject | null)[] = [bg, title, sessionRow, dateRow, statsRow, arrow];
        card.add(cardItems.filter(item => item !== null) as Phaser.GameObjects.GameObject[]);
        return card;
    }

    handleWheel (deltaY: number): void {
        this.panel.scrollBy(Math.sign(deltaY) * SCROLL_SPEED);
    }

    destroy (): void {
        this.panel.destroy();
        this.container.destroy();
    }
}

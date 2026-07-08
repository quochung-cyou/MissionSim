import { GameRecord } from '../../services/GameLogger';
import {
    FONT,
    MONO_FONT,
    SCREEN_H,
    SCREEN_W,
    createScrollPanel,
    formatCommand,
    formatFinalState,
    formatRecordSubtitle,
    formatRecordTitle,
    RESULT_COLORS,
    ScrollPanel,
    TYPE_COLORS,
    TYPE_ICONS,
} from './HistoryConstants';

const HEADER_H = 130;
const LOG_AREA_MARGIN = 40;
const SCROLL_SPEED = 30;
const ENTRY_PADDING = 6;

export class HistoryDetailView {
    private readonly scene: Phaser.Scene;
    private readonly container: Phaser.GameObjects.Container;
    private readonly panel: ScrollPanel;

    constructor (
        scene: Phaser.Scene,
        record: GameRecord
    ) {
        this.scene = scene;
        this.container = scene.add.container(0, 0).setDepth(2);

        const resultColor = RESULT_COLORS[record.result] ?? '#ffffff';

        // Header background
        const headerBg = this.scene.add.rectangle(SCREEN_W / 2, 65, 880, 110, 0x1a1a2e)
            .setStrokeStyle(2, 0x333355)
            .setDepth(2);
        this.container.add(headerBg);

        const title = this.scene.add.text(SCREEN_W / 2, 32, formatRecordTitle(record), {
            fontFamily: FONT,
            fontSize: '14px',
            color: resultColor,
            stroke: '#000000',
            strokeThickness: 3,
        })
            .setOrigin(0.5)
            .setDepth(3);

        const sessionName = record.sessionDisplayName || record.sessionId || 'Unknown session';
        const sessionInfo = this.scene.add.text(SCREEN_W / 2, 52, `Session: ${sessionName}`, {
            fontFamily: FONT,
            fontSize: '8px',
            color: '#aaaaaa',
        })
            .setOrigin(0.5)
            .setDepth(3);

        const subtitle = this.scene.add.text(SCREEN_W / 2, 68, formatRecordSubtitle(record), {
            fontFamily: FONT,
            fontSize: '8px',
            color: '#888888',
        })
            .setOrigin(0.5)
            .setDepth(3);

        const agentNames = record.agents.map(a => a.displayName).join(', ');
        const crew = this.scene.add.text(SCREEN_W / 2, 88, `Crew: ${agentNames}`, {
            fontFamily: FONT,
            fontSize: '9px',
            color: '#ce93d8',
        })
            .setOrigin(0.5)
            .setDepth(3);

        const headerItems: Phaser.GameObjects.GameObject[] = [title, sessionInfo, subtitle, crew];

        const finalState = formatFinalState(record);
        if (finalState) {
            const finalStateText = this.scene.add.text(SCREEN_W / 2, 105, finalState, {
                fontFamily: FONT,
                fontSize: '8px',
                color: '#80cbc4',
            })
                .setOrigin(0.5)
                .setDepth(3);
            headerItems.push(finalStateText);
        }

        this.container.add(headerItems);

        // Log area
        const logStartY = HEADER_H + 20;
        const logAreaH = SCREEN_H - logStartY - 70;
        const logX = LOG_AREA_MARGIN;
        const logW = SCREEN_W - LOG_AREA_MARGIN * 2;

        const logBg = this.scene.add.rectangle(SCREEN_W / 2, logStartY + logAreaH / 2, logW, logAreaH, 0x0d0d1a)
            .setStrokeStyle(1, 0x222244)
            .setDepth(2);
        this.container.add(logBg);

        this.panel = createScrollPanel(scene, SCREEN_W / 2, logStartY + logAreaH / 2, logW, logAreaH, this.container.depth);

        const entryWrapWidth = logW - 16;
        let currentY = 0;
        for (let i = 0; i < record.entries.length; i++) {
            const entry = record.entries[i];
            const typeColor = TYPE_COLORS[entry.type] ?? '#ffffff';
            const icon = TYPE_ICONS[entry.type] ?? '[?]';

            let line = `${icon} T${entry.tick}`;
            if (entry.agent_display) line += ` ${entry.agent_display}:`;
            line += ` ${entry.data}`;
            if (entry.emotion) line += ` (${entry.emotion})`;
            if (entry.command && entry.command.type !== 'none' && entry.command.type !== 'standby') {
                line += formatCommand(entry.command);
            }

            const text = this.scene.add.text(logX + 8, currentY, line, {
                fontFamily: MONO_FONT,
                fontSize: '11px',
                color: typeColor,
                wordWrap: { width: entryWrapWidth },
            })
                .setOrigin(0, 0)
                .setDepth(3);

            this.panel.content.add(text);
            currentY += text.height + ENTRY_PADDING;
        }

        this.panel.setContentHeight(currentY);

        const scrollHint = this.scene.add.text(SCREEN_W / 2, SCREEN_H - 35,
            'Mouse wheel to scroll | ESC or BACK to return', {
                fontFamily: FONT,
                fontSize: '8px',
                color: '#555555',
            })
            .setOrigin(0.5)
            .setDepth(3);

        this.container.add(scrollHint);
    }

    handleWheel (deltaY: number): void {
        this.panel.scrollBy(Math.sign(deltaY) * SCROLL_SPEED);
    }

    destroy (): void {
        this.panel.destroy();
        this.container.destroy();
    }
}

import Phaser from 'phaser';
import { GameRecord, LogEntry } from '../../services/GameLogger';
import { AgentCommand } from '../../services/QwenClient';

export const SCREEN_W = 960;
export const SCREEN_H = 640;
export const FONT = '"Press Start 2P", monospace';
export const MONO_FONT = 'monospace';

export const RESULT_COLORS: Record<string, string> = {
    win: '#4caf50',
    lose: '#ff4444',
    timeout: '#ff9800',
    incomplete: '#90caf9',
};

export const RESULT_LABELS: Record<string, string> = {
    win: 'WIN',
    lose: 'LOSS',
    timeout: 'TIMEOUT',
    incomplete: 'INCOMPLETE',
};

export const TYPE_COLORS: Record<string, string> = {
    chat: '#90caf9',
    action: '#ffca28',
    system: '#aaaaaa',
    crisis: '#ff4444',
    standby: '#ce93d8',
    task_complete: '#4caf50',
    state: '#80cbc4',
};

export const TYPE_ICONS: Record<string, string> = {
    chat: '[CHAT]',
    action: '[ACT]',
    system: '[SYS]',
    crisis: '[!CRISIS!]',
    standby: '[STBY]',
    task_complete: '[DONE]',
    state: '[STATE]',
};

export interface ScrollPanel {
    content: Phaser.GameObjects.Container;
    visibleHeight: number;
    scrollBy: (deltaPixels: number) => void;
    scrollTo: (y: number) => void;
    setContentHeight: (height: number) => void;
    getContentHeight: () => number;
    destroy: () => void;
}

export function createScrollPanel (
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    depth = 2
): ScrollPanel {
    // Content container lives at the ROOT of the scene display list so that
    // Phaser's geometry mask is applied correctly in both Canvas and WebGL.
    const content = scene.add.container(0, 0).setDepth(depth);

    // Mask source must not be inside a container. Add it to the scene but keep it invisible.
    const maskShape = scene.add.rectangle(x, y, width, height, 0xffffff).setVisible(false);
    const mask = maskShape.createGeometryMask();
    content.setMask(mask);

    let contentHeight = 0;
    let scrollY = 0;
    const top = y - height / 2;
    let activeTween: Phaser.Tweens.Tween | null = null;

    const clamp = (value: number): number => Math.max(0, Math.min(value, Math.max(0, contentHeight - height)));

    const setPosition = (targetY: number): void => {
        content.y = top - targetY;
    };

    const animateTo = (targetY: number, duration = 150): void => {
        if (activeTween) {
            activeTween.stop();
            activeTween = null;
        }
        const currentY = top - content.y;
        const nextY = clamp(targetY);
        if (Math.abs(nextY - currentY) < 1) return;

        activeTween = scene.tweens.add({
            targets: content,
            y: top - nextY,
            duration,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                activeTween = null;
            },
        });
    };

    return {
        content,
        visibleHeight: height,
        scrollBy: (deltaPixels: number) => {
            scrollY = clamp(scrollY + deltaPixels);
            animateTo(scrollY);
        },
        scrollTo: (yPos: number) => {
            scrollY = clamp(yPos);
            animateTo(scrollY, 0);
        },
        setContentHeight: (h: number) => {
            contentHeight = h;
            scrollY = clamp(scrollY);
            setPosition(scrollY);
        },
        getContentHeight: () => contentHeight,
        destroy: () => {
            if (activeTween) {
                activeTween.stop();
                activeTween = null;
            }
            maskShape.destroy();
            content.destroy();
        },
    };
}

export function formatRecordTitle (record: GameRecord): string {
    const resultLabel = RESULT_LABELS[record.result] ?? 'UNKNOWN';
    return `${resultLabel} — ${record.endReason.toUpperCase()}`;
}

export function formatRecordSubtitle (record: GameRecord): string {
    return `${new Date(record.date).toLocaleString()} | ${record.tickCount} ticks | ${(record.durationMs / 1000).toFixed(1)}s | ${record.entries.length} entries`;
}

export function formatRecordStats (record: GameRecord): string {
    return `${record.agents.length} agents | ${record.tickCount} ticks | ${(record.durationMs / 1000).toFixed(1)}s | ${record.entries.length} entries`;
}

export function formatFinalState (record: GameRecord): string | null {
    if (!record.finalState) return null;
    const fs = record.finalState;
    return `Final: O2=${fs.oxygen}% | Oil=${fs.oil} | Power=${fs.basePower} | Heat=${fs.mach3Heat}°C | Extraction=${fs.extractionProgress}%`;
}

export function formatLogLine (entry: LogEntry): string {
    const icon = TYPE_ICONS[entry.type] ?? '[?]';

    let line = `${icon} T${entry.tick}`;
    if (entry.agent_display) {
        line += ` ${entry.agent_display}:`;
    }
    line += ` ${entry.data}`;
    if (entry.emotion) {
        line += ` (${entry.emotion})`;
    }
    if (entry.command && entry.command.type !== 'none' && entry.command.type !== 'standby') {
        line += formatCommand(entry.command);
    }
    return line;
}

export function formatCommand (command: AgentCommand): string {
    let suffix = ` → ${command.type}`;
    if (command.target_x !== undefined) suffix += ` x=${command.target_x}`;
    if (command.machine) suffix += ` [${command.machine}]`;
    if (command.allocations) {
        const { Crane, Mach_1, Mach_2 } = command.allocations;
        suffix += ` {Crane=${Crane}, Mach_1=${Mach_1}, Mach_2=${Mach_2}}`;
    }
    return suffix;
}

export interface ButtonPair {
    bg: Phaser.GameObjects.Rectangle;
    text: Phaser.GameObjects.Text;
}

export function createButton (
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    fontSize: string,
    color: number,
    hoverColor: number,
    strokeColor: number,
    textColor: string,
    onClick: () => void
): ButtonPair {
    const bg = scene.add.rectangle(x, y, width, height, color)
        .setStrokeStyle(2, strokeColor)
        .setDepth(10)
        .setInteractive({ useHandCursor: true });

    const text = scene.add.text(x, y, label, {
        fontFamily: FONT,
        fontSize,
        color: textColor,
        stroke: '#000000',
        strokeThickness: 3,
    })
        .setOrigin(0.5)
        .setDepth(11);

    bg.on('pointerover', () => bg.setFillStyle(hoverColor));
    bg.on('pointerout', () => bg.setFillStyle(color));
    bg.on('pointerdown', onClick);

    return { bg, text };
}

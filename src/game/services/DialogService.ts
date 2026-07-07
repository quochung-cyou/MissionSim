import { Dialog, Emotion, AvatarRef } from '../ui/Dialog';
import { AssetKeys } from '../constants/AssetKeys';

interface QueuedMessage {
    name: string;
    text: string;
    avatar: AvatarRef;
    duration: number;
    originTick?: number;
}

interface CinematicMessage {
    text: string;
    cameraX: number;
    duration: number;
}

const DEFAULT_DISPLAY_MS = 4000;
const SYSTEM_DISPLAY_MS = 1000;
const CINEMATIC_DISPLAY_MS = 1000;
const CINEMATIC_PAN_MS = 1200;

const AGENT_EMOTIONS: Record<string, Emotion> = {
    'Heavy Mechanic': 'calm',
    'Base Director': 'calm2',
    'Safety Scientist': 'attention',
};

export class DialogService {
    private readonly dialog: Dialog;
    private queue: QueuedMessage[] = [];
    private cinematicQueue: CinematicMessage[] = [];
    private currentTimer: Phaser.Time.TimerEvent | undefined;
    private isPlaying = false;
    private isPlayingCinematic = false;
    private cinematicCompleteCallback: (() => void) | null = null;
    private currentTick = 0;

    constructor (scene: Phaser.Scene) {
        this.dialog = new Dialog(scene);
    }

    showForNpc (npcIndex: number, emotion: Emotion = 'calm'): void {
        const scientist = ((npcIndex % 3) + 1) as 1 | 2 | 3;
        const names = ['Heavy Mechanic', 'Base Director', 'Safety Scientist'];
        const name = names[npcIndex % names.length];
        this.enqueue(name, 'Debug dialog test.', { scientist, emotion });
    }

    enqueueAgentMessage (name: string, text: string, scientistSet: 1 | 2 | 3 = 1, emotion?: string, originTick?: number): void {
        const validEmotions: Emotion[] = ['calm', 'calm2', 'smile', 'attention', 'aggression', 'special'];
        const emo = (emotion && validEmotions.includes(emotion as Emotion)) ? emotion as Emotion : (AGENT_EMOTIONS[name] ?? 'calm');
        const gap = originTick !== undefined ? this.currentTick - originTick : 0;
        console.log(`[DialogService] Agent message queued @ tick ${this.currentTick} (spoken @ tick ${originTick ?? '?'}, gap=${gap} ticks, queueAhead=${this.queue.length}): ${name} (emotion=${emo}): ${text}`);
        this.enqueue(name, text, { scientist: scientistSet, emotion: emo }, DEFAULT_DISPLAY_MS, originTick);
    }

    enqueueCinematicMessage (text: string, cameraX: number, duration: number = CINEMATIC_DISPLAY_MS): void {
        console.log(`[DialogService] Cinematic message queued: cameraX=${cameraX}: ${text}`);
        this.cinematicQueue.push({ text, cameraX, duration });
        if (!this.isPlayingCinematic) {
            this.playNextCinematic();
        }
    }

    onCinematicComplete (callback: () => void): void {
        this.cinematicCompleteCallback = callback;
    }

    private playNextCinematic (): void {
        if (this.cinematicQueue.length === 0) {
            this.isPlayingCinematic = false;
            this.dialog.hide();
            console.log('[DialogService] Cinematic sequence complete, starting regular queue');
            if (this.cinematicCompleteCallback) {
                this.cinematicCompleteCallback();
                this.cinematicCompleteCallback = null;
            }
            if (this.queue.length > 0) {
                this.playNext();
            }
            return;
        }

        this.isPlayingCinematic = true;
        const msg = this.cinematicQueue.shift()!;
        const scene = this.dialog.getScene();
        const camera = scene.cameras.main;

        console.log(`[DialogService] Cinematic: panning camera to x=${msg.cameraX}, showing: ${msg.text}`);

        scene.sound.play(AssetKeys.Audio.Piano, { volume: 0.6 });

        camera.pan(msg.cameraX, camera.scrollY + camera.height / 2, CINEMATIC_PAN_MS, 'Sine.easeInOut');

        scene.time.delayedCall(CINEMATIC_PAN_MS, () => {
            this.dialog.showInstant('SYSTEM', msg.text, { scientist: 1, emotion: 'attention' });
            console.log(`[DialogService] Cinematic showing: ${msg.text}`);

            if (this.currentTimer) {
                this.currentTimer.remove();
            }
            this.currentTimer = scene.time.delayedCall(msg.duration, () => {
                this.dialog.hide();
                scene.time.delayedCall(300, () => {
                    this.playNextCinematic();
                });
            });
        });
    }

    enqueueSystemMessage (text: string, originTick?: number): void {
        const gap = originTick !== undefined ? this.currentTick - originTick : 0;
        console.log(`[DialogService] System message queued @ tick ${this.currentTick} (spoken @ tick ${originTick ?? '?'}, gap=${gap} ticks, queueAhead=${this.queue.length}): ${text}`);
        this.enqueue('SYSTEM', text, { scientist: 1, emotion: 'attention' }, SYSTEM_DISPLAY_MS, originTick);
    }

    private enqueue (name: string, text: string, avatar: AvatarRef, duration: number = DEFAULT_DISPLAY_MS, originTick?: number): void {
        this.queue.push({ name, text, avatar, duration, originTick });
        if (!this.isPlaying && !this.isPlayingCinematic) {
            this.playNext();
        }
    }

    setCurrentTick (tick: number): void {
        this.currentTick = tick;
    }

    private playNext (): void {
        if (this.queue.length === 0) {
            this.isPlaying = false;
            this.dialog.hide();
            return;
        }

        this.isPlaying = true;
        const msg = this.queue.shift()!;
        const gap = msg.originTick !== undefined ? this.currentTick - msg.originTick : 0;
        console.log(`[DialogService] Showing @ tick ${this.currentTick} (spoken @ tick ${msg.originTick ?? '?'}, queueWait=${gap} ticks): ${msg.name}: ${msg.text}`);
        this.dialog.show(msg.name, msg.text, msg.avatar);

        if (this.currentTimer) {
            this.currentTimer.remove();
        }

        const scene = this.dialog.getScene();
        this.currentTimer = scene.time.delayedCall(msg.duration, () => {
            this.playNext();
        });
    }

    hide (): void {
        this.queue = [];
        this.cinematicQueue = [];
        this.isPlaying = false;
        this.isPlayingCinematic = false;
        if (this.currentTimer) {
            this.currentTimer.remove();
            this.currentTimer = undefined;
        }
        this.dialog.hide();
    }

    getQueueLength (): number {
        return this.queue.length;
    }
}

import { BackendClient } from './BackendClient';
import { PromptBuilder, PromptContext } from './PromptBuilder';

const FALLBACK_RESPONSE: AgentResponse = {
    speak: 'I am recalculating my coordinates.',
    emotion: 'calm',
    command: { type: 'none' },
};

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface QwenClientConfig {
    model?: string;
    enableThinking?: boolean;
    stream?: boolean;
    temperature?: number;
    maxTokens?: number;
}

export interface StreamChunk {
    content: string;
    reasoningContent: string;
    done: boolean;
}

export interface AgentCommand {
    type: 'move' | 'interact' | 'allocate' | 'repair' | 'reset' | 'standby' | 'none';
    target_x?: number;
    mode?: 'walk' | 'run';
    machine?: 'Mach_1' | 'Mach_2' | 'Mach_3' | 'Terminal' | 'Oil' | 'Crane';
    allocations?: { Crane: number; Mach_1: number; Mach_2: number };
    standby_reason?: string;
    sub_action?: {
        type: 'allocate' | 'repair' | 'reset' | 'interact';
        machine?: 'Mach_1' | 'Mach_2' | 'Mach_3' | 'Terminal' | 'Oil' | 'Crane';
        allocations?: { Crane: number; Mach_1: number; Mach_2: number };
    };
}

export interface AgentResponse {
    speak: string;
    emotion: string;
    command: AgentCommand;
}

export class QwenClient {
    private readonly config: Required<QwenClientConfig>;

    constructor (config: QwenClientConfig = {}) {
        this.config = {
            model: config.model ?? 'qwen-max',
            enableThinking: config.enableThinking ?? true,
            stream: config.stream ?? false,
            temperature: config.temperature ?? 0.7,
            maxTokens: config.maxTokens ?? 2048,
        };
    }

    static isApiKeyAvailable (): boolean {
        return true;
    }

    buildSystemMessage (ctx: PromptContext): ChatMessage {
        return {
            role: 'system',
            content: PromptBuilder.buildSystemPrompt(ctx),
        };
    }

    async chat (messages: ChatMessage[]): Promise<string> {
        console.log(`[QwenClient] chat() — messages=${messages.length}`);

        const { content } = await BackendClient.chat(messages, {
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
            enable_thinking: this.config.enableThinking
        });

        console.log(`[QwenClient] chat() response length=${content.length}`);
        return content;
    }

    async chatAndParse (messages: ChatMessage[]): Promise<AgentResponse> {
        const fullContent = await this.chat(messages);

        console.log(`[QwenClient] chatAndParse() raw content: ${fullContent.substring(0, 200)}${fullContent.length > 200 ? '...' : ''}`);

        const result = this.parseAgentResponse(fullContent);
        console.log(`[QwenClient] Parsed response: speak="${result.speak}", command=${result.command.type}`);
        return result;
    }

    static parseAgentResponse (content: string): AgentResponse {
        try {
            const jsonStr = QwenClient.extractJson(content);
            const parsed = JSON.parse(jsonStr);
            if (!parsed || typeof parsed !== 'object' || !parsed.command) {
                console.warn('[QwenClient] Parsed JSON missing command field, using fallback.');
                return { ...FALLBACK_RESPONSE };
            }
            return parsed as AgentResponse;
        } catch (e) {
            console.warn(`[QwenClient] Failed to parse agent response: ${(e as Error).message}. Using fallback.`);
            return { ...FALLBACK_RESPONSE };
        }
    }

    private parseAgentResponse (content: string): AgentResponse {
        return QwenClient.parseAgentResponse(content);
    }

    private static extractJson (content: string): string {
        const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) {
            return fenceMatch[1].trim();
        }

        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            return content.substring(jsonStart, jsonEnd + 1);
        }

        throw new Error('Failed to extract JSON from agent response.');
    }
}

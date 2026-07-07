import { ApiKeyManager } from '../utils/ApiKeyManager';
import { PromptBuilder, PromptContext } from './PromptBuilder';

const QWEN_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const DEFAULT_MODEL = 'qwen-max';

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
            model: config.model ?? DEFAULT_MODEL,
            enableThinking: config.enableThinking ?? true,
            stream: config.stream ?? true,
            temperature: config.temperature ?? 0.7,
            maxTokens: config.maxTokens ?? 2048,
        };
    }

    static isApiKeyAvailable (): boolean {
        return ApiKeyManager.hasApiKey();
    }

    buildSystemMessage (ctx: PromptContext): ChatMessage {
        return {
            role: 'system',
            content: PromptBuilder.buildSystemPrompt(ctx),
        };
    }

    async chat (messages: ChatMessage[]): Promise<string> {
        const apiKey = ApiKeyManager.getApiKey();
        if (!apiKey) {
            throw new Error('No API key found. Please set your Qwen API key in the game settings.');
        }

        console.log(`[QwenClient] chat() — model=${this.config.model}, messages=${messages.length}`);

        const body = {
            model: this.config.model,
            messages,
            stream: false,
            enable_thinking: this.config.enableThinking,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
        };

        const response = await fetch(QWEN_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[QwenClient] API error ${response.status}: ${errorText}`);
            throw new Error(`Qwen API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content ?? '';
        console.log(`[QwenClient] chat() response length=${content.length}`);
        return content;
    }

    async *chatStream (messages: ChatMessage[]): AsyncGenerator<StreamChunk> {
        const apiKey = ApiKeyManager.getApiKey();
        if (!apiKey) {
            throw new Error('No API key found. Please set your Qwen API key in the game settings.');
        }

        console.log(`[QwenClient] chatStream() — model=${this.config.model}, messages=${messages.length}`);

        const body = {
            model: this.config.model,
            messages,
            stream: true,
            enable_thinking: this.config.enableThinking,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
        };

        const response = await fetch(QWEN_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[QwenClient] Stream API error ${response.status}: ${errorText}`);
            throw new Error(`Qwen API error (${response.status}): ${errorText}`);
        }

        if (!response.body) {
            throw new Error('No response body from Qwen API.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let contentAccumulator = '';
        let reasoningAccumulator = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;

                    const data = trimmed.slice(6);
                    if (data === '[DONE]') {
                        yield { content: contentAccumulator, reasoningContent: reasoningAccumulator, done: true };
                        return;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta;
                        if (!delta) continue;

                        if (delta.content) {
                            contentAccumulator += delta.content;
                        }
                        if (delta.reasoning_content) {
                            reasoningAccumulator += delta.reasoning_content;
                        }

                        yield {
                            content: contentAccumulator,
                            reasoningContent: reasoningAccumulator,
                            done: false,
                        };
                    } catch {
                        // Skip malformed JSON chunks
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        yield { content: contentAccumulator, reasoningContent: reasoningAccumulator, done: true };
    }

    async chatAndParse (messages: ChatMessage[]): Promise<AgentResponse> {
        let fullContent: string;

        if (this.config.stream) {
            let lastChunk: StreamChunk | null = null;
            for await (const chunk of this.chatStream(messages)) {
                lastChunk = chunk;
            }
            fullContent = lastChunk?.content ?? '';
        } else {
            fullContent = await this.chat(messages);
        }

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

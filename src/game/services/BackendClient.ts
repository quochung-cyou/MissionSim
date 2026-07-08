interface ChatMessage {
    role: string;
    content: string;
}

interface ChatRequest {
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    enable_thinking?: boolean;
}

interface ChatResponse {
    content: string;
    model?: string;
}

interface Session {
    id: string;
    display_name: string;
    created_at: string;
    updated_at: string;
}

interface RecordSave {
    id: string;
    result: string;
    durationMs: number;
    recordJson: string;
}

interface Record {
    id: string;
    session_id: string;
    session_display_name?: string;
    result: string;
    duration_ms: number;
    record_json: string;
    created_at: string;
}

interface RecordsQuery {
    sessionName?: string;
    sortBy?: 'date' | 'duration' | 'agents';
    sortOrder?: 'asc' | 'desc';
}

class BackendClient {
    private static readonly API_BASE = 'https://apimissionsim.quochung.cyou/api';

    static async chat(messages: ChatMessage[], options: {
        temperature?: number;
        max_tokens?: number;
        enable_thinking?: boolean;
    } = {}): Promise<{ content: string; model?: string }> {
        const request: ChatRequest = {
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.max_tokens ?? 2048,
            enable_thinking: options.enable_thinking ?? false
        };

        const response = await fetch(`${this.API_BASE}/v1/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Backend chat error: ${response.status} - ${error}`);
        }

        const data: ChatResponse = await response.json();
        return { content: data.content, model: data.model };
    }

    static async saveRecord(sessionId: string, record: RecordSave): Promise<void> {
        const response = await fetch(`${this.API_BASE}/sessions/${sessionId}/records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(record)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Backend save record error: ${response.status} - ${error}`);
        }
    }

    static async getRecords(sessionId: string): Promise<Record[]> {
        const response = await fetch(`${this.API_BASE}/sessions/${sessionId}/records`);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Backend get records error: ${response.status} - ${error}`);
        }

        return await response.json();
    }

    static async getSessions(): Promise<Session[]> {
        const response = await fetch(`${this.API_BASE}/sessions`);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Backend get sessions error: ${response.status} - ${error}`);
        }

        return await response.json();
    }

    static async getAllRecords(query: RecordsQuery = {}): Promise<Record[]> {
        const params = new URLSearchParams();
        if (query.sessionName) params.set('session_name', query.sessionName);
        if (query.sortBy) params.set('sort_by', query.sortBy);
        if (query.sortOrder) params.set('sort_order', query.sortOrder);

        const queryString = params.toString();
        const url = `${this.API_BASE}/records${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Backend get all records error: ${response.status} - ${error}`);
        }

        return await response.json();
    }
}

export type { ChatMessage, Session, Record, RecordSave, RecordsQuery };
export { BackendClient };

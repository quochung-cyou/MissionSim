const STORAGE_KEY = 'qwen_api_key';

export class ApiKeyManager {
    static getApiKey (): string | null {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            console.error('Failed to read API key from localStorage:', e);
            return null;
        }
    }

    static setApiKey (key: string): void {
        try {
            localStorage.setItem(STORAGE_KEY, key);
        } catch (e) {
            console.error('Failed to save API key to localStorage:', e);
        }
    }

    static hasApiKey (): boolean {
        return this.getApiKey() !== null && this.getApiKey() !== '';
    }

    static clearApiKey (): void {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.error('Failed to clear API key from localStorage:', e);
        }
    }
}

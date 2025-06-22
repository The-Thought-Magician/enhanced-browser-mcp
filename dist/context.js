import { mcpConfig, createSocketMessageSender } from "./types/index";
const noConnectionMessage = `No connection to browser extension. In order to proceed, you must first connect a tab by clicking the Browser MCP extension icon in the browser toolbar and clicking the 'Connect' button.`;
export class Context {
    _ws;
    get ws() {
        if (!this._ws) {
            throw new Error(noConnectionMessage);
        }
        return this._ws;
    }
    set ws(ws) {
        this._ws = ws;
    }
    hasWs() {
        return !!this._ws;
    }
    async sendSocketMessage(type, payload, options = { timeoutMs: 30000 }) {
        const { sendSocketMessage } = createSocketMessageSender(this.ws);
        try {
            return await sendSocketMessage(type, payload, options);
        }
        catch (e) {
            if (e instanceof Error && e.message === mcpConfig.errors.noConnectedTab) {
                throw new Error(noConnectionMessage);
            }
            throw e;
        }
    }
    async close() {
        if (!this._ws) {
            return;
        }
        await this._ws.close();
    }
}

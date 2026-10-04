import { API_DETECTIONS_URL } from "./constants";

// WebSocket client for real-time detection
type WebSocketCallback = (data: unknown) => void;
type WebSocketErrorCallback = (error: unknown) => void;
type WebSocketCloseCallback = () => void;
const url = import.meta.env.VITE_BACKEND_URL as string;

class WebSocketClient {
    private socket: WebSocket | null = null;
    // http(s):// backend URL -> ws(s):// (browsers accept both, but be explicit)
    private wsApi: string = `${url.replace(/^http/, "ws")}/${API_DETECTIONS_URL}/stream`;
    private onMessageCallback: WebSocketCallback | null = null;
    private onErrorCallback: WebSocketErrorCallback | null = null;
    private onCloseCallback: WebSocketCloseCallback | null = null;

    get isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                resolve();
                return;
            }

            const socket = new WebSocket(this.wsApi);
            this.socket = socket;
            let opened = false;

            socket.onopen = () => {
                opened = true;
                resolve();
            };

            socket.onmessage = (event) => {
                try {
                    this.onMessageCallback?.(JSON.parse(event.data));
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    this.onErrorCallback?.(error);
                }
            };

            socket.onerror = (error) => {
                if (!opened) {
                    reject(error);
                    return;
                }
                this.onErrorCallback?.(error);
            };

            // Only fires for connections we didn't close ourselves (disconnect()
            // detaches the handlers first), so the caller can surface a lost
            // connection instead of the client silently reconnecting.
            socket.onclose = () => {
                if (this.socket === socket) this.socket = null;
                if (opened) this.onCloseCallback?.();
            };
        });
    }

    disconnect(): void {
        if (this.socket) {
            const socket = this.socket;
            this.socket = null;
            socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
            socket.close();
        }
    }

    sendFrame(frameData: string, returnImage: boolean = false): boolean {
        if (!this.socket || !this.isConnected) return false;
        this.socket.send(JSON.stringify({
            image: frameData,
            timestamp: Date.now(),
            return_image: returnImage,
        }));
        return true;
    }

    onMessage(callback: WebSocketCallback): void {
        this.onMessageCallback = callback;
    }

    onError(callback: WebSocketErrorCallback): void {
        this.onErrorCallback = callback;
    }

    onClose(callback: WebSocketCloseCallback): void {
        this.onCloseCallback = callback;
    }
}

// Create a singleton instance
const websocketClient = new WebSocketClient();
export default websocketClient;

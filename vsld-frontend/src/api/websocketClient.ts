// WebSocket client for real-time detection
type WebSocketCallback = (data: unknown) => void;
type WebSocketErrorCallback = (error: unknown) => void;

class WebSocketClient {
    private socket: WebSocket | null = null;
    private isConnected: boolean = false;
    private url: string = 'ws://localhost:8000/ws/detect';
    private onMessageCallback: WebSocketCallback | null = null;
    private onErrorCallback: WebSocketErrorCallback | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectTimeout: number = 2000;

    constructor() {
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.sendFrame = this.sendFrame.bind(this);
        this.onMessage = this.onMessage.bind(this);
        this.onError = this.onError.bind(this);
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.isConnected && this.socket) {
                resolve();
                return;
            }

            this.socket = new WebSocket(this.url);

            this.socket.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('WebSocket connection established');
                resolve();
            };

            this.socket.onclose = (event) => {
                this.isConnected = false;
                console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);

                // Try to reconnect if the connection was lost unexpectedly
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                    setTimeout(() => this.connect(), this.reconnectTimeout);
                }
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (this.onMessageCallback) {
                        this.onMessageCallback(data);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    if (this.onErrorCallback) {
                        this.onErrorCallback(error);
                    }
                }
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                if (this.onErrorCallback) {
                    this.onErrorCallback(error);
                }
                reject(error);
            };
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.isConnected = false;
            this.socket.close();
            this.socket = null;
            console.log('WebSocket connection closed');
        }
    }

    sendFrame(
        frameData: string,
        timestamp?: number,
        returnImage: boolean = false,
        skipFrames: number = 0,
        resizeFactor: number = 1.0,
        inputSize: number = 320
    ): void {
        if (this.socket && this.isConnected) {
            const message = JSON.stringify({
                image: frameData,
                timestamp: timestamp || Date.now(),
                return_image: returnImage,
                skip_frames: skipFrames,
                resize_factor: resizeFactor,
                input_size: inputSize
            });
            this.socket.send(message);
        } else {
            console.warn('Cannot send frame: WebSocket is not connected');
        }
    }

    onMessage(callback: WebSocketCallback): void {
        this.onMessageCallback = callback;
    }

    onError(callback: WebSocketErrorCallback): void {
        this.onErrorCallback = callback;
    }
}

// Create a singleton instance
const websocketClient = new WebSocketClient();
export default websocketClient;
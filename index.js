/**
 * Class representing an IframeSyncClient.
 * Browser iframes that want to participate in state synchronization should instantiate this class.
 */
class IframeSyncClient {
    #channel;
    #recv;
    #clientName;
    #eventListeners;

    /**
     * Create an IframeSyncClient.
     * @param {string} [clientName] - A unique client name. If not provided, one will be generated randomly.
     * @param {function} recv - A callback function to receive state updates.
     */
    constructor(clientName, recv) {
        this.#recv = recv;
        this.#channel = 'IframeSync';
        this.#clientName = clientName || [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        this.#eventListeners = {};

        if (!window) {
          return;
        }

        window.addEventListener('message', (event) => {
            if (!event.data || event.data.channel !== this.#channel) {
                return;
            }

            const isOwnMessage = event.data.sourceClientName === this.#clientName;
            const isReadyReceived = event.data.type === 'iframeSyncReadyReceived';

            if (['iframeSyncStateChange', 'iframeSyncReadyReceived'].includes(event.data.type) && typeof this.#recv === 'function') {
                this.#recv(event.data.payload, isOwnMessage, isReadyReceived);
            } else if (event.data.type === 'iframeSyncEvent') {
                const isOwnEvent = event.data.sourceClientName === this.#clientName;
                const eventLc = event.data.name.toLowerCase();
                this.#eventListeners[eventLc]?.forEach((callback) => callback(event.data.payload, eventLc, isOwnEvent));
            }
        });
    }

    /**
     * Find the window that holds the broker that we will post messages to.
     */
    #getWin() {
        return window?.parent || window;
    }

    /**
     * Notify the parent window that this client is ready to receive state updates.
     */
    ready() {
        const win = this.#getWin();
        if (!win) {
            return;
        }

        win.postMessage({
            channel: this.#channel,
            type: 'iframeSyncReady',
            sourceClientName: this.#clientName
        }, '*');
    }

    /**
     * Send a state update to the broker, which will broadcast it to all other clients.
     * Partial updates are OK, as the broker will merge the update into the current state.
     * @param {Object} update - The state update to send.
     */
    stateChange(update) {
        const win = this.#getWin();
        if (!win) {
            return;
        }

        win.postMessage({
            channel: this.#channel,
            type: 'iframeSyncStateChange',
            sourceClientName: this.#clientName,
            payload: update
        }, '*');
    }

    /**
     * Dispatch an event to all other clients.
     * @param {string} eventName - The event name.
     * @param {Object} detail - The event detail.
     */
    dispatchEvent(eventName, detail) {
        const win = this.#getWin();
        if (!win) {
            return;
        }

        win.postMessage({
            channel: this.#channel,
            type: 'iframeSyncEvent',
            name: eventName,
            sourceClientName: this.#clientName,
            payload: detail
        }, '*');
    }

    /**
     * Add an event listener for a specific event.
     * @param {string} eventName - The event name.
     * @param {function} callback - The callback. It will be passed (detailObject, eventName, isOwnEvent).
     */
    addEventListener(eventName, callback) {
        const eventLc = eventName.toLowerCase();
        if (!this.#eventListeners[eventLc]) {
            this.#eventListeners[eventLc] = [];
        }
        this.#eventListeners[eventLc].push(callback);
    }

    /**
     * Remove an event listener for a specific event.
     * @param {string} eventName - The event name.
     * @param {function} callback - The callback previously registered.
     */
    removeEventListener(eventName, callback) {
        const eventLc = eventName.toLowerCase();
        if (!this.#eventListeners[eventLc]) {
            return;
        }
        this.#eventListeners[eventLc] = this.#eventListeners[eventLc].filter((cb) => cb !== callback);
    }
}

/**
 * Class representing an IframeSyncBroker.
 */
class IframeSyncBroker {
    #channel;
    #state;
    #clientWindows;
    #debugMode;

    /**
     * Create an IframeSyncBroker.
     */
    constructor() {
        this.#channel = 'IframeSync';
        this.#state = {};
        this.#clientWindows = new Set();
        this.#debugMode = false;

        if (!window) {
          return;
        }

        window.addEventListener('message', (event) => this.#handleMessage(event));
    }

    /**
     * Handle incoming messages.
     * @param {MessageEvent} event - The message event.
     * @private
     */
    #handleMessage(event) {
        const { data, source: clientWindow } = event;
        if (!data || data.channel !== this.#channel) {
            return;
        }

        if (data.type === 'iframeSyncReady') {
            this.#clientWindows.add(clientWindow);
            this.#sendReadyReceived(clientWindow);
        } else if (data.type === 'iframeSyncStateChange' && data.payload) {
            this.#updateState(data.payload, data.sourceClientName);
        } else if (data.type === 'iframeSyncEvent') {
            if (!data.broadcast) { // prevent infinite loop
                this.#broadcastEvent(data.name, data.payload, data.sourceClientName);
            }
        }
    }

    /**
     * Update the state with the provided update.
     * @param {Object} update - The state update.
     * @param {string} sourceClientName - The name of the client that sent the update.
     * @private
     */
    #updateState(update, sourceClientName) {
        const prevState = JSON.stringify(this.#state);
        Object.assign(this.#state, update);
        const newState = JSON.stringify(this.#state);

        if (prevState !== newState) {
            this.#debug();
            this.#broadcastState(sourceClientName);
        }
    }

    /**
     * Send the current state to a specific client iframe.
     * @param {Window} clientWindow - The client iframe to send the state to.
     * @param {string} sourceClientName - The name of the client that requested the state.
     * @private
     */
    #sendSyncState(clientWindow, sourceClientName) {
        if (clientWindow && typeof clientWindow.postMessage === 'function') {
            clientWindow.postMessage({
                channel: this.#channel,
                type: 'iframeSyncStateChange',
                sourceClientName: sourceClientName, // Pass through the source
                payload: this.#state,
            }, '*');
        }
    }

    /**
     * Send the current state to a specific client iframe.
     * @param {Window} clientWindow - The client iframe to send the state to.
     * @param {string} sourceClientName - The name of the client that requested the state.
     * @private
     */
    #sendReadyReceived(clientWindow) {
        if (clientWindow && typeof clientWindow.postMessage === 'function') {
            clientWindow.postMessage({
                channel: this.#channel,
                type: 'iframeSyncReadyReceived',
                payload: this.#state,
            }, '*');
        }
    }

    /**
     * Broadcast the current state to all client iframes.
     * @param {string} sourceClientName - The name of the client that sent the update.
     * @private
     */
    #broadcastState(sourceClientName) {
        this.#clientWindows.forEach((clientWindow) =>
            this.#sendSyncState(clientWindow, sourceClientName)
        );
    }

    /**
     * Broadcast an event to all client iframes.
     * @param {string} eventName - The event name.
     * @param {Object} detail - The event detail.
     * @param {string} sourceClientName - The name of the client that sent the event.
     * @private
     */
    #broadcastEvent(eventName, detail, sourceClientName) {
        this.#clientWindows.forEach((clientWindow) => {
            if (clientWindow && typeof clientWindow.postMessage === 'function') {
                clientWindow.postMessage({
                    channel: this.#channel,
                    type: 'iframeSyncEvent',
                    name: eventName,
                    sourceClientName,
                    payload: detail,
                    broadcast: true,
                }, '*');
            }
        });
    }

    /**
     * Log a debug message.
     * @private
     */
    #debug() {
        if (this.#debugMode === false) {
            return; // noop by default
        }

        const stateJson = JSON.stringify(this.#state, null, 2);
        if (this.#debugMode === true) {
            console.log('IframeSyncBroker state change', stateJson);
        } else if (typeof this.#debugMode === 'function') {
            this.#debugMode(stateJson);
        } else if (this.#debugMode instanceof HTMLElement) {
            this.#debugMode.innerText = stateJson;
        }
    }

    /**
     * Control debug behavior.
     * @param {boolean|Function|HTMLElement} mode - The debug mode.
     *   * false (default): no debug
     *   * true: console.log
     *   * function: call a provided function
     *   * HTML element: set the text of an element
     */
    setDebugMode(mode) {
        this.#debugMode = mode;
    }
}

// CommonJS export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IframeSyncClient, IframeSyncBroker };
}

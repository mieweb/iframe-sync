/**
 * Class representing an IframeSyncClient.
 */
class IframeSyncClient {
    #channel;
    #recv;
    #clientName;

    constructor(clientName, recv) {
        this.#recv = recv;
        this.#channel = 'IframeSync';
        this.#clientName = clientName || [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

        if (!window) {
            return;
        }

        window.addEventListener('message', (event) => {
            if (!event.data || event.data.channel !== this.#channel) {
                return;
            }

            const isOwnMessage = event.data.sourceClientName === this.#clientName;
            const isReadyReceived = event.data.type === 'readyReceived';

            if (['syncState', 'readyReceived'].includes(event.data.type) && typeof this.#recv === 'function') {
                this.#recv(event.data.payload, isOwnMessage, isReadyReceived);
            }
        });
    }

    ready() {
        if (!window || !window.parent) {
            return;
        }
        window.parent.postMessage({
            channel: this.#channel,
            type: 'ready',
            sourceClientName: this.#clientName
        }, '*');
    }

    // Sends state updates (used for bidirectional communication)
    stateChange(update) {
        if (!window || !window.parent) {
            return;
        }
        window.parent.postMessage({
            channel: this.#channel,
            type: 'stateChange',
            sourceClientName: this.#clientName,
            payload: update
        }, '*');
    }
}

/**
 * Class representing an IframeSyncBroker (Handles bidirectional communication).
 */
class IframeSyncBroker {
    #channel;
    #state;
    #clientIframes;

    constructor() {
        this.#channel = 'IframeSync';
        this.#state = {};
        this.#clientIframes = new Set();

        if (!window) {
            return;
        }
        window.addEventListener('message', (event) => this.#handleMessage(event));
    }

    stateChange(update) {
        this.#updateState(update, 'Broker');
    }

    #handleMessage(event) {
        const { data, source: clientIframe } = event;
        if (!data || data.channel !== this.#channel) {
            return;
        }

        if (data.type === 'ready') {
            this.#clientIframes.add(clientIframe);
            this.#sendReadyReceived(clientIframe);
        } else if (data.type === 'stateChange' && data.payload) {
            this.#updateState(data.payload, data.sourceClientName);
        }
    }

    #updateState(update, sourceClientName) {
        const prevState = JSON.stringify(this.#state);
        Object.assign(this.#state, update);
        const newState = JSON.stringify(this.#state);

        if (prevState !== newState) {
            console.log(`State updated from ${sourceClientName}:`, update);
            this.#broadcastState(sourceClientName);
        }
    }

    #sendSyncState(clientIframe, sourceClientName) {
        if (clientIframe && typeof clientIframe.postMessage === 'function') {
            clientIframe.postMessage({
                channel: this.#channel,
                type: 'syncState',
                sourceClientName: sourceClientName,
                payload: this.#state,
            }, '*');
        }
    }

    #sendReadyReceived(clientIframe) {
        if (clientIframe && typeof clientIframe.postMessage === 'function') {
            clientIframe.postMessage({
                channel: this.#channel,
                type: 'readyReceived',
                payload: this.#state,
            }, '*');
        }
    }

    #broadcastState(sourceClientName) {
        this.#clientIframes.forEach((clientIframe) => this.#sendSyncState(clientIframe, sourceClientName));
    }
}

// CommonJS export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IframeSyncClient, IframeSyncBroker };
}

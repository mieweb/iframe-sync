# iframe-sync

Simple state synchronization between related IFrames.

## Overview

`iframe-sync` is a lightweight JavaScript library with no dependencies that enables state synchronization between related IFrames. It allows you to easily share and update state across multiple windows, ensuring that all participants stay in sync.

## Installation

You can include `iframe-sync` in your project by downloading the source files or by using a package manager.

### Using npm

```sh
npm install iframe-sync
```

### Using yarn

```sh
yarn add iframe-sync
```

## Usage

**IframeSyncClient**

The IframeSyncClient class is used by browser windows or IFrames that want to participate in state synchronization.

### Example

```js
import { IframeSyncClient } from 'iframe-sync';

const client = new IframeSyncClient('client1', (state, isOwnMessage) => {
    console.log('Received state update:', state, 'Is own message:', isOwnMessage);
});

client.ready();

// Send a state update
client.stateChange({ key: 'value' });
```

**IframeSyncBroker**

The `IframeSyncBroker` class is used to manage state synchronization between multiple clients. It should be instantiated in the parent window that contains the IFrames.

### Example

```js
import { IframeSyncBroker } from 'iframe-sync';

const broker = new IframeSyncBroker();
```

## API

**IframeSyncClient**

* `new IframeSyncClient(clientName, recv)`
  * `clientName` (string, optional): A unique client name. If not provided, one will be generated randomly.
  * `recv` (function): A callback function to receive the full state when updates are sent.
  * `ready()`: Notify the broker that this client is ready to receive state updates.
  * `stateChange(update)`: Send a state update to the broker, which will broadcast it to all other clients.
    * `update` (Object): The state update to send.

**IframeSyncBroker**

* `new IframeSyncBroker()`: Create a new IframeSyncBroker instance.

## License
This project is licensed under the MIT License.


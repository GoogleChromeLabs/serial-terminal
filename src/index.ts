/**
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Terminal} from 'xterm';
import {FitAddon} from 'xterm-addon-fit';
import {WebLinksAddon} from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import {
  serial as polyfill, SerialPort as SerialPortPolyfill,
} from 'web-serial-polyfill';

/**
 * Elements of the port selection dropdown extend HTMLOptionElement so that
 * they can reference the SerialPort they represent.
 */
declare class PortOption extends HTMLOptionElement {
  port: SerialPort | SerialPortPolyfill;
}

let portSelector: HTMLSelectElement;
let connectButton: HTMLButtonElement;
let baudRateSelector: HTMLSelectElement;
let customBaudRateInput: HTMLInputElement;
let dataBitsSelector: HTMLSelectElement;
let paritySelector: HTMLSelectElement;
let stopBitsSelector: HTMLSelectElement;
let flowControlCheckbox: HTMLInputElement;
let echoCheckbox: HTMLInputElement;
let flushOnEnterCheckbox: HTMLInputElement;
let autoconnectCheckbox: HTMLInputElement;

let portCounter = 1;
let port: SerialPort | SerialPortPolyfill | undefined;
let reader: ReadableStreamDefaultReader | ReadableStreamBYOBReader | undefined;

const urlParams = new URLSearchParams(window.location.search);
const usePolyfill = urlParams.has('polyfill');
const bufferSize = 8 * 1024; // 8kB

const term = new Terminal({
  scrollback: 10_000,
});

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);

term.loadAddon(new WebLinksAddon());

const encoder = new TextEncoder();
let toFlush = '';
term.onData((data) => {
  if (echoCheckbox.checked) {
    term.write(data);
  }

  if (port?.writable == null) {
    console.warn(`unable to find writable port`);
    return;
  }

  const writer = port.writable.getWriter();

  if (flushOnEnterCheckbox.checked) {
    toFlush += data;
    if (data === '\r') {
      writer.write(encoder.encode(toFlush));
      writer.releaseLock();
      toFlush = '';
    }
  } else {
    writer.write(encoder.encode(data));
  }

  writer.releaseLock();
});

/**
 * Returns the option corresponding to the given SerialPort if one is present
 * in the selection dropdown.
 *
 * @param {SerialPort} port the port to find
 * @return {PortOption}
 */
function findPortOption(port: SerialPort | SerialPortPolyfill):
    PortOption | null {
  for (let i = 0; i < portSelector.options.length; ++i) {
    const option = portSelector.options[i];
    if (option.value === 'prompt') {
      continue;
    }
    const portOption = option as PortOption;
    if (portOption.port === port) {
      return portOption;
    }
  }

  return null;
}

/**
 * Adds the given port to the selection dropdown.
 *
 * @param {SerialPort} port the port to add
 * @return {PortOption}
 */
function addNewPort(port: SerialPort | SerialPortPolyfill): PortOption {
  const portOption = document.createElement('option') as PortOption;
  portOption.textContent = `Port ${portCounter++}`;
  portOption.port = port;
  portSelector.appendChild(portOption);
  return portOption;
}

/**
 * Adds the given port to the selection dropdown, or returns the existing
 * option if one already exists.
 *
 * @param {SerialPort} port the port to add
 * @return {PortOption}
 */
function maybeAddNewPort(port: SerialPort | SerialPortPolyfill): PortOption {
  const portOption = findPortOption(port);
  if (portOption) {
    return portOption;
  }

  return addNewPort(port);
}

/**
 * Download the terminal's contents to a file.
 */
function downloadTerminalContents(): void {
  if (!term) {
    throw new Error('no terminal instance found');
  }

  if (term.rows === 0) {
    console.log('No output yet');
    return;
  }

  term.selectAll();
  const contents = term.getSelection();
  term.clearSelection();
  const linkContent = URL.createObjectURL(
      new Blob([new TextEncoder().encode(contents).buffer],
          {type: 'text/plain'}));
  const fauxLink = document.createElement('a');
  fauxLink.download = `terminal_content_${new Date().getTime()}.txt`;
  fauxLink.href = linkContent;
  fauxLink.click();
}

/**
 * Clear the terminal's contents.
 */
function clearTerminalContents(): void {
  if (!term) {
    throw new Error('no terminal instance found');
  }

  if (term.rows === 0) {
    console.log('No output yet');
    return;
  }

  term.clear();
}

/**
 * Sets |port| to the currently selected port. If none is selected then the
 * user is prompted for one.
 */
async function getSelectedPort(): Promise<void> {
  if (portSelector.value == 'prompt') {
    try {
      const serial = usePolyfill ? polyfill : navigator.serial;
      port = await serial.requestPort({});
    } catch (e) {
      return;
    }
    const portOption = maybeAddNewPort(port);
    portOption.selected = true;
  } else {
    const selectedOption = portSelector.selectedOptions[0] as PortOption;
    port = selectedOption.port;
  }
}

/**
 * @return {number} the currently selected baud rate
 */
function getSelectedBaudRate(): number {
  if (baudRateSelector.value == 'custom') {
    return Number.parseInt(customBaudRateInput.value);
  }
  return Number.parseInt(baudRateSelector.value);
}

/**
 * Resets the UI back to the disconnected state.
 */
function markDisconnected(): void {
  term.writeln('<DISCONNECTED>');
  portSelector.disabled = false;
  connectButton.textContent = 'Connect';
  connectButton.disabled = false;
  baudRateSelector.disabled = false;
  customBaudRateInput.disabled = false;
  dataBitsSelector.disabled = false;
  paritySelector.disabled = false;
  stopBitsSelector.disabled = false;
  flowControlCheckbox.disabled = false;
  port = undefined;
}

/**
 * Initiates a connection to the selected port.
 */
async function connectToPort(): Promise<void> {
  await getSelectedPort();
  if (!port) {
    return;
  }

  const options = {
    baudRate: getSelectedBaudRate(),
    dataBits: Number.parseInt(dataBitsSelector.value),
    parity: paritySelector.value as ParityType,
    stopBits: Number.parseInt(stopBitsSelector.value),
    flowControl:
        flowControlCheckbox.checked ? <const> 'hardware' : <const> 'none',
    bufferSize,

    // Prior to Chrome 86 these names were used.
    baudrate: getSelectedBaudRate(),
    databits: Number.parseInt(dataBitsSelector.value),
    stopbits: Number.parseInt(stopBitsSelector.value),
    rtscts: flowControlCheckbox.checked,
  };
  console.log(options);

  portSelector.disabled = true;
  connectButton.textContent = 'Connecting...';
  connectButton.disabled = true;
  baudRateSelector.disabled = true;
  customBaudRateInput.disabled = true;
  dataBitsSelector.disabled = true;
  paritySelector.disabled = true;
  stopBitsSelector.disabled = true;
  flowControlCheckbox.disabled = true;

  try {
    await port.open(options);
    term.writeln('<CONNECTED>');
    connectButton.textContent = 'Disconnect';
    connectButton.disabled = false;
  } catch (e) {
    console.error(e);
    if (e instanceof Error) {
      term.writeln(`<ERROR: ${e.message}>`);
    }
    markDisconnected();
    return;
  }

  while (port && port.readable) {
    try {
      try {
        reader = port.readable.getReader({mode: 'byob'});
      } catch {
        reader = port.readable.getReader();
      }

      let buffer = null;
      for (;;) {
        const {value, done} = await (async () => {
          if (reader instanceof ReadableStreamBYOBReader) {
            if (!buffer) {
              buffer = new ArrayBuffer(bufferSize);
            }
            const {value, done} =
                await reader.read(new Uint8Array(buffer, 0, bufferSize));
            buffer = value?.buffer;
            return {value, done};
          } else {
            return await reader.read();
          }
        })();

        if (value) {
          await new Promise<void>((resolve) => {
            term.write(value, resolve);
          });
        }
        if (done) {
          break;
        }
      }
    } catch (e) {
      console.error(e);
      await new Promise<void>((resolve) => {
        if (e instanceof Error) {
          term.writeln(`<ERROR: ${e.message}>`, resolve);
        }
      });
    } finally {
      if (reader) {
        reader.releaseLock();
        reader = undefined;
      }
    }
  }

  if (port) {
    try {
      await port.close();
    } catch (e) {
      console.error(e);
      if (e instanceof Error) {
        term.writeln(`<ERROR: ${e.message}>`);
      }
    }

    markDisconnected();
  }
}

/**
 * Closes the currently active connection.
 */
async function disconnectFromPort(): Promise<void> {
  // Move |port| into a local variable so that connectToPort() doesn't try to
  // close it on exit.
  const localPort = port;
  port = undefined;

  if (reader) {
    await reader.cancel();
  }

  if (localPort) {
    try {
      await localPort.close();
    } catch (e) {
      console.error(e);
      if (e instanceof Error) {
        term.writeln(`<ERROR: ${e.message}>`);
      }
    }
  }

  markDisconnected();
}

document.addEventListener('DOMContentLoaded', async () => {
  const terminalElement = document.getElementById('terminal');
  if (terminalElement) {
    term.open(terminalElement);
    fitAddon.fit();

    window.addEventListener('resize', () => {
      fitAddon.fit();
    });
  }

  const downloadOutput =
    document.getElementById('download') as HTMLSelectElement;
  downloadOutput.addEventListener('click', downloadTerminalContents);

  const clearOutput = document.getElementById('clear') as HTMLSelectElement;
  clearOutput.addEventListener('click', clearTerminalContents);

  portSelector = document.getElementById('ports') as HTMLSelectElement;

  connectButton = document.getElementById('connect') as HTMLButtonElement;
  connectButton.addEventListener('click', () => {
    if (port) {
      disconnectFromPort();
    } else {
      connectToPort();
    }
  });

  baudRateSelector = document.getElementById('baudrate') as HTMLSelectElement;
  baudRateSelector.addEventListener('input', () => {
    if (baudRateSelector.value == 'custom') {
      customBaudRateInput.hidden = false;
    } else {
      customBaudRateInput.hidden = true;
    }
  });

  customBaudRateInput =
      document.getElementById('custom_baudrate') as HTMLInputElement;
  dataBitsSelector = document.getElementById('databits') as HTMLSelectElement;
  paritySelector = document.getElementById('parity') as HTMLSelectElement;
  stopBitsSelector = document.getElementById('stopbits') as HTMLSelectElement;
  flowControlCheckbox = document.getElementById('rtscts') as HTMLInputElement;
  echoCheckbox = document.getElementById('echo') as HTMLInputElement;
  flushOnEnterCheckbox =
      document.getElementById('enter_flush') as HTMLInputElement;
  autoconnectCheckbox =
      document.getElementById('autoconnect') as HTMLInputElement;

  const convertEolCheckbox =
      document.getElementById('convert_eol') as HTMLInputElement;
  const convertEolCheckboxHandler = () => {
    term.options.convertEol = convertEolCheckbox.checked;
  };
  convertEolCheckbox.addEventListener('change', convertEolCheckboxHandler);
  convertEolCheckboxHandler();

  const polyfillSwitcher =
      document.getElementById('polyfill_switcher') as HTMLAnchorElement;
  if (usePolyfill) {
    polyfillSwitcher.href = './';
    polyfillSwitcher.textContent = 'Switch to native API';
  } else {
    polyfillSwitcher.href = './?polyfill';
    polyfillSwitcher.textContent = 'Switch to API polyfill';
  }

  const serial = usePolyfill ? polyfill : navigator.serial;
  const ports: (SerialPort | SerialPortPolyfill)[] = await serial.getPorts();
  ports.forEach((port) => addNewPort(port));

  // These events are not supported by the polyfill.
  // https://github.com/google/web-serial-polyfill/issues/20
  if (!usePolyfill) {
    navigator.serial.addEventListener('connect', (event) => {
      const portOption = addNewPort(event.target as SerialPort);
      if (autoconnectCheckbox.checked) {
        portOption.selected = true;
        connectToPort();
      }
    });
    navigator.serial.addEventListener('disconnect', (event) => {
      const portOption = findPortOption(event.target as SerialPort);
      if (portOption) {
        portOption.remove();
      }
    });
  }
});

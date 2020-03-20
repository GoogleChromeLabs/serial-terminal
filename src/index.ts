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

import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';

declare class PortOption extends HTMLOptionElement {
  port: SerialPort;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration =
          await navigator.serviceWorker.register('service-worker.js',
                                                 { scope: '.' });
      console.log('SW registered: ', registration);
    } catch (registrationError) {
      console.log('SW registration failed: ', registrationError);
    }
  });
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

let portCounter = 1;
let port: SerialPort | undefined;
let reader: ReadableStreamDefaultReader | undefined;

const term = new Terminal();
const encoder = new TextEncoder();
term.onData(data => {
  const bytes = encoder.encode(data);
  if (echoCheckbox.checked) {
    term.writeUtf8(bytes);
  }
  if (port && port.writable) {
    const writer = port.writable.getWriter();
    writer.write(bytes);
    writer.releaseLock();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  term.open(document.getElementById('terminal')!);

  portSelector = <HTMLSelectElement>document.getElementById('ports');

  connectButton = <HTMLButtonElement>document.getElementById('connect');
  connectButton.addEventListener('click', () => {
    if (port) {
      disconnectFromPort();
    } else {
      connectToPort();
    }
  });

  baudRateSelector = <HTMLSelectElement>document.getElementById('baudrate');
  baudRateSelector.addEventListener('input', () => {
    if (baudRateSelector.value == 'custom') {
      customBaudRateInput.hidden = false;
    } else {
      customBaudRateInput.hidden = true;
    }
  });

  customBaudRateInput =
      <HTMLInputElement>document.getElementById('custom_baudrate');
  dataBitsSelector = <HTMLSelectElement>document.getElementById('databits');
  paritySelector = <HTMLSelectElement>document.getElementById('parity');
  stopBitsSelector = <HTMLSelectElement>document.getElementById('stopbits');
  flowControlCheckbox = <HTMLInputElement>document.getElementById('rtscts');
  echoCheckbox = <HTMLInputElement>document.getElementById('echo');

  const ports = await navigator.serial.getPorts();
  ports.forEach(port => { addNewPort(port); });

  navigator.serial.addEventListener('connect', event => {
    addNewPort(event.port);
  });
  navigator.serial.addEventListener('disconnect', event => {
    const portOption = findPortOption(event.port);
    if (portOption) {
      portOption.remove();
    }
  });
});

function findPortOption(port: SerialPort): PortOption | null {
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

function maybeAddNewPort(port: SerialPort): PortOption {
  const portOption = findPortOption(port);
  if (portOption)
    return portOption;

  return addNewPort(port);
}

function addNewPort(port:SerialPort): PortOption {
  const portOption = document.createElement('option') as PortOption;
  portOption.textContent = `Port ${portCounter++}`;
  portOption.port = port;
  portSelector.appendChild(portOption);
  return portOption;
}

async function getSelectedPort(): Promise<void> {
  if (portSelector.value == 'prompt') {
    try {
      port = await navigator.serial.requestPort({});
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

async function connectToPort() {
  await getSelectedPort();
  if (!port) {
    return;
  }

  const options = {
    baudrate: getSelectedBaudRate(),
    databits: Number.parseInt(dataBitsSelector.value),
    parity: <ParityType>paritySelector.value,
    stopbits: Number.parseInt(stopBitsSelector.value),
    rtscts: flowControlCheckbox.checked
  };
  console.log(options);
  await port.open(options);

  portSelector.disabled = true;
  connectButton.textContent = 'Disconnect';
  baudRateSelector.disabled = true;
  customBaudRateInput.disabled = true;
  dataBitsSelector.disabled = true;
  paritySelector.disabled = true;
  stopBitsSelector.disabled = true;
  flowControlCheckbox.disabled = true;
  term.writeln('<CONNECTED>');

  while (port.readable) {
    try {
      reader = port.readable.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          term.writeUtf8(value);
        }
        if (done) {
          break;
        }
      }
      reader = undefined;
    } catch (e) {
      console.error(e);
      term.writeln(`<ERROR: ${e.message}>`);
    }
  }

  term.writeln('<DISCONNECTED>');
  portSelector.disabled = false;
  connectButton.textContent = 'Connect';
  baudRateSelector.disabled = false;
  customBaudRateInput.disabled = false;
  dataBitsSelector.disabled = false;
  paritySelector.disabled = false;
  stopBitsSelector.disabled = false;
  flowControlCheckbox.disabled = false;
  port = undefined;
}

async function disconnectFromPort() {
  if (reader) {
    reader.cancel();
  }
  if (port) {
    await port.close();
  }
  // The rest of the disconnection happens as connectToPort() finishes.
}

function getSelectedBaudRate() {
  if (baudRateSelector.value == 'custom') {
    return Number.parseInt(customBaudRateInput.value);
  }
  return Number.parseInt(baudRateSelector.value);
}

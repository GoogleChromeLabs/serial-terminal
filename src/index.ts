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
import 'xterm/dist/xterm.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration =
          await navigator.serviceWorker.register('/service-worker.js');
      console.log('SW registered: ', registration);
    } catch (registrationError) {
      console.log('SW registration failed: ', registrationError);
    }
  });
}

let connectButton: HTMLButtonElement;
let baudRateSelector: HTMLSelectElement;
let customBaudRateInput: HTMLInputElement;
let dataBitsSelector: HTMLSelectElement;
let paritySelector: HTMLSelectElement;
let stopBitsSelector: HTMLSelectElement;
let flowControlCheckbox: HTMLInputElement;
let echoCheckbox: HTMLInputElement;
let port: SerialPort | undefined;
let reader: ReadableStreamDefaultReader | undefined;

const term = new Terminal();
const encoder = new TextEncoder();
term.on('data', data => {
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

document.addEventListener('DOMContentLoaded', () => {
  term.open(document.getElementById('terminal')!);

  connectButton = <HTMLButtonElement>document.getElementById('connect');
  connectButton.addEventListener('click', async () => {
    if (port) {
      if (reader)
        reader.cancel();
      await port.close();
    } else {
      requestNewPort();
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
});

async function requestNewPort() {
  port = await navigator.serial.requestPort({});
  connectToPort();
}

async function connectToPort() {
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
        term.writeUtf8(value);
        if (done) {
          break;
        }
      }
      reader = undefined;
    } catch (e) {
      term.writeln(`<ERROR: ${e.message}>`);
    }
  }

  term.writeln('<DISCONNECTED>');
  connectButton.textContent = 'Connect';
  baudRateSelector.disabled = false;
  customBaudRateInput.disabled = false;
  dataBitsSelector.disabled = false;
  paritySelector.disabled = false;
  stopBitsSelector.disabled = false;
  flowControlCheckbox.disabled = false;
  port = undefined;
}

function getSelectedBaudRate() {
  if (baudRateSelector.value == 'custom') {
    return Number.parseInt(customBaudRateInput.value);
  }
  return Number.parseInt(baudRateSelector.value);
}

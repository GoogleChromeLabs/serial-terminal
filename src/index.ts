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
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('SW registered: ', registration);
    } catch (registrationError) {
      console.log('SW registration failed: ', registrationError);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const connectButton = document.getElementById("connect");

  const term = new Terminal();
  term.open(document.getElementById("terminal"));

  connectButton.addEventListener("click", async () => {
    const port = await navigator.serial.requestPort({});
    await port.open({ baudrate: 9600 });

    const encoder = new TextEncoder();
    term.on('data', data => {
      const writer = port.writable.getWriter();
      writer.write(encoder.encode(data));
      writer.releaseLock();
    });

    const reader = port.readable.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      term.writeUtf8(value);
      if (done) {
        break;
      }
    }
  });
});

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

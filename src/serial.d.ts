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

type ParityType = "none" | "even" | "odd";

interface SerialOptions {
  baudrate: number;
  databits?: number;
  stopbits?: number;
  parity?: ParityType;
  buffersize?: number;
  rtscts?: boolean;
}

declare class SerialPort {
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream<Uint8Array>;

  open(options?: SerialOptions): Promise<void>;
  close(): void;
}

interface SerialPortRequestOptions {
}

declare class Serial extends EventTarget {
  onconnect(): (this: this, ev: Event) => any;
  ondisconnect(): (this: this, ev: Event) => any;
  getPorts(): Promise<SerialPort[]>;
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  addEventListener(type: "connect" | "disconnect", listener: (this: this, ev: Event) => any, useCapture?: boolean): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
}

interface Navigator {
  readonly serial: Serial;
}

interface WorkerNavigator {
  readonly serial: Serial;
}

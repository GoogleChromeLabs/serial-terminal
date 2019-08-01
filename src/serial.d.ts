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

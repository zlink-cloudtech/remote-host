export interface Device {
  id: string;
  name: string;
  host: string;
  port?: number;
  username: string;
  password?: string;
  keyFile?: string;
}

export interface DeviceStore {
  devices: Device[];
}

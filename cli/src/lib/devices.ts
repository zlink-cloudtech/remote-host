import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import yaml from "js-yaml";
import type { Device, DeviceStore } from "../types/device.js";

/** Computed lazily so tests can override via REMOTE_SSH_DEVICES_DIR env var. */
function devicesDir(): string {
  return process.env["REMOTE_SSH_DEVICES_DIR"] ?? join(homedir(), ".remote-ssh");
}

function devicesPath(): string {
  return join(devicesDir(), "devices.yaml");
}

function generateId(): string {
  return createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0, 8);
}

export function maskPassword(_password: string): string {
  return "********";
}

export function readDevices(): Device[] {
  if (!existsSync(devicesPath())) return [];
  try {
    const raw = yaml.load(readFileSync(devicesPath(), "utf8")) as DeviceStore | null;
    return raw?.devices ?? [];
  } catch {
    return [];
  }
}

function writeDevices(devices: Device[]): void {
  if (!existsSync(devicesDir())) {
    mkdirSync(devicesDir(), { recursive: true });
  }
  const store: DeviceStore = { devices };
  writeFileSync(devicesPath(), yaml.dump(store), { mode: 0o600 });
}

export function addDevice(device: Omit<Device, "id">): Device {
  const devices = readDevices();
  const newDevice: Device = { id: generateId(), ...device };
  devices.push(newDevice);
  writeDevices(devices);
  return newDevice;
}

export function removeDevice(idOrName: string): boolean {
  const devices = readDevices();
  const idx = devices.findIndex((d) => d.id === idOrName || d.name === idOrName);
  if (idx === -1) return false;
  devices.splice(idx, 1);
  writeDevices(devices);
  return true;
}

export function updateDevice(idOrName: string, patch: Partial<Omit<Device, "id">>): Device | null {
  const devices = readDevices();
  const idx = devices.findIndex((d) => d.id === idOrName || d.name === idOrName);
  if (idx === -1) return null;
  devices[idx] = { ...devices[idx], ...patch };
  writeDevices(devices);
  return devices[idx];
}

export function findDevice(idOrName: string): Device | null {
  const devices = readDevices();
  return devices.find((d) => d.id === idOrName || d.name === idOrName) ?? null;
}

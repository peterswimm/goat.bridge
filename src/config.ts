import * as fs from "fs";
import * as yaml from "js-yaml";

export interface BridgeConfig {
  homeserver: {
    url: string;
    domain: string;
  };
  goat: {
    baseUrl: string;
    username: string;
    password: string;
    headless: boolean;
    storageStatePath: string;
  };
  rooms: {
    defaultMatrixRoom?: string;
    roomMap: Array<{ matrixRoomId: string; goatChannel: string }>;
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
  };
}

export function loadConfig(path: string): BridgeConfig {
  const raw = fs.readFileSync(path, "utf-8");
  return yaml.load(raw) as BridgeConfig;
}

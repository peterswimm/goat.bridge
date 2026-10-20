import { BridgeConfig } from "./config";

export interface RoomMapping {
  matrixRoomId: string;
  goatChannel: string;
}

export function sanitize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

export function ghostMxid(sender: string, domain: string): string {
  return `@goat_${sanitize(sender)}:${domain}`;
}

export function findRoomMapping(
  config: BridgeConfig,
  matrixRoomId: string,
): RoomMapping | undefined {
  return config.rooms.roomMap.find((m) => m.matrixRoomId === matrixRoomId);
}

export function findChannelMapping(
  config: BridgeConfig,
  goatChannel: string,
): RoomMapping | undefined {
  return config.rooms.roomMap.find((m) => m.goatChannel === goatChannel);
}

export interface MatrixEvent {
  type?: string;
  sender?: string;
  room_id?: string;
  content?: { body?: string } | undefined;
}

export interface ForwardDecision {
  forward: boolean;
  reason?: string;
  mapping?: RoomMapping;
  body?: string;
  sender?: string;
}

export function decideMatrixForward(
  event: MatrixEvent,
  config: BridgeConfig,
): ForwardDecision {
  if (event.type !== "m.room.message") {
    return { forward: false, reason: "not-a-message" };
  }
  if (!event.content) {
    return { forward: false, reason: "no-content" };
  }
  if (event.sender?.startsWith("@goat_")) {
    return { forward: false, reason: "ghost-echo" };
  }
  if (!event.room_id) {
    return { forward: false, reason: "no-room" };
  }
  const mapping = findRoomMapping(config, event.room_id);
  if (!mapping) {
    return { forward: false, reason: "no-mapping" };
  }
  return {
    forward: true,
    mapping,
    body: event.content.body ?? "",
    sender: event.sender ?? "unknown",
  };
}

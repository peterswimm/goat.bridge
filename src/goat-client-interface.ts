import { EventEmitter } from "events";

export interface GoatMessage {
  sender: string;
  body: string;
  timestamp?: number;
}

export interface GoatClientLike extends EventEmitter {
  start(): Promise<void>;
  stop(): Promise<void>;
  sendMessage(channel: string, msg: GoatMessage): Promise<void>;
}

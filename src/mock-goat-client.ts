import { EventEmitter } from "events";
import { GoatClientLike, GoatMessage } from "./goat-client-interface";

export interface SentMessage {
  channel: string;
  msg: GoatMessage;
}

/**
 * In-memory GoatClient for tests and local dry-runs.
 * - sent: everything that was pushed via sendMessage
 * - emitIncoming: fake a message coming FROM goat.computer
 */
export class MockGoatClient extends EventEmitter implements GoatClientLike {
  readonly sent: SentMessage[] = [];
  started = false;
  stopped = false;

  async start(): Promise<void> {
    this.started = true;
  }

  async stop(): Promise<void> {
    this.stopped = true;
  }

  async sendMessage(channel: string, msg: GoatMessage): Promise<void> {
    this.sent.push({ channel, msg });
  }

  emitIncoming(channel: string, msg: GoatMessage): void {
    this.emit("message", channel, msg);
  }
}

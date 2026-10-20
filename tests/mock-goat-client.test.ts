import { describe, expect, it, vi } from "vitest";
import { MockGoatClient } from "../src/mock-goat-client";

describe("MockGoatClient", () => {
  it("records sent messages and tracks lifecycle", async () => {
    const c = new MockGoatClient();
    await c.start();
    await c.sendMessage("general", { sender: "@alice:x", body: "hi" });
    await c.stop();
    expect(c.started).toBe(true);
    expect(c.stopped).toBe(true);
    expect(c.sent).toEqual([
      { channel: "general", msg: { sender: "@alice:x", body: "hi" } },
    ]);
  });

  it("emits incoming messages on the 'message' channel", () => {
    const c = new MockGoatClient();
    const handler = vi.fn();
    c.on("message", handler);
    c.emitIncoming("random", { sender: "Bob", body: "yo" });
    expect(handler).toHaveBeenCalledWith("random", { sender: "Bob", body: "yo" });
  });
});

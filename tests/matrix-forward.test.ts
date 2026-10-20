import { describe, expect, it } from "vitest";
import { BridgeConfig } from "../src/config";
import { MockGoatClient } from "../src/mock-goat-client";
import { decideMatrixForward } from "../src/routing";

/**
 * Integration-ish test of the Matrix → goat half, exercised through the pure
 * routing decision + the mock client. Does not pull in matrix-appservice-bridge.
 */
describe("Matrix → goat forwarding", () => {
  const config: BridgeConfig = {
    homeserver: { url: "http://hs", domain: "example.org" },
    goat: {
      baseUrl: "https://goat.computer",
      username: "u",
      password: "p",
      headless: true,
      storageStatePath: "./s",
    },
    rooms: {
      roomMap: [{ matrixRoomId: "!room1:example.org", goatChannel: "general" }],
    },
    logging: { level: "info" },
  };

  it("mapped user message lands on goat with sender + body", async () => {
    const goat = new MockGoatClient();
    const d = decideMatrixForward(
      {
        type: "m.room.message",
        sender: "@alice:example.org",
        room_id: "!room1:example.org",
        content: { body: "hello goats" },
      },
      config,
    );
    expect(d.forward).toBe(true);
    await goat.sendMessage(d.mapping!.goatChannel, {
      sender: d.sender!,
      body: d.body!,
    });
    expect(goat.sent).toEqual([
      {
        channel: "general",
        msg: { sender: "@alice:example.org", body: "hello goats" },
      },
    ]);
  });

  it("ghost echo is swallowed, nothing hits goat", async () => {
    const goat = new MockGoatClient();
    const d = decideMatrixForward(
      {
        type: "m.room.message",
        sender: "@goat_alice:example.org",
        room_id: "!room1:example.org",
        content: { body: "echo" },
      },
      config,
    );
    expect(d.forward).toBe(false);
    expect(goat.sent).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { BridgeConfig } from "../src/config";
import {
  decideMatrixForward,
  findChannelMapping,
  findRoomMapping,
  ghostMxid,
  sanitize,
} from "../src/routing";

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
    roomMap: [
      { matrixRoomId: "!room1:example.org", goatChannel: "general" },
      { matrixRoomId: "!room2:example.org", goatChannel: "random" },
    ],
  },
  logging: { level: "info" },
};

describe("sanitize", () => {
  it("lowercases and replaces unsafe chars with underscores", () => {
    expect(sanitize("Alice Smith")).toBe("alice_smith");
    expect(sanitize("bob@goat.computer")).toBe("bob_goat_computer");
  });
  it("keeps allowed chars", () => {
    expect(sanitize("foo-bar_42")).toBe("foo-bar_42");
  });
});

describe("ghostMxid", () => {
  it("builds a goat_* localpart on the given domain", () => {
    expect(ghostMxid("Alice", "example.org")).toBe("@goat_alice:example.org");
  });
});

describe("findRoomMapping / findChannelMapping", () => {
  it("finds by matrix room id", () => {
    expect(findRoomMapping(config, "!room1:example.org")?.goatChannel).toBe("general");
  });
  it("finds by goat channel", () => {
    expect(findChannelMapping(config, "random")?.matrixRoomId).toBe(
      "!room2:example.org",
    );
  });
  it("returns undefined for unknown ids", () => {
    expect(findRoomMapping(config, "!nope:example.org")).toBeUndefined();
    expect(findChannelMapping(config, "nope")).toBeUndefined();
  });
});

describe("decideMatrixForward", () => {
  it("forwards a mapped text message", () => {
    const d = decideMatrixForward(
      {
        type: "m.room.message",
        sender: "@alice:example.org",
        room_id: "!room1:example.org",
        content: { body: "hello" },
      },
      config,
    );
    expect(d).toMatchObject({
      forward: true,
      mapping: { goatChannel: "general" },
      body: "hello",
      sender: "@alice:example.org",
    });
  });

  it("skips non-message events", () => {
    expect(
      decideMatrixForward(
        { type: "m.room.member", room_id: "!room1:example.org", content: {} },
        config,
      ),
    ).toEqual({ forward: false, reason: "not-a-message" });
  });

  it("skips messages from ghost users to avoid echo loops", () => {
    expect(
      decideMatrixForward(
        {
          type: "m.room.message",
          sender: "@goat_bob:example.org",
          room_id: "!room1:example.org",
          content: { body: "echo?" },
        },
        config,
      ),
    ).toEqual({ forward: false, reason: "ghost-echo" });
  });

  it("skips rooms with no mapping", () => {
    expect(
      decideMatrixForward(
        {
          type: "m.room.message",
          sender: "@alice:example.org",
          room_id: "!unmapped:example.org",
          content: { body: "hi" },
        },
        config,
      ),
    ).toEqual({ forward: false, reason: "no-mapping" });
  });

  it("treats missing body as empty string", () => {
    const d = decideMatrixForward(
      {
        type: "m.room.message",
        sender: "@alice:example.org",
        room_id: "!room1:example.org",
        content: {},
      },
      config,
    );
    expect(d.forward).toBe(true);
    expect(d.body).toBe("");
  });
});

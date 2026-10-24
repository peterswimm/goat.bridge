import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

const tmp: string[] = [];
afterEach(() => {
  for (const p of tmp.splice(0)) fs.rmSync(p, { force: true });
});

function writeTmp(contents: string): string {
  const p = path.join(os.tmpdir(), `goat-bridge-cfg-${Date.now()}-${Math.random()}.yaml`);
  fs.writeFileSync(p, contents);
  tmp.push(p);
  return p;
}

describe("loadConfig", () => {
  it("parses a complete yaml file", () => {
    const p = writeTmp(`
homeserver:
  url: http://hs
  domain: example.org
goat:
  baseUrl: https://goat.computer
  username: u
  password: p
  headless: true
  storageStatePath: ./s
rooms:
  roomMap:
    - matrixRoomId: "!room1:example.org"
      goatChannel: general
logging:
  level: debug
`);
    const cfg = loadConfig(p);
    expect(cfg.homeserver.domain).toBe("example.org");
    expect(cfg.rooms.roomMap[0]).toEqual({
      matrixRoomId: "!room1:example.org",
      goatChannel: "general",
    });
    expect(cfg.logging.level).toBe("debug");
  });
});

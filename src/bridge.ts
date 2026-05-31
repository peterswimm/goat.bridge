import { Bridge } from "matrix-appservice-bridge";
import { BridgeConfig } from "./config";
import { GoatClient, GoatMessage } from "./goat-client";
import { logger } from "./logger";

export async function runBridge(port: number, config: BridgeConfig): Promise<void> {
  const goat = new GoatClient(config.goat);

  const bridge = new Bridge({
    homeserverUrl: config.homeserver.url,
    domain: config.homeserver.domain,
    registration: "config/registration.yaml",
    controller: {
      onUserQuery(queriedUser) {
        return {};
      },
      async onEvent(request) {
        const event = request.getData();
        if (event.type !== "m.room.message" || !event.content) return;
        if (event.sender?.startsWith("@goat_")) return;

        const mapping = config.rooms.roomMap.find(
          (m) => m.matrixRoomId === event.room_id,
        );
        if (!mapping) {
          logger.debug("No mapping for room", { room: event.room_id });
          return;
        }

        const body = (event.content as { body?: string }).body ?? "";
        logger.info("Matrix → goat", {
          room: event.room_id,
          channel: mapping.goatChannel,
          sender: event.sender,
        });

        try {
          await goat.sendMessage(mapping.goatChannel, {
            sender: event.sender ?? "unknown",
            body,
          });
        } catch (err) {
          logger.error("Failed forwarding Matrix → goat", { err });
        }
      },
    },
  });

  await bridge.initialise();
  await bridge.listen(port);
  logger.info(`Matrix appservice listening on :${port}`);

  await goat.start();
  goat.on("message", async (channel: string, msg: GoatMessage) => {
    const mapping = config.rooms.roomMap.find((m) => m.goatChannel === channel);
    if (!mapping) {
      logger.debug("No Matrix mapping for goat channel", { channel });
      return;
    }

    const ghostMxid = `@goat_${sanitize(msg.sender)}:${config.homeserver.domain}`;
    const intent = bridge.getIntent(ghostMxid);
    await intent.setDisplayName(msg.sender);
    await intent.join(mapping.matrixRoomId);
    await intent.sendText(mapping.matrixRoomId, msg.body);
  });

  const shutdown = async () => {
    logger.info("Shutting down");
    await goat.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function sanitize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

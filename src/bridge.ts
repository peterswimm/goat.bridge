import { Bridge } from "matrix-appservice-bridge";
import { BridgeConfig } from "./config";
import { GoatClient } from "./goat-client";
import { GoatClientLike, GoatMessage } from "./goat-client-interface";
import { decideMatrixForward, findChannelMapping, ghostMxid } from "./routing";
import { logger } from "./logger";

export interface RunBridgeDeps {
  goatFactory?: (config: BridgeConfig) => GoatClientLike;
}

export async function runBridge(
  port: number,
  config: BridgeConfig,
  deps: RunBridgeDeps = {},
): Promise<void> {
  const goat =
    deps.goatFactory?.(config) ?? (new GoatClient(config.goat) as GoatClientLike);

  const bridge = new Bridge({
    homeserverUrl: config.homeserver.url,
    domain: config.homeserver.domain,
    registration: "config/registration.yaml",
    controller: {
      onUserQuery() {
        return {};
      },
      async onEvent(request) {
        const decision = decideMatrixForward(request.getData(), config);
        if (!decision.forward) {
          logger.debug("Not forwarding Matrix event", { reason: decision.reason });
          return;
        }
        logger.info("Matrix → goat", {
          room: decision.mapping!.matrixRoomId,
          channel: decision.mapping!.goatChannel,
          sender: decision.sender,
        });
        try {
          await goat.sendMessage(decision.mapping!.goatChannel, {
            sender: decision.sender!,
            body: decision.body!,
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
    const mapping = findChannelMapping(config, channel);
    if (!mapping) {
      logger.debug("No Matrix mapping for goat channel", { channel });
      return;
    }
    const intent = bridge.getIntent(ghostMxid(msg.sender, config.homeserver.domain));
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

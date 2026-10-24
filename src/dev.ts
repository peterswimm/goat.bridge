/**
 * Dev entrypoint: runs the bridge against a MockGoatClient so you can
 * watch Matrix → goat traffic in stdout without the Playwright side.
 * Boot Synapse + Element via docker/docker-compose.yml and run:
 *
 *     npm run dev:mock
 */
import { Cli, AppServiceRegistration } from "matrix-appservice-bridge";
import { runBridge } from "./bridge";
import { loadConfig } from "./config";
import { MockGoatClient } from "./mock-goat-client";
import { logger } from "./logger";

const mock = new MockGoatClient();

mock.on("message", (channel, msg) => {
  logger.info("[mock] goat → matrix", { channel, sender: msg.sender, body: msg.body });
});

// Patch sendMessage so we see every outbound call live.
const origSend = mock.sendMessage.bind(mock);
mock.sendMessage = async (channel, msg) => {
  logger.info("[mock] matrix → goat", { channel, sender: msg.sender, body: msg.body });
  await origSend(channel, msg);
};

new Cli({
  registrationPath: "config/registration.yaml",
  generateRegistration(reg, callback) {
    reg.setId(AppServiceRegistration.generateToken());
    reg.setHomeserverToken(AppServiceRegistration.generateToken());
    reg.setAppServiceToken(AppServiceRegistration.generateToken());
    reg.setSenderLocalpart("goatbot");
    reg.addRegexPattern("users", "@goat_.*", true);
    reg.addRegexPattern("aliases", "#goat_.*", true);
    callback(reg);
  },
  bridgeConfig: {
    schema: "config/config.schema.yaml",
    affectsRegistration: true,
    defaults: {},
  },
  run(port) {
    if (port === null) {
      // eslint-disable-next-line no-console
      console.error("Port is required (pass -p <port>)");
      process.exit(1);
    }
    const config = loadConfig("config/config.yaml");
    logger.info("Starting dev bridge with MockGoatClient");
    runBridge(port, config, { goatFactory: () => mock }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Dev bridge failed to start:", err);
      process.exit(1);
    });
  },
}).run();

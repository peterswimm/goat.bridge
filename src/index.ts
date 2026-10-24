import { Cli, AppServiceRegistration } from "matrix-appservice-bridge";
import { runBridge } from "./bridge";
import { loadConfig } from "./config";

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
    runBridge(port, config).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Bridge failed to start:", err);
      process.exit(1);
    });
  },
}).run();

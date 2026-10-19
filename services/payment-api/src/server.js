import { application } from "./application.js";
import { config } from "./config.js";
import { log } from "./utils.js";

application.listen(config.port, () => {
  log("info", "startup", { port: config.port });
});

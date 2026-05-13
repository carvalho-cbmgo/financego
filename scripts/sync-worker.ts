import { runScheduledSync } from "./sync-core";

runScheduledSync()
  .then((result) => {
    console.log("SYNC RESULT:", JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error("SYNC ERROR:", error);
    process.exit(1);
  });

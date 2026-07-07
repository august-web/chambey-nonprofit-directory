import { runIngest } from "./pipeline/runner.js";
import { runLoadSubset } from "./pipeline/load-subset.js";
import { runClear } from "./pipeline/clear.js";
import { startServer } from "./api/routes.js";
import { DEFAULT_STATES } from "./config.js";

function parseArgs(): { command: string; states: string[] } {
  const args = process.argv.slice(2);
  const command = args[0] ?? "serve";

  let states = DEFAULT_STATES;
  for (const arg of args) {
    if (arg.startsWith("--states=")) {
      states = arg.split("=")[1].split(",");
      break;
    }
    const idx = args.indexOf("--states");
    if (idx >= 0 && args[idx + 1]) {
      states = args[idx + 1].split(",");
      break;
    }
  }

  return { command, states };
}

async function main(): Promise<void> {
  const { command, states } = parseArgs();

  switch (command) {
    case "ingest":
      await runIngest(states);
      break;
    case "load-subset":
      await runLoadSubset();
      break;
    case "clear":
      await runClear();
      break;
    case "serve":
      await startServer();
      break;
    default:
      console.log(`
Usage:
  npm run ingest [-- --states=DE,VT]   Run the ingestion pipeline
  npm run ingest -- --states=ALL       Ingest all states
  npm run load-subset                  Load data/export/ca-subset.json.gz into MongoDB
  npm run clear                        Drop organizations + raw_bmf_records collections
  npm run serve                        Start the search API server
      `);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

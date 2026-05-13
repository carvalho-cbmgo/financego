import fs from "fs";
import path from "path";
import { parseCsvStatement } from "../src/lib/bank-parsers";

const file = process.argv[2];

if (!file) {
  console.error("Uso: npx tsx scripts/test-refunds-nubank.ts caminho/Nubank.csv");
  process.exit(1);
}

const csv = fs.readFileSync(path.resolve(file), "utf-8");
const profileId = "local-test-profile";
const txs = parseCsvStatement("nubank", csv, profileId);
const refunds = txs.filter((t) => t.isRefund);

console.log(JSON.stringify({
  total: txs.length,
  refunds: refunds.length,
  sampleRefunds: refunds.slice(0, 10),
}, null, 2));

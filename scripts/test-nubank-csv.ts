import fs from "fs";
import path from "path";
import { parseCsvStatement } from "../src/lib/bank-parsers";

const file = process.argv[2];

if (!file) {
  console.error("Uso: npx tsx scripts/test-nubank-csv.ts caminho/arquivo.csv");
  process.exit(1);
}

const csv = fs.readFileSync(path.resolve(file), "utf-8");
const profileId = "local-test-profile";
const txs = parseCsvStatement("nubank", csv, profileId);

console.log(JSON.stringify({
  total: txs.length,
  expenses: txs.filter((t) => t.amount < 0).length,
  credits: txs.filter((t) => t.amount > 0).length,
  installments: txs.filter((t) => t.installmentTotal).length,
  sample: txs.slice(0, 10),
}, null, 2));

import { MongoClient } from "mongodb";
import { createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";

const STATES = ["CA"]; // biggest state = best demo

const local = await MongoClient.connect("mongodb://localhost:27017", {
  serverSelectionTimeoutMS: 5000,
});
const db = local.db("nonprofit_directory");
const orgs = db.collection("organizations");

const total = await orgs.countDocuments({ "address.state": { $in: STATES } });
console.log(`Exporting ${total.toLocaleString()} organizations...`);

const cursor = orgs.find(
  { "address.state": { $in: STATES } },
  { batchSize: 5000 }
);

const file = createWriteStream("data/export/ca-subset.json.gz");
const gzip = createGzip();

let count = 0;
const batchSize = 50000;

async function writeBatch(batch) {
  const lines = batch.map((doc) => {
    const { _id, ...rest } = doc;
    return JSON.stringify(rest);
  });
  return new Promise((resolve, reject) => {
    gzip.write(lines.join("\n") + "\n", "utf8", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

let batch = [];
for await (const doc of cursor) {
  batch.push(doc);
  if (batch.length >= batchSize) {
    await writeBatch(batch);
    count += batch.length;
    console.log(`  ${count.toLocaleString()} exported...`);
    batch = [];
  }
}
if (batch.length > 0) {
  await writeBatch(batch);
  count += batch.length;
}

gzip.end();
await pipeline(gzip, file);

console.log(`Done. ${count.toLocaleString()} organizations exported.`);
await local.close();

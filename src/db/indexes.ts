import { Db } from "mongodb";

export async function createIndexes(db: Db): Promise<void> {
  const orgs = db.collection("organizations");

  await orgs.createIndex({ ein: 1 }, { unique: true });
  await orgs.createIndex({ name: "text" });
  await orgs.createIndex({ "address.state": 1, "address.city": 1 });
  await orgs.createIndex({ "address.zip": 1 });
  await orgs.createIndex({ "category.nteeCode": 1 });
  await orgs.createIndex({ "taxExemptStatus.statusCode": 1 });

  console.log("MongoDB indexes created");
}

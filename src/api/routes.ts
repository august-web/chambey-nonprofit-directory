import express from "express";
import path from "node:path";
import { getDb } from "../db/connection.js";
import { PORT } from "../config.js";

export async function startServer(): Promise<void> {
  const db = await getDb();
  const app = express();

  app.use(express.static(path.resolve(process.cwd(), "public")));

  // GET /organizations/search
  app.get("/organizations/search", async (req, res) => {
    try {
      const {
        name,
        ein,
        state,
        city,
        zip,
        status,
        category,
        limit = "20",
        skip = "0",
      } = req.query as Record<string, string>;

      const filter: Record<string, unknown> = {};

      if (name) {
        filter.$text = { $search: name };
      }
      if (ein) {
        filter.ein = ein.replace(/\D/g, "").padStart(9, "0");
      }
      if (state) {
        filter["address.state"] = state.toUpperCase();
      }
      if (city) {
        filter["address.city"] = new RegExp(city, "i");
      }
      if (zip) {
        filter["address.zip"] = zip;
      }
      if (status) {
        filter["taxExemptStatus.statusCode"] = status;
      }
      if (category) {
        filter["category.nteeCode"] = new RegExp(`^${category}`, "i");
      }

      const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
      const skipN = Math.max(parseInt(skip, 10) || 0, 0);

      const orgs = db.collection("organizations");
      const [results, total] = await Promise.all([
        orgs.find(filter).skip(skipN).limit(take).toArray(),
        orgs.countDocuments(filter),
      ]);

      res.json({
        total,
        limit: take,
        skip: skipN,
        results,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // GET /organizations/:ein
  app.get("/organizations/:ein", async (req, res) => {
    try {
      const ein = req.params.ein.replace(/\D/g, "").padStart(9, "0");
      const org = await db
        .collection("organizations")
        .findOne({ ein });

      if (!org) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      res.json(org);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // GET /stats
  app.get("/stats", async (_req, res) => {
    try {
      const orgs = db.collection("organizations");

      const [total, byState, onRevocationList] = await Promise.all([
        orgs.countDocuments(),
        orgs
          .aggregate([
            { $group: { _id: "$address.state", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ])
          .toArray(),
        orgs.countDocuments({ "revocationStatus.onAutoRevocationList": true }),
      ]);

      res.json({
        totalOrganizations: total,
        organizationsByState: byState.map((s) => ({
          state: s._id,
          count: s.count,
        })),
        organizationsOnRevocationList: onRevocationList,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.listen(PORT, () => {
    console.log(`Chambey Nonprofit Directory API running on http://localhost:${PORT}`);
    console.log(`  Search:  GET http://localhost:${PORT}/organizations/search?name=`);
    console.log(`  Lookup:  GET http://localhost:${PORT}/organizations/:ein`);
    console.log(`  Stats:   GET http://localhost:${PORT}/stats`);
  });
}

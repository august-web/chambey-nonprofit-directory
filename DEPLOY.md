# Deploy: Chambey Nonprofit Directory

Stack: **MongoDB Atlas** (data) + **Render** (search API) + **Vercel** (static frontend).

The frontend (`public/index.html`) calls the API via relative paths (`/organizations/search`,
`/organizations/:ein`, `/stats`). Vercel rewrites those to the Render service (see `vercel.json`).

---

## 1. MongoDB Atlas

1. Create a cluster (e.g. `Chambey-Demo`).
2. **Database Access** → add a user with `readWrite` (used by the app). Note the password.
3. **Network Access** → add IP `0.0.0.0/0` (Render uses dynamic egress IPs).
4. **Connect → Drivers → Node.js** → copy the SRV connection string:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`

Keep this URI secret. It is **only** stored in the Render dashboard env var — never in git.

## 2. Render (API)

`render.yaml` defines the service; the dashboard picks it up on first deploy.

1. New → Web Service → connect repo `august-web/chambey-nonprofit-directory`.
2. Render autofills: Build `npm install; npm run build`, Start `npm run start`
   (equivalent to `npm install && npx tsc` then `node dist/cli.js serve`).
3. Add environment variables:
   - `MONGODB_URI` = your Atlas SRV string
   - `DB_NAME` = `nonprofit_directory`
   - (`PORT` is provided by Render at runtime — do not set it)
4. Deploy. Note the assigned URL, e.g. `https://chambey-nonprofit-directory.onrender.com`.
5. Health check is `GET /stats` — it returns 200 once data is loaded (step 3).

Free instances spin down when idle; the first request after idle is slow. Use a paid
instance type for a continuously available site.

## 3. Seed the database

Data is loaded from the export (`data/export/ca-subset.json.gz`, CA nonprofits). Run once,
locally or via a Render shell one-off:

```bash
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority" \
npm run load-subset
```

This connects to `MONGODB_URI`, gunzips the NDJSON export, inserts in batches, and builds indexes.
Verify with `GET /stats` on Render → `totalOrganizations` > 0.

> To instead rebuild from raw IRS sources: `npm run ingest -- --states=ALL`
> (downloads BMF + revocation files, slower; not needed if using the export).

## 4. Vercel (frontend)

1. Import the repo in Vercel.
2. `vercel.json` already rewrites `/stats` and `/organizations/*` to the Render URL
   (`https://chambey-nonprofit-directory.onrender.com`). Update that host in `vercel.json`
   if your Render URL changes.
3. Deploy (build command is `null`; output dir is `public`).
4. Visit the site, run a search (e.g. a CA city) — results come from Atlas via Render.

## 5. Verify

- Render: `curl https://chambey-nonprofit-directory.onrender.com/stats` → JSON with counts.
- Vercel: site loads, search returns CA organizations, detail view opens.

## Notes

- The export binary (`data/export/`) is git-ignored (see `.gitignore`); the loader script
  `scripts/export-subset.js` is tracked. To regenerate the export from a populated local
  Mongo: `npm run tsx scripts/export-subset.js` (adjust `STATES` as needed).
- Never commit `MONGODB_URI`. It lives only in Render's env.
- Vercel requires the git commit author email to match a GitHub account linked to Vercel.
  Use the verified GitHub email (e.g. `elon.dev18@gmail.com`) for commits that trigger deploys:
  `git config user.email "elon.dev18@gmail.com"`. Otherwise Vercel blocks the deployment.

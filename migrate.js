// ============================================================
//  PALS - One-time data migration: MongoDB -> Supabase (Postgres)
//  Reads every document from the existing Mongo collections and
//  upserts them into the Supabase tables. Idempotent: safe to run
//  again (keyed on mongo_id), so re-running only tops up.
//
//  Usage:  node migrate.js
//  Requires SUPABASE_DB_URL and MONGO_URI in .env
// ============================================================
require("dotenv").config();
const mongoose = require("mongoose");
const pg = require("./db/postgres");

// --- minimal Mongo models (match app.js collections) ---
const User = mongoose.model("User", new mongoose.Schema({}, { strict: false, collection: "users" }));
const Prescription = mongoose.model("Prescription", new mongoose.Schema({}, { strict: false, collection: "patientData" }));
const Visibility = mongoose.model("Visibility", new mongoose.Schema({}, { strict: false, collection: "visibilityData" }));
const Doctor = mongoose.model("Doctor", new mongoose.Schema({}, { strict: false, collection: "doctors" }));
const VisitHistory = mongoose.model("VisitHistory", new mongoose.Schema({}, { strict: false, collection: "visitHistory" }));
const EmergencyLog = mongoose.model("EmergencyLog", new mongoose.Schema({}, { strict: false, collection: "emergencyLogs" }));

async function migrateCollection(label, docs, syncFn) {
  let ok = 0, fail = 0;
  for (const d of docs) {
    const obj = d.toObject ? d.toObject() : d;
    const r = await syncFn(obj);
    if (r) ok++; else fail++;
  }
  console.log(`  ${label}: ${ok} copied, ${fail} failed (of ${docs.length})`);
  return { ok, fail, total: docs.length };
}

async function main() {
  if (!process.env.SUPABASE_DB_URL) {
    console.error("❌ SUPABASE_DB_URL is empty. Fill it in .env first.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  pg.init();
  const connected = await pg.testConnection();
  if (!connected) {
    console.error("❌ Could not connect to Supabase. Check SUPABASE_DB_URL.");
    process.exit(1);
  }

  console.log("Ensuring Supabase schema...");
  await pg.runSchema();

  console.log("Reading MongoDB collections...");
  const [users, prescriptions, visibility, doctors, visits, logs] = await Promise.all([
    User.find({}), Prescription.find({}), Visibility.find({}),
    Doctor.find({}), VisitHistory.find({}), EmergencyLog.find({}),
  ]);

  console.log("Migrating...");
  const results = {};
  results.users         = await migrateCollection("users",          users,         pg.syncUser);
  results.prescriptions = await migrateCollection("prescriptions",   prescriptions, pg.syncPrescription);
  results.visibility    = await migrateCollection("visibility",      visibility,    pg.syncVisibility);
  results.doctors       = await migrateCollection("doctors",         doctors,       pg.syncDoctor);
  results.visitHistory  = await migrateCollection("visit_history",   visits,        pg.syncVisit);
  results.emergencyLogs = await migrateCollection("emergency_logs",  logs,          pg.syncEmergencyLog);

  console.log("\n=== Migration summary ===");
  for (const [k, v] of Object.entries(results)) {
    console.log(`  ${k.padEnd(16)} ${v.ok}/${v.total} copied${v.fail ? `, ${v.fail} failed` : ""}`);
  }

  await mongoose.disconnect();
  await pg.getPool().end();
  console.log("\n✅ Done.");
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Migration error:", err);
  process.exit(1);
});

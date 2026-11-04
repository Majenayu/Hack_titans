// ============================================================
//  PALS - PostgreSQL (Supabase) data layer
//  Provides a connection pool and best-effort sync helpers that
//  mirror the MongoDB writes. Mongo stays the primary store;
//  these functions keep Supabase in sync and must never throw
//  into the request path (callers wrap them, but we also guard).
// ============================================================
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

let pool = null;
let enabled = false;

function init() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.log("⚠️  SUPABASE_DB_URL not set - Supabase sync disabled (MongoDB only).");
    return;
  }
  pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }, // Supabase requires SSL
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pool.on("error", (err) => console.error("Postgres pool error:", err.message));
  enabled = true;
}

async function testConnection() {
  if (!enabled) return false;
  try {
    const r = await pool.query("SELECT now() AS now");
    console.log("✅ Supabase (PostgreSQL) connected:", r.rows[0].now);
    return true;
  } catch (err) {
    console.error("❌ Supabase connection failed:", err.message);
    return false;
  }
}

async function runSchema() {
  if (!enabled) return;
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("✅ Supabase schema ensured.");
}

// generic guarded query - logs and swallows errors so sync never
// breaks the main (Mongo-backed) response
async function q(text, params) {
  if (!enabled) return null;
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error("Supabase sync query failed:", err.message);
    return null;
  }
}

// ---- upsert helpers (keyed by mongo_id so re-sync is idempotent) ----

async function syncUser(u) {
  return q(
    `INSERT INTO users (mongo_id, code, name, age, blood_group, allergies,
        medical_conditions, current_medications, emergency_contact, email,
        password, profile_photo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (mongo_id) DO UPDATE SET
        code=EXCLUDED.code, name=EXCLUDED.name, age=EXCLUDED.age,
        blood_group=EXCLUDED.blood_group, allergies=EXCLUDED.allergies,
        medical_conditions=EXCLUDED.medical_conditions,
        current_medications=EXCLUDED.current_medications,
        emergency_contact=EXCLUDED.emergency_contact, email=EXCLUDED.email,
        password=EXCLUDED.password, profile_photo=EXCLUDED.profile_photo`,
    [
      String(u._id), u.code, u.name, u.age != null ? parseInt(u.age) : null,
      u.bloodGroup, u.allergies, u.medicalConditions, u.currentMedications,
      u.emergencyContact, u.email, u.password, u.profilePhoto,
    ]
  );
}

async function syncPrescription(p) {
  return q(
    `INSERT INTO prescriptions (mongo_id, code, date, photo, hospital, report_no,
        bp, pulse, temperature, sugar, cholesterol, history, diseases,
        medication, notes, doctor, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
        COALESCE($17, now()))
     ON CONFLICT (mongo_id) DO UPDATE SET
        code=EXCLUDED.code, date=EXCLUDED.date, photo=EXCLUDED.photo,
        hospital=EXCLUDED.hospital, report_no=EXCLUDED.report_no, bp=EXCLUDED.bp,
        pulse=EXCLUDED.pulse, temperature=EXCLUDED.temperature,
        sugar=EXCLUDED.sugar, cholesterol=EXCLUDED.cholesterol,
        history=EXCLUDED.history, diseases=EXCLUDED.diseases,
        medication=EXCLUDED.medication, notes=EXCLUDED.notes,
        doctor=EXCLUDED.doctor`,
    [
      String(p._id), p.code, p.date, p.photo, p.hospital, p.reportNo, p.bp,
      p.pulse, p.temperature, p.sugar, p.cholesterol, p.history, p.diseases,
      p.medication, p.notes, p.doctor, p.createdAt || null,
    ]
  );
}

async function syncVisibility(v) {
  return q(
    `INSERT INTO visibility (mongo_id, code, hospital, report_no, date, bp, pulse,
        temperature, sugar, cholesterol, history, diseases, medication, notes, doctor)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (code) DO UPDATE SET
        mongo_id=EXCLUDED.mongo_id, hospital=EXCLUDED.hospital,
        report_no=EXCLUDED.report_no, date=EXCLUDED.date, bp=EXCLUDED.bp,
        pulse=EXCLUDED.pulse, temperature=EXCLUDED.temperature,
        sugar=EXCLUDED.sugar, cholesterol=EXCLUDED.cholesterol,
        history=EXCLUDED.history, diseases=EXCLUDED.diseases,
        medication=EXCLUDED.medication, notes=EXCLUDED.notes, doctor=EXCLUDED.doctor`,
    [
      String(v._id), v.code, v.hospital, v.reportNo, v.date, v.bp, v.pulse,
      v.temperature, v.sugar, v.cholesterol, v.history, v.diseases,
      v.medication, v.notes, v.doctor,
    ]
  );
}

async function syncDoctor(d) {
  return q(
    `INSERT INTO doctors (mongo_id, name, specialization, email, password, photo)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (mongo_id) DO UPDATE SET
        name=EXCLUDED.name, specialization=EXCLUDED.specialization,
        email=EXCLUDED.email, password=EXCLUDED.password, photo=EXCLUDED.photo`,
    [String(d._id), d.name, d.specialization, d.email, d.password, d.photo]
  );
}

async function syncVisit(v) {
  return q(
    `INSERT INTO visit_history (mongo_id, patient_code, doctor_id, doctor_name,
        specialization, photo, viewed_at)
     VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7, now()))
     ON CONFLICT (mongo_id) DO NOTHING`,
    [
      String(v._id), v.patientCode, v.doctorId, v.doctorName,
      v.specialization, v.photo, v.viewedAt || null,
    ]
  );
}

async function syncEmergencyLog(l) {
  return q(
    `INSERT INTO emergency_logs (mongo_id, patient_code, emergency_type,
        ip_address, accessed_at)
     VALUES ($1,$2,$3,$4, COALESCE($5, now()))
     ON CONFLICT (mongo_id) DO NOTHING`,
    [String(l._id), l.patientCode, l.emergencyType, l.ipAddress, l.accessedAt || null]
  );
}

module.exports = {
  init,
  testConnection,
  runSchema,
  isEnabled: () => enabled,
  getPool: () => pool,
  syncUser,
  syncPrescription,
  syncVisibility,
  syncDoctor,
  syncVisit,
  syncEmergencyLog,
};

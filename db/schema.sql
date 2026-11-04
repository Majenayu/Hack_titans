-- ============================================================
--  PALS - PostgreSQL schema (Supabase)
--  Mirrors the six MongoDB collections.
--  Safe to run multiple times (IF NOT EXISTS).
-- ============================================================

-- Patients / users
CREATE TABLE IF NOT EXISTS users (
    id                  BIGSERIAL PRIMARY KEY,
    mongo_id            TEXT UNIQUE,            -- original Mongo _id (for sync/dedupe)
    code                TEXT,
    name                TEXT,
    age                 INTEGER,
    blood_group         TEXT,
    allergies           TEXT,
    medical_conditions  TEXT,
    current_medications TEXT,
    emergency_contact   TEXT,
    email               TEXT,
    password            TEXT,
    profile_photo       TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_code  ON users (code);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Prescriptions (patientData)
CREATE TABLE IF NOT EXISTS prescriptions (
    id          BIGSERIAL PRIMARY KEY,
    mongo_id    TEXT UNIQUE,
    code        TEXT,
    date        TEXT,
    photo       TEXT,
    hospital    TEXT,
    report_no   TEXT,
    bp          TEXT,
    pulse       TEXT,
    temperature TEXT,
    sugar       TEXT,
    cholesterol TEXT,
    history     TEXT,
    diseases    TEXT,
    medication  TEXT,
    notes       TEXT,
    doctor      TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_code ON prescriptions (code);

-- Visibility settings (visibilityData) - one row per patient code
CREATE TABLE IF NOT EXISTS visibility (
    id          BIGSERIAL PRIMARY KEY,
    mongo_id    TEXT UNIQUE,
    code        TEXT UNIQUE,
    hospital    TEXT DEFAULT 'public',
    report_no   TEXT DEFAULT 'public',
    date        TEXT DEFAULT 'public',
    bp          TEXT DEFAULT 'public',
    pulse       TEXT DEFAULT 'public',
    temperature TEXT DEFAULT 'public',
    sugar       TEXT DEFAULT 'public',
    cholesterol TEXT DEFAULT 'public',
    history     TEXT DEFAULT 'public',
    diseases    TEXT DEFAULT 'public',
    medication  TEXT DEFAULT 'public',
    notes       TEXT DEFAULT 'public',
    doctor      TEXT DEFAULT 'public'
);

-- Doctors
CREATE TABLE IF NOT EXISTS doctors (
    id             BIGSERIAL PRIMARY KEY,
    mongo_id       TEXT UNIQUE,
    name           TEXT,
    specialization TEXT,
    email          TEXT UNIQUE,
    password       TEXT,
    photo          TEXT,
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- Visit history (visitHistory)
CREATE TABLE IF NOT EXISTS visit_history (
    id             BIGSERIAL PRIMARY KEY,
    mongo_id       TEXT UNIQUE,
    patient_code   TEXT,
    doctor_id      TEXT,
    doctor_name    TEXT,
    specialization TEXT,
    photo          TEXT,
    viewed_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_visit_history_code ON visit_history (patient_code);

-- Emergency access logs (emergencyLogs)
CREATE TABLE IF NOT EXISTS emergency_logs (
    id            BIGSERIAL PRIMARY KEY,
    mongo_id      TEXT UNIQUE,
    patient_code  TEXT,
    emergency_type TEXT,
    ip_address    TEXT,
    accessed_at   TIMESTAMPTZ DEFAULT now()
);

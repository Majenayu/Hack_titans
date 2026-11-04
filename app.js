require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const OpenAI = require("openai");
const pg = require("./db/postgres"); // Supabase (PostgreSQL) sync layer

// Initialize OpenRouter client (compatible with OpenAI SDK)
let openai = null;
const apiKey = process.env.OPENROUTER_API_KEY_HARDCODE || process.env.OPENAI_API_KEY;
if (apiKey) {
  openai = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://openrouter.ai/api/v1"
  });
  console.log("OpenRouter integration enabled");
} else {
  console.log("OpenRouter API key not found - emergency feature will use basic recommendations");
}

// --- CONFIG --- //
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// MongoDB Connection (primary store / backup)
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not set. Create a .env file (see .env example).");
}
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ Mongo Error:", err));

// Supabase (PostgreSQL) - secondary store kept in sync with Mongo
pg.init();
(async () => {
  if (pg.isEnabled()) {
    const ok = await pg.testConnection();
    if (ok) {
      try { await pg.runSchema(); } catch (e) { console.error("Schema ensure failed:", e.message); }
    }
  }
})();

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  api_key: process.env.CLOUDINARY_API_KEY
});

// Multer setup
const storage = multer.diskStorage({});
const upload = multer({ storage });
// --- VISIBILITY SETTINGS --- //
const visibilitySchema = new mongoose.Schema({
  code: String,
  hospital: { type: String, default: "public" },
  reportNo: { type: String, default: "public" },
  date: { type: String, default: "public" },
  bp: { type: String, default: "public" },
  pulse: { type: String, default: "public" },
  temperature: { type: String, default: "public" },
  sugar: { type: String, default: "public" },
  cholesterol: { type: String, default: "public" },
  history: { type: String, default: "public" },
  diseases: { type: String, default: "public" },
  medication: { type: String, default: "public" },
  notes: { type: String, default: "public" },
  doctor: { type: String, default: "public" }
}, { collection: "visibilityData" });

const Visibility = mongoose.models.Visibility || mongoose.model("Visibility", visibilitySchema);

// --- USER SCHEMA --- //
const userSchema = new mongoose.Schema({
  code: String,
  name: String,
  age: Number,
  bloodGroup: String,
  allergies: String,
  medicalConditions: String,
  currentMedications: String,
  emergencyContact: String,
  email: String,
  password: String,
  profilePhoto: String
});
const User = mongoose.model("User", userSchema);

// --- PRESCRIPTION SCHEMA (GLOBAL patientData collection) --- //
const prescriptionSchema = new mongoose.Schema({
  code: String,
  date: String,
  createdAt: { type: Date, default: Date.now },
  photo: String,
  hospital: String,
  reportNo: String,
  bp: String,
  pulse: String,
  temperature: String,
  sugar: String,
  cholesterol: String,
  history: String,
  diseases: String,
  medication: String,
  notes: String,
  doctor: String
}, { collection: "patientData" });

const Prescription = mongoose.model("Prescription", prescriptionSchema);



// --- ROUTES --- //

// Registration
app.post("/register", upload.single("photo"), async (req, res) => {
  try {
    const { name, age, bloodGroup, allergies, medicalConditions, currentMedications, emergencyContact, email, password } = req.body;

    let photoUrl = "";
    if (req.file) {
      const uploaded = await cloudinary.uploader.upload(req.file.path, { folder: "PALS" });
      photoUrl = uploaded.secure_url;
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedPass = await bcrypt.hash(password, 10);

    const newUser = new User({
      code, name, age, bloodGroup, allergies, medicalConditions, currentMedications, emergencyContact,
      email, password: hashedPass, profilePhoto: photoUrl
    });
    await newUser.save();
    pg.syncUser(newUser.toObject()); // mirror to Supabase (best-effort)

    res.json({ message: "✅ Registered Successfully", code, userId: newUser._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration Failed" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password" });

    res.json({
      message: "✅ Login Successful",
      code: user.code,
      name: user.name,
      age: user.age,
      bloodGroup: user.bloodGroup,
      allergies: user.allergies,
      medicalConditions: user.medicalConditions,
      currentMedications: user.currentMedications,
      emergencyContact: user.emergencyContact,
      email: user.email,
      profilePhoto: user.profilePhoto
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login Failed" });
  }
});

// Get user by code
app.get("/user/:code", async (req, res) => {
  try {
    const user = await User.findOne({ code: req.params.code }).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// --- PRESCRIPTION ROUTES --- //

// Add new prescription
app.post("/prescription/:code", upload.single("photo"), async (req, res) => {
  try {
    const { code } = req.params;
    const { date, hospital, reportNo, bp, pulse, temperature, sugar, cholesterol, history, diseases, medication, notes, doctor } = req.body;

    let photoUrl = "";
    if (req.file) {
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        folder: `PALS/${code}/Prescriptions`
      });
      photoUrl = uploaded.secure_url;
    }

    const prescription = new Prescription({
      code, date, photo: photoUrl, hospital, reportNo, bp, pulse, temperature, sugar,
      cholesterol, history, diseases, medication, notes, doctor
    });

    await prescription.save();
    pg.syncPrescription(prescription.toObject()); // mirror to Supabase
    res.json({ message: "✅ Prescription saved", prescription });
  } catch (err) {
    console.error("Prescription save error:", err);
    res.status(500).json({ error: "Failed to save prescription" });
  }
});

// Update prescription
app.put("/prescription/:code/:id", upload.single("photo"), async (req, res) => {
  try {
    const { id } = req.params;
    const { date, hospital, reportNo, bp, pulse, temperature, sugar, cholesterol, history, diseases, medication, notes, doctor } = req.body;

    let updateData = { date, hospital, reportNo, bp, pulse, temperature, sugar, cholesterol, history, diseases, medication, notes, doctor };

    if (req.file) {
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        folder: `PALS/${req.params.code}/Prescriptions`
      });
      updateData.photo = uploaded.secure_url;
    }

    const updated = await Prescription.findByIdAndUpdate(id, updateData, { new: true });
    if (updated) pg.syncPrescription(updated.toObject()); // mirror to Supabase
    res.json({ message: "✅ Prescription updated", updated });
  } catch (err) {
    console.error("Prescription update error:", err);
    res.status(500).json({ error: "Failed to update prescription" });
  }
});

// Get prescriptions by patient code
app.get("/prescription/:code", async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ code: req.params.code }).sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (err) {
    console.error("Prescription fetch error:", err);
    res.status(500).json({ error: "Failed to fetch prescriptions" });
  }
});


// Get visibility settings
app.get("/visibility/:code", async (req, res) => {
  try {
    let prefs = await Visibility.findOne({ code: req.params.code });
    if (!prefs) {
      prefs = new Visibility({ code: req.params.code });
      await prefs.save();
      pg.syncVisibility(prefs.toObject()); // mirror to Supabase
    }
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch visibility" });
  }
});

// Update single field
app.put("/visibility/:code", async (req, res) => {
  try {
    const { field, value } = req.body;
    const update = { [field]: value || "public" };
    const prefs = await Visibility.findOneAndUpdate(
      { code: req.params.code },
      { $set: update },
      { new: true, upsert: true }
    );
    pg.syncVisibility(prefs.toObject()); // mirror to Supabase
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: "Failed to update visibility" });
  }
});

// Get latest prescription with visibility settings
app.get("/manage/:code", async (req, res) => {
  try {
    const prescription = await Prescription.findOne({ code: req.params.code }).sort({ createdAt: -1 });
    let visibility = await Visibility.findOne({ code: req.params.code });
    if (!visibility) {
      visibility = new Visibility({ code: req.params.code });
      await visibility.save();
      pg.syncVisibility(visibility.toObject()); // mirror to Supabase
    }
    res.json({ prescription, visibility });
  } catch (err) {
    console.error("Manage fetch error:", err);
    res.status(500).json({ error: "Failed to fetch manage data" });
  }
});



// Update visibility for one field
app.put("/visibility/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const { field, value } = req.body;

    const updated = await Visibility.findOneAndUpdate(
      { code },
      { $set: { [field]: value || "public" } },
      { new: true, upsert: true }
    );
    pg.syncVisibility(updated.toObject()); // mirror to Supabase

    res.json(updated);
  } catch (err) {
    console.error("Visibility update error:", err);
    res.status(500).json({ error: "Failed to update visibility" });
  }
});


// --- DOCTOR SCHEMA --- //
const doctorSchema = new mongoose.Schema({
  name: String,
  specialization: String,
  email: { type: String, unique: true },
  password: String,
  photo: String
}, { collection: "doctors" });

const Doctor = mongoose.models.Doctor || mongoose.model("Doctor", doctorSchema);

// --- DOCTOR REGISTRATION --- //
app.post("/doctor/register", upload.single("photo"), async (req, res) => {
  try {
    const { name, specialization, email, password } = req.body;

    let photoUrl = "";
    if (req.file) {
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        folder: "PALS/Doctors"
      });
      photoUrl = uploaded.secure_url;
    }

    const hashedPass = await bcrypt.hash(password, 10);

    const newDoc = new Doctor({
      name,
      specialization,
      email,
      password: hashedPass,
      photo: photoUrl
    });

    await newDoc.save();
    pg.syncDoctor(newDoc.toObject()); // mirror to Supabase
    res.json({ message: "✅ Doctor Registered Successfully" });
  } catch (err) {
    console.error("Doctor registration error:", err);
    if (err.code === 11000) {
      res.status(400).json({ error: "Email already registered" });
    } else {
      res.status(500).json({ error: "Doctor registration failed" });
    }
  }
});

// --- DOCTOR LOGIN --- //
app.post("/doctor/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const doc = await Doctor.findOne({ email });
    if (!doc) return res.status(404).json({ error: "Doctor not found" });

    const match = await bcrypt.compare(password, doc.password);
    if (!match) return res.status(400).json({ error: "Invalid password" });

    res.json({
      message: "✅ Login Successful",
      id: doc._id,
      name: doc.name,
      specialization: doc.specialization,
      photo: doc.photo,
      email: doc.email
    });
  } catch (err) {
    console.error("Doctor login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/doctor/patient/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const { doctorId } = req.query; // ✅ Doctor ID must be sent as query param

    // 🔹 1. Find patient basic info
    const patient = await User.findOne({ code }).select("-password");
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // 🔹 2. Fetch latest prescription
    const prescription = await Prescription.findOne({ code }).sort({ createdAt: -1 });
    const visibility = await Visibility.findOne({ code });

    // 🔹 3. Extract only public prescription fields
    const publicData = {};
    if (prescription && visibility) {
      for (const [key, value] of Object.entries(prescription.toObject())) {
        if (visibility[key] === "public") publicData[key] = value;
      }
    }

    // 🔹 4. Log visit to history
    if (doctorId) {
      const doctor = await Doctor.findById(doctorId);
      if (doctor) {
        const visit = new VisitHistory({
          patientCode: code,
          doctorId,
          doctorName: doctor.name,
          specialization: doctor.specialization,
          photo: doctor.photo
        });
        await visit.save();
        pg.syncVisit(visit.toObject()); // mirror to Supabase
      }
    }

    // 🔹 5. Send data back
    res.json({
      patientInfo: patient,
      publicData
    });

  } catch (err) {
    console.error("Doctor Patient Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch patient data" });
  }
});




// --- VISIT HISTORY SCHEMA --- //
const visitHistorySchema = new mongoose.Schema({
  patientCode: String,       // patient’s unique code
  doctorId: String,          // ObjectId of doctor
  doctorName: String,
  specialization: String,
  photo: String,
  viewedAt: { type: Date, default: Date.now }
}, { collection: "visitHistory" });

const VisitHistory = mongoose.models.VisitHistory || mongoose.model("VisitHistory", visitHistorySchema);


app.get("/patient/history/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const history = await VisitHistory.find({ patientCode: code }).sort({ viewedAt: -1 });

    res.json(history);
  } catch (err) {
    console.error("History Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch patient history" });
  }
});





// --- EMERGENCY FEATURE --- //

// Emergency types with standard first aid recommendations
const EMERGENCY_TYPES = {
  "heart_attack": {
    name: "Heart Attack",
    icon: "❤️",
    severity: "critical",
    defaultAction: "Call emergency services immediately. If not allergic to aspirin, chew one aspirin (325mg). Keep patient calm and seated.",
    contraindications: ["aspirin_allergy", "blood_thinners", "bleeding_disorders"]
  },
  "cardiac_arrest": {
    name: "Cardiac Arrest",
    icon: "💔",
    severity: "critical",
    defaultAction: "Call emergency services. Begin CPR immediately. Use AED if available. Continue until help arrives.",
    contraindications: []
  },
  "severe_bleeding": {
    name: "Severe Bleeding",
    icon: "🩸",
    severity: "critical",
    defaultAction: "Apply direct pressure with clean cloth. Elevate wound above heart if possible. Call emergency services.",
    contraindications: ["blood_thinners"]
  },
  "anaphylaxis": {
    name: "Anaphylaxis (Severe Allergic Reaction)",
    icon: "⚠️",
    severity: "critical",
    defaultAction: "Use epinephrine auto-injector if available. Call emergency services. Keep airways open. Monitor breathing.",
    contraindications: []
  },
  "seizure": {
    name: "Seizure/Epilepsy Emergency",
    icon: "⚡",
    severity: "critical",
    defaultAction: "Clear area of hazards. Do NOT restrain. Turn on side after convulsions stop. Call emergency if seizure lasts >5 minutes.",
    contraindications: []
  }
};

// Extract data from prescription image using AI
app.post("/extract-prescription", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image provided" });
    
    if (!openai) {
      return res.json({ extracted: {}, message: "AI extraction not available (API key not configured)" });
    }

    const imageBuffer = require('fs').readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await openai.chat.completions.create({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract medical prescription information from this prescription image. Return ONLY valid JSON (no markdown) with these exact fields: hospital, reportNo, date (YYYY-MM-DD), doctor, bp, pulse, temperature, sugar, cholesterol, medication, history, diseases, diagnosis. For vitals and lab values, include the units (e.g., '145/92 mmHg', '98.6°F', '180 mg/dL'). If a field is not visible, omit it. Return empty object if not a prescription." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      max_completion_tokens: 512
    });

    try {
      const extracted = JSON.parse(response.choices[0].message.content);
      res.json({ extracted, success: true });
    } catch {
      res.json({ extracted: {}, message: "Could not parse prescription data" });
    }
  } catch (err) {
    console.error("Extract error:", err);
    res.json({ extracted: {}, message: "Error extracting data" });
  }
});

// Get patient data for emergency
app.get("/emergency/patient/:code", async (req, res) => {
  try {
    const { code } = req.params;
    
    const patient = await User.findOne({ code }).select("name age bloodGroup allergies medicalConditions currentMedications");
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    
    const prescriptions = await Prescription.find({ code }).sort({ createdAt: -1 }).limit(5);
    
    const medicalHistory = {
      diseases: [],
      medications: [],
      allergies: patient.allergies || "None reported"
    };
    
    // Add user's stored medical conditions
    if (patient.medicalConditions) {
      medicalHistory.diseases.push(...patient.medicalConditions.split(',').map(d => d.trim()));
    }
    
    // Add user's stored current medications
    if (patient.currentMedications) {
      medicalHistory.medications.push(...patient.currentMedications.split(',').map(m => m.trim()));
    }
    
    // Also include prescription data
    prescriptions.forEach(p => {
      if (p.diseases) medicalHistory.diseases.push(...p.diseases.split(',').map(d => d.trim()));
      if (p.medication) medicalHistory.medications.push(...p.medication.split(',').map(m => m.trim()));
    });
    
    medicalHistory.diseases = [...new Set(medicalHistory.diseases)];
    medicalHistory.medications = [...new Set(medicalHistory.medications)];
    
    res.json({
      patient: {
        name: patient.name,
        age: patient.age,
        bloodGroup: patient.bloodGroup
      },
      medicalHistory
    });
  } catch (err) {
    console.error("Emergency patient fetch error:", err);
    res.status(500).json({ error: "Failed to fetch patient data" });
  }
});

// AI-powered emergency recommendation
app.post("/emergency/analyze", async (req, res) => {
  try {
    const { patientCode, emergencyType } = req.body;
    
    if (!EMERGENCY_TYPES[emergencyType]) {
      return res.status(400).json({ error: "Invalid emergency type" });
    }
    
    const patient = await User.findOne({ code: patientCode }).select("name age bloodGroup allergies");
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    
    const prescriptions = await Prescription.find({ code: patientCode }).sort({ createdAt: -1 }).limit(5);
    
    const diseases = [];
    const medications = [];
    prescriptions.forEach(p => {
      if (p.diseases) diseases.push(...p.diseases.split(',').map(d => d.trim()));
      if (p.medication) medications.push(...p.medication.split(',').map(m => m.trim()));
    });
    
    const emergency = EMERGENCY_TYPES[emergencyType];
    
    if (!openai) {
      return res.json({
        emergency: emergency.name,
        severity: emergency.severity,
        patientInfo: {
          name: patient.name,
          age: patient.age,
          bloodGroup: patient.bloodGroup,
          allergies: patient.allergies
        },
        recommendation: emergency.defaultAction,
        warnings: patient.allergies ? [`Patient has allergies: ${patient.allergies}`] : [],
        existingConditions: [...new Set(diseases)],
        currentMedications: [...new Set(medications)],
        aiPowered: false,
        disclaimer: "DISCLAIMER: This is general first aid guidance. Always call emergency services (911) immediately for life-threatening situations."
      });
    }
    
    const prompt = `You are an emergency medical advisor AI. A patient is experiencing a ${emergency.name} emergency.

PATIENT INFORMATION:
- Name: ${patient.name}
- Age: ${patient.age}
- Blood Group: ${patient.bloodGroup}
- Known Allergies: ${patient.allergies || "None reported"}
- Existing Conditions: ${[...new Set(diseases)].join(', ') || "None recorded"}
- Current Medications: ${[...new Set(medications)].join(', ') || "None recorded"}

EMERGENCY: ${emergency.name}
Standard First Aid: ${emergency.defaultAction}

Based on this patient's medical history, provide:
1. Safe first aid recommendations that won't conflict with their existing conditions or medications
2. Specific warnings about what NOT to do based on their medical history
3. Any drug interactions or contraindications to avoid
4. Priority actions while waiting for emergency services

Respond in JSON format with these fields:
{
  "safeRecommendations": ["array of safe actions to take"],
  "criticalWarnings": ["array of things to avoid based on patient history"],
  "drugInteractions": ["potential medication conflicts"],
  "priorityActions": ["numbered priority steps"],
  "additionalNotes": "any important observations"
}`;

    const response = await openai.chat.completions.create({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        { role: "system", content: "You are an emergency medical advisor. Provide clear, actionable first aid guidance while considering patient medical history. Always emphasize calling emergency services first. Respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
      max_completion_tokens: 1024
    });
    
    const aiAnalysis = JSON.parse(response.choices[0].message.content);
    
    res.json({
      emergency: emergency.name,
      severity: emergency.severity,
      patientInfo: {
        name: patient.name,
        age: patient.age,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies
      },
      existingConditions: [...new Set(diseases)],
      currentMedications: [...new Set(medications)],
      aiAnalysis,
      aiPowered: true,
      disclaimer: "DISCLAIMER: This is AI-assisted guidance only. Always call emergency services (911) immediately. This is not a substitute for professional medical care."
    });
    
  } catch (err) {
    console.error("Emergency analysis error:", err);
    res.status(500).json({ error: "Failed to analyze emergency" });
  }
});

// Log emergency access
const emergencyLogSchema = new mongoose.Schema({
  patientCode: String,
  emergencyType: String,
  accessedAt: { type: Date, default: Date.now },
  ipAddress: String
}, { collection: "emergencyLogs" });

const EmergencyLog = mongoose.models.EmergencyLog || mongoose.model("EmergencyLog", emergencyLogSchema);

app.post("/emergency/log", async (req, res) => {
  try {
    const { patientCode, emergencyType } = req.body;
    const log = new EmergencyLog({
      patientCode,
      emergencyType,
      ipAddress: req.ip
    });
    await log.save();
    pg.syncEmergencyLog(log.toObject()); // mirror to Supabase
    res.json({ message: "Emergency access logged" });
  } catch (err) {
    console.error("Emergency log error:", err);
    res.status(500).json({ error: "Failed to log emergency" });
  }
});

// --- START SERVER --- //
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
  console.log(`➡️ Open http://${HOST}:${PORT}/register.html`);
});

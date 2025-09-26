const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

// --- CONFIG --- //
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// MongoDB Connection
const MONGO_URI = "mongodb+srv://Dream:Dream@dream.spzp7dv.mongodb.net/?retryWrites=true&w=majority&appName=Dream";
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ Mongo Error:", err));

// Cloudinary Config
cloudinary.config({
  cloud_name: "dcd0vatd4",
  api_secret: "Jp54tH7ROGA6aGXB4p1hC_O3G58",
  api_key: "682614525437581"
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
  vitals: { type: String, default: "public" },
  sugar: { type: String, default: "public" },
  cholesterol: { type: String, default: "public" },
  diagnosis: { type: String, default: "public" },
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
  emergencyContact: String,
  email: String,
  password: String,
  profilePhoto: String
});
const User = mongoose.model("User", userSchema);

// --- PRESCRIPTION SCHEMA (GLOBAL patientData collection) --- //
const prescriptionSchema = new mongoose.Schema({
  code: String,        // patient unique code
  date: String,
  createdAt: { type: Date, default: Date.now },
  photo: String,
  hospital: String,
  reportNo: String,
  vitals: String,
  sugar: String,
  cholesterol: String,
  diagnosis: String,
  medication: String,
  notes: String,
  doctor: String
}, { collection: "patientData" });

const Prescription = mongoose.model("Prescription", prescriptionSchema);



// --- ROUTES --- //

// Registration
app.post("/register", upload.single("photo"), async (req, res) => {
  try {
    const { name, age, bloodGroup, allergies, emergencyContact, email, password } = req.body;

    let photoUrl = "";
    if (req.file) {
      const uploaded = await cloudinary.uploader.upload(req.file.path, { folder: "PALS" });
      photoUrl = uploaded.secure_url;
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedPass = await bcrypt.hash(password, 10);

    const newUser = new User({
      code, name, age, bloodGroup, allergies, emergencyContact,
      email, password: hashedPass, profilePhoto: photoUrl
    });
    await newUser.save();

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
    const { date, hospital, reportNo, vitals, sugar, cholesterol, diagnosis, medication, notes, doctor } = req.body;

    let photoUrl = "";
    if (req.file) {
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        folder: `PALS/${code}/Prescriptions`
      });
      photoUrl = uploaded.secure_url;
    }

    const prescription = new Prescription({
      code, date, photo: photoUrl, hospital, reportNo, vitals, sugar,
      cholesterol, diagnosis, medication, notes, doctor
    });

    await prescription.save();
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
    const { date, hospital, reportNo, vitals, sugar, cholesterol, diagnosis, medication, notes, doctor } = req.body;

    let updateData = { date, hospital, reportNo, vitals, sugar, cholesterol, diagnosis, medication, notes, doctor };

    if (req.file) {
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        folder: `PALS/${req.params.code}/Prescriptions`
      });
      updateData.photo = uploaded.secure_url;
    }

    const updated = await Prescription.findByIdAndUpdate(id, updateData, { new: true });
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
        await new VisitHistory({
          patientCode: code,
          doctorId,
          doctorName: doctor.name,
          specialization: doctor.specialization,
          photo: doctor.photo
        }).save();
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





// --- START SERVER --- //
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`➡️ Open http://localhost:${PORT}/register.html`);
});

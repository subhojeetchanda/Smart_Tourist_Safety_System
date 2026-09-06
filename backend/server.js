// --- Mock API Server for SIH Project Simulation (Multi-Tourist Version) ---
// Node.js + Express.js + Firebase Firestore + Google OAuth Support

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");
const bcrypt = require("bcryptjs");

// --- Firebase Admin Setup ---
const admin = require("firebase-admin");

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Parse the JSON string from the environment variable (for Render deployment)
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Fallback to local file for local development
  try {
    serviceAccount = require("./serviceAccountKey.json");
  } catch (error) {
    console.error("Error: serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT not set.");
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const USERS_COLLECTION = "live_dashboard_users";
const AUTH_USERS_COLLECTION = "app_simulator_users";

const app = express();
const PORT = 5001;

app.use(cors());
app.use(bodyParser.json());

// --- Load CSV Simulation Data ---
let df_simulation = [];
fs.createReadStream("simulation_paths.csv")
  .pipe(csv())
  .on("data", (row) => df_simulation.push(row))
  .on("end", () => console.log("✅ 'simulation_paths.csv' loaded successfully."))
  .on("error", () => console.error("❌ CRITICAL ERROR: 'simulation_paths.csv' not found."));

// --- In-memory state ---
let liveTouristData = {};
let touristLogs = {};
let safetyAlerts = [];
let anomalyDetectedTourists = new Set();
let touristToUserMap = {}; 

function addLogEntry(touristId, lat, lon, status) {
  if (!touristLogs[touristId]) touristLogs[touristId] = [];
  touristLogs[touristId].push({
    tourist_id: touristId,
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    timestamp: new Date().toISOString(),
    status: status,
  });
  if (touristLogs[touristId].length > 1000) touristLogs[touristId] = touristLogs[touristId].slice(-1000);
}

// ==========================================
// GOOGLE OAUTH HANDLERS
// ==========================================

// 1. Google Login for Live Dashboard
app.post("/google-login", async (req, res) => {
  const { idToken } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, picture } = decodedToken;

    // Check if user exists
    const querySnapshot = await db.collection(USERS_COLLECTION).where("email", "==", email).get();
    
    let userDocId;
    let userData;

    if (querySnapshot.empty) {
      // Register new user from Google Data
      const newUser = {
        username: name || email.split('@')[0],
        email: email,
        phone: "N/A", // Google doesn't always provide phone
        photoURL: picture,
        createdAt: new Date().toISOString(),
        provider: "google"
      };
      const docRef = await db.collection(USERS_COLLECTION).add(newUser);
      userDocId = docRef.id;
      userData = newUser;
    } else {
      // Login existing user
      userDocId = querySnapshot.docs[0].id;
      userData = querySnapshot.docs[0].data();
    }

    res.json({ 
      success: true, 
      message: "Google login successful",
      user: { id: userDocId, username: userData.username, email: userData.email }
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ error: "Invalid Google Token" });
  }
});

// 2. Google Login for App Simulator
app.post("/auth/google-login", async (req, res) => {
  const { idToken } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name } = decodedToken;

    const querySnapshot = await db.collection(AUTH_USERS_COLLECTION).where("email", "==", email).get();

    let userDocId;
    let userData;

    if (querySnapshot.empty) {
      // Register new user with DEFAULT values for simulation-specific fields
      const newUser = {
        username: name || email.split('@')[0],
        email: email,
        password: "GOOGLE_AUTH_USER", // Placeholder
        dateOfBirth: "2000-01-01", // Default
        aadhaarNumber: "000000000000", // Default (12 digits)
        phone: "0000000000", // Default (10 digits)
        pathType: "normal", // Default path
        createdAt: new Date().toISOString(),
        provider: "google"
      };
      const docRef = await db.collection(AUTH_USERS_COLLECTION).add(newUser);
      userDocId = docRef.id;
      userData = newUser;
    } else {
      userDocId = querySnapshot.docs[0].id;
      userData = querySnapshot.docs[0].data();
    }

    res.json({ 
      success: true, 
      message: "Google login successful",
      user: { id: userDocId, username: userData.username, pathType: userData.pathType }
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ error: "Invalid Google Token" });
  }
});

// ==========================================
// STANDARD AUTH ROUTES (UNCHANGED)
// ==========================================

// User registration (live-dashboard)
app.post("/register", async (req, res) => {
  const { username, phone, email } = req.body;
  if (!username || !phone || !email) return res.status(400).json({ error: "All fields required" });
  try {
    const emailCheck = await db.collection(USERS_COLLECTION).where("email", "==", email).get();
    if (!emailCheck.empty) return res.status(400).json({ error: "User already exists" });

    const newUser = { username, phone, email, createdAt: new Date().toISOString(), provider: "local" };
    const docRef = await db.collection(USERS_COLLECTION).add(newUser);
    res.json({ success: true, message: "User registered", user: { id: docRef.id, username } });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// User login (live-dashboard)
app.post("/login", async (req, res) => {
  const { username, phone } = req.body;
  if (!username && !phone) return res.status(400).json({ error: "Provide username or phone" });
  try {
    let q = username 
      ? db.collection(USERS_COLLECTION).where("username", "==", username)
      : db.collection(USERS_COLLECTION).where("phone", "==", phone);
    
    const snap = await q.get();
    if (snap.empty) return res.status(404).json({ error: "User not found" });

    res.json({ success: true, message: "Login successful", user: { id: snap.docs[0].id, username: snap.docs[0].data().username } });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// App Simulator Auth (Register)
app.post("/auth/register", async (req, res) => {
  const { username, email, password, dateOfBirth, aadhaarNumber, phone, pathType } = req.body;
  if (!username || !email || !password || !dateOfBirth || !aadhaarNumber || !phone || !pathType) {
    return res.status(400).json({ error: "All fields required" });
  }
  try {
    const emailCheck = await db.collection(AUTH_USERS_COLLECTION).where("email", "==", email).get();
    if (!emailCheck.empty) return res.status(400).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, email, password: hashedPassword, dateOfBirth, aadhaarNumber, phone, pathType, createdAt: new Date().toISOString(), provider: "local" };
    
    const docRef = await db.collection(AUTH_USERS_COLLECTION).add(newUser);
    res.json({ success: true, message: "Registered", user: { id: docRef.id, username, pathType } });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// App Simulator Auth (Login)
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Required fields missing" });
  try {
    const snap = await db.collection(AUTH_USERS_COLLECTION).where("username", "==", username).get();
    if (snap.empty) return res.status(404).json({ error: "User not found" });

    const user = snap.docs[0].data();
    if (await bcrypt.compare(password, user.password)) {
      res.json({ success: true, message: "Login successful", user: { id: snap.docs[0].id, username: user.username, pathType: user.pathType } });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// --- Standard Simulation Routes (Shortened for brevity, logic unchanged) ---
app.get("/", (req, res) => res.send("<h1>Server Running (Firebase + Google Auth)</h1>"));
app.get("/reset_simulation", (req, res) => {
  liveTouristData = {}; touristLogs = {}; safetyAlerts = []; anomalyDetectedTourists = new Set(); touristToUserMap = {};
  res.json({ status: "Simulation reset" });
});
app.get("/get_tourist_ids", (req, res) => {
  if (!df_simulation.length) return res.status(500).json({ error: "Data not loaded" });
  res.json({ 
    normal: [...new Set(df_simulation.filter(r => r.path_type === "normal").map(r => r.tourist_id))],
    anomaly: [...new Set(df_simulation.filter(r => r.path_type === "anomaly").map(r => r.tourist_id))]
  });
});
app.post("/get_path", (req, res) => {
  const { tourist_id, type, username } = req.body;
  const pathData = df_simulation.filter((r) => r.tourist_id === tourist_id);
  if (!pathData.length) return res.status(404).json({ error: "Tourist ID not found" });
  
  const actualType = pathData[0].path_type;
  if (type && type !== actualType) return res.status(400).json({ error: "Path type mismatch" });

  const coords = pathData.map((r) => ({ lat: parseFloat(r.lat), lon: parseFloat(r.lon) }));
  liveTouristData[tourist_id] = { lat: coords[0].lat, lon: coords[0].lon, status: "normal", path_type: actualType, username: username || "Unknown", timestamp: new Date().toISOString() };
  if (username) touristToUserMap[tourist_id] = username;
  addLogEntry(tourist_id, coords[0].lat, coords[0].lon, "normal");
  res.json({ tourist_id: tourist_id, path_type: actualType, path: coords });
});
app.post("/update_location", (req, res) => {
  const { tourist_id, lat, lon, status = "normal" } = req.body;
  if (liveTouristData[tourist_id]) {
    liveTouristData[tourist_id].lat = lat; liveTouristData[tourist_id].lon = lon;
    if (liveTouristData[tourist_id].status !== "sos") liveTouristData[tourist_id].status = status;
    addLogEntry(tourist_id, lat, lon, liveTouristData[tourist_id].status);
  }
  res.json({ status: "updated" });
});
app.post("/predict", (req, res) => {
  const { tourist_id, path_type, path = [] } = req.body;
  if (liveTouristData[tourist_id] && liveTouristData[tourist_id].status !== "sos") {
    if (path_type === "anomaly" && path.length > 30) {
      liveTouristData[tourist_id].status = "anomaly";
      if (!anomalyDetectedTourists.has(tourist_id)) {
        safetyAlerts.push({ message: "Wrong path detected!", timestamp: new Date().toISOString(), type: "anomaly", tourist_id, username: touristToUserMap[tourist_id] || "Unknown" });
        anomalyDetectedTourists.add(tourist_id);
      }
    } else {
      liveTouristData[tourist_id].status = "normal";
    }
    addLogEntry(tourist_id, liveTouristData[tourist_id].lat, liveTouristData[tourist_id].lon, liveTouristData[tourist_id].status);
  }
  setTimeout(() => res.json({ status: "prediction processed" }), 100);
});
app.post("/sos", (req, res) => {
  const { tourist_id, lat, lon } = req.body;
  console.log(`🚨 SOS: ${tourist_id}`);
  liveTouristData[tourist_id] = { lat, lon, status: "sos", username: touristToUserMap[tourist_id] || "Unknown", timestamp: new Date().toISOString() };
  addLogEntry(tourist_id, lat, lon, "sos");
  safetyAlerts.push({ message: "SOS Raised!", timestamp: new Date().toISOString(), type: "sos", tourist_id, username: touristToUserMap[tourist_id] || "Unknown" });
  res.json({ status: "SOS Received" });
});
app.post("/resolve_sos", (req, res) => {
  const { tourist_id } = req.body;
  if (liveTouristData[tourist_id]) {
    liveTouristData[tourist_id].status = "normal";
    addLogEntry(tourist_id, liveTouristData[tourist_id].lat, liveTouristData[tourist_id].lon, "normal");
  }
  res.json({ status: "SOS Resolved" });
});
app.get("/get_live_statuses", (req, res) => {
  const statuses = {};
  for (const [id, data] of Object.entries(liveTouristData)) {
    statuses[id] = { ...data, username: touristToUserMap[id] || "Unknown" };
  }
  res.json(statuses);
});
app.get("/get_logs/:id", (req, res) => res.json(touristLogs[req.params.id] || []));
app.get("/get_safety_alerts", (req, res) => res.json(safetyAlerts));
app.post("/clear_safety_alerts", (req, res) => { safetyAlerts = []; res.json({ status: "cleared" }); });
app.get("/get_heatmap_data", (req, res) => {
  const data = [];
  Object.values(touristLogs).forEach(logs => logs.forEach(l => data.push([l.lat, l.lon, l.status==='sos'?1:l.status==='anomaly'?0.6:0.3])));
  res.json(data);
});
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
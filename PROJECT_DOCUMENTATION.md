# Smart Tourist Safety System (SIH25002) - Comprehensive Project Documentation

## 1. Project Overview
The **Smart Tourist Safety System** is an end-to-end, AI-driven platform designed to ensure the safety and security of tourists. Built to address the SIH25002 problem statement, it leverages real-time tracking, anomaly detection, geo-fencing, and emergency response workflows.

The system is split into a **three-tier architecture**:
1. **Live Dashboard (Admin/Authorities Frontend)**
2. **App Simulation (Tourist Mobile App Frontend)**
3. **Node.js Backend & Machine Learning (Centralized Server)**

---

## 2. Architecture & Tech Stack

### Frontend (Next.js 16 - App Router)
Both the Live Dashboard and the App Simulator are built using the latest modern web technologies:
- **Framework:** Next.js 16 (Turbopack)
- **Styling:** Tailwind CSS (v4) with bespoke Glassmorphism and Mesh Gradient designs.
- **UI Components:** Radix UI primitives, Lucide React icons.
- **Mapping:** Leaflet & React-Leaflet (for live tracking and mini-maps).
- **PDF Generation:** jsPDF & jsPDF-AutoTable (for E-FIRs).
- **Internationalization:** `next-intl` for multi-language support (English & Hindi).

### Backend (Node.js & Express)
- **Runtime:** Node.js with Express.js REST API.
- **Data Simulation:** Parses `simulation_paths.csv` to inject real-world mock coordinates.
- **State Management:** In-memory tracking of tourist logs, safety scores, and anomaly thresholds.

### Database & Authentication (Firebase)
- **Auth:** Google OAuth and Email/Password sign-ins via Firebase Authentication.
- **Database (Firestore):** Stores structured user records for both dashboard administrators and simulated tourists, as well as archived E-FIR (Electronic First Information Reports) logs.

### Machine Learning (Python/XGBoost)
- Contains trained XGBoost models (`final_tuned_xgboost_model.json`) and data scalers (`final_scaler.pkl`) to calculate non-linear anomaly risks based on tourist movement patterns, speed, and time of day.

---

## 3. Deep Dive: Core Modules

### A. Live Dashboard (`/live-dashboard`)
The central command center for authorities.
- **Real-Time Map Tracking:** Renders multiple tourist markers on a live map using `react-leaflet`. It dynamically updates marker colors based on the tourist's current state (e.g., Red for SOS/Anomaly, Blue for Normal).
- **Safety Score Monitoring:** Fetches the aggregated safety score of active tourists and plots risk levels.
- **Automated E-FIR System:** 
  - If a tourist remains in an anomalous or SOS state for a critical duration, the dashboard flags it.
  - Generates an official, downloadable **PDF E-FIR**.
  - The PDF includes a **Live Mini-Map screenshot**, pinpointing the exact coordinates of the incident alongside user metadata.
- **Authentication:** Secure login gateway for police and admins.

### B. App Simulator (`/app-simulation`)
A high-fidelity web simulator representing the tourist's mobile phone interface.
- **Premium User Interface:** Designed with a stunning deep dark mode, sleek glassmorphism panels, interactive glow effects, and micro-animations to deliver a "wow" factor during presentations.
- **Scenario Simulation:** Allows testers/judges to actively toggle tourists into "Normal Paths" or "Anomalous Paths" to trigger system reactions.
- **SOS Controls:** A dedicated interface for the tourist to trigger and resolve high-priority SOS emergency signals.
- **System Diagnostics Panel:** Displays real-time calculations to the tourist, including Late Night Monitoring risks and Active Anomaly Detections.

### C. Backend Server (`/backend`)
The brain routing data between the Simulator and the Dashboard.
- **Data Polling & Ingestion:** Provides endpoints for the simulator to push location updates and state changes.
- **Algorithmic Risk Calculation:** Calculates dynamic "Safety Scores" by evaluating:
  - **Time of Day:** Higher risk weightings applied during late-night hours.
  - **Path Anomalies:** Detects deviations from standard tourist routes.
  - **User States:** Evaluates manual SOS triggers vs automated anomaly triggers.
- **E-FIR Logging:** Handles the creation and permanent Firestore storage of incident reports.

---

## 4. A Deep Dive into the SafeSphere AI Engine

Our AI system is the result of a rigorous, professional workflow, divided into three main phases: creating a realistic world for our AI to learn from, finding the right "brain" for the job, and then making that brain as smart as possible.

### Phase 1: The Data Foundation (The "World" We Built)
Our biggest initial challenge was that **no data existed** for this specific problem. We couldn't download a simple dataset. So, our first major achievement was building a **custom Data Simulation Engine from scratch**.

**1. Creating the Map:**
* We started by building a digital replica of Sikkim. Using a Python library called **`OSMnx`**, we programmatically pulled the **actual, real-world road network** and the locations of hundreds of real hotels, tourist spots, and police stations directly from **OpenStreetMap**.
* We also defined our own high-risk zones based on real geography, like national parks and remote border areas. This gave us a rich `sikkim_zones_complete.geojson` file to serve as our map.

**2. Simulating the "Good Tourist":**
* With this map, we created our `normal_data.csv`. For hundreds of simulated tourists, we wrote a script that:
    1.  Created a random itinerary (e.g., Hotel -> Spot A -> Spot B -> Hotel).
    2.  Calculated the **real driving route** along the road network using a shortest-path algorithm.
    3.  Generated a sequence of GPS coordinates that followed this winding path.
    4.  Crucially, we included **"dwell time"**—realistic pauses of 45-120 minutes every time a tourist reached a destination to simulate sightseeing.

**3. Simulating the "Tourist in Trouble":**
* To create our `anomalous_data.csv`, we took these perfect normal paths and programmatically corrupted them to create the three key anomalies from the problem statement:
    * **Route Deviation**: We made a path suddenly veer off the road into a high-risk zone.
    * **Prolonged Inactivity**: We injected long, multi-hour pauses on remote roads where a tourist should not be stopping.
    * **Location Drop-off**: We abruptly cut the path short to simulate a device going offline.

The result of this phase was a rich, complex, and highly realistic dataset that perfectly mirrored the challenges of the problem statement.

### Phase 2: The Modeling Journey (Finding the Right "Brain")
Once we had our data, we began a professional, iterative process to find the best model.

**1. Our First Attempt: The LSTM Autoencoder (A Deep Learning Approach)**
* **What it is**: We started with an advanced Deep Learning model called an **LSTM (Long Short-Term Memory) Autoencoder**. LSTMs are excellent at understanding sequences of data. 
* **Why we chose it**: Our initial strategy was to use an **unsupervised** approach. We trained the model *only* on normal data, expecting it to fail to reconstruct anomalous paths, thus producing a high error that we could use as an alert.
* **Why we REJECTED it**: Through rigorous testing, we discovered a critical insight: the anomalies were too subtle. The LSTM model was so good at generalizing that it learned to reconstruct even the anomalous paths with a low error. The error distributions were too similar, leading to very low detection accuracy. This proved that a more direct, supervised approach was needed.

**2. The Breakthrough: The XGBoost Classifier (The "Senior Detective")**
* **What it is**: We pivoted to a **supervised** approach using an **XGBoost Classifier**. Instead of one big neural network, it's an **ensemble** of hundreds of small, simple "decision trees" that work together.
* **Why we chose it**: We realized that the key to this problem wasn't the raw sequence of coordinates, but the **overall statistical properties of the entire journey**. An LSTM is a junior detective looking at individual clues; XGBoost is a senior detective who wants a complete case file.

### Phase 3: The "Secret Sauce" – Feature Engineering and Training
**1. Feature Engineering (Creating the "Case File"):**
* We wrote a script to transform each raw, complex journey into a simple, high-level summary. For each tourist's path, we calculated powerful statistical features like:
    * `mean_speed` and `max_speed`
    * `standard_deviation_of_speed` (how erratic the driving was)
    * `total_distance` traveled and `total_duration` of the trip
* This transformed our complex time-series problem into a simple, structured table of data, which is what XGBoost excels at.

**2. Training and Tuning the Final Model:**
* We trained our XGBoost model on this new, feature-rich dataset.
* A key challenge was the "class imbalance" (more normal data than anomalous data). To solve this, we used a critical hyperparameter called `scale_pos_weight`. This commanded the model to pay extra attention to the rarer but more important "anomaly" cases.
* This rigorous process resulted in our final, high-performance model, which achieved a robust and well-balanced accuracy of **81.00%** on a large, completely unseen test set.

### How Our Final AI System Works
In our live prototype, the AI functions as follows:
1.  **Input**: The API receives a tourist's recent path data (a series of coordinates and timestamps).
2.  **Processing**: It immediately runs our **feature engineering script** to calculate the statistical summary for that path (mean speed, max speed, etc.).
3.  **Prediction**: It feeds this summary into our trained **XGBoost model**.
4.  **Output**: The model returns a simple prediction: a **`0`** for Normal or a **`1`** for Anomaly, along with a confidence score.
5.  **Solution**: Our API server translates this `0` or `1` into a clear JSON response like `{'is_anomaly': true}`, which triggers the real-time visual alerts on our dashboard.

---

## 5. Key Workflows

### 1. The Anomaly Detection Workflow
1. The **App Simulator** assigns a tourist to an "Anomalous Path" (e.g., venturing into restricted zones).
2. The **Backend** receives the irregular coordinates and flags the tourist's `hasAnomaly` state to `true`.
3. The **Live Dashboard** map instantly updates the tourist's marker to Red, sounds an alert, and degrades the overall Safety Score.

### 2. The SOS & E-FIR Workflow
1. A tourist presses the "Send SOS" button on the **App Simulator**.
2. The **Backend** registers a critical emergency. 
3. If the SOS is not resolved within the predefined critical threshold, an **E-FIR** is flagged.
4. An Admin on the **Live Dashboard** clicks "Generate E-FIR". The frontend captures the precise latitude/longitude, renders a mini-map using Leaflet, compiles a detailed PDF using jsPDF, and triggers a download while logging the report to Firebase.

---

## 6. Deployment Strategy
- **Backend:** Deployed as a Node.js Web Service on **Render**. Includes a keep-alive cron job to prevent cold starts on the free tier.
- **Live Dashboard & Simulator:** Deployed independently as optimized Edge applications on **Vercel**, communicating with the Render backend via `NEXT_PUBLIC_API_URL` environment variables.

---

## 7. Future Roadmap
As the system evolves beyond the SIH prototype:
- **Hyperledger Fabric Blockchain:** Transitioning E-FIR and user registration logs to a decentralized ledger for immutable, tamper-proof police records.
- **Twilio SMS/WhatsApp Integration:** Automated dispatch of emergency texts to the tourist's registered emergency contacts upon SOS.
- **Edge AI ML Integration:** Moving the XGBoost inference directly to the backend runtime (or edge nodes) rather than simulating the ML outputs via pre-computed CSV paths.

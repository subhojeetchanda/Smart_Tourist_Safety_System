"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface TouristIdsResponse {
  normal: string[];
  anomaly: string[];
}

interface PathPoint {
  lat: number;
  lon: number;
}

interface PathResponse {
  tourist_id: string;
  path_type: string;
  path: PathPoint[];
}

interface Simulation {
  path: PathPoint[];
  pathType: string;
  currentIndex: number;
  interval: NodeJS.Timeout | null;
}

interface TouristSafetyScore {
  id: string;
  score: number;
  lateNight: boolean;
  hasAnomaly: boolean;
  sosActive: boolean;
}

interface TouristsResponse {
  [touristId: string]: {
    lat: number;
    lon: number;
    status: "normal" | "anomaly" | "sos";
    timestamp: string;
    username: string; // Added username field
  };
}

interface SafetyAlert {
  message: string;
  timestamp: string;
  type: string;
  tourist_id: string;
  username: string; // Added username field
}

export default function SimulatorPage() {
  const [tourists, setTourists] = useState<TouristIdsResponse>({
    normal: [],
    anomaly: [],
  });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState("Idle");
  const [activeSimulations, setActiveSimulations] = useState<
    Record<string, Simulation>
  >({});
  const [resolvingSos, setResolvingSos] = useState<string | null>(null);
  const [selectedSosTourist, setSelectedSosTourist] = useState<string>("");
  const [safetyScore, setSafetyScore] = useState<number>(85);
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlert[]>([]);
  const [individualScores, setIndividualScores] = useState<Record<string, TouristSafetyScore>>({});
  const [liveStatuses, setLiveStatuses] = useState<Record<string, any>>({});
  const [currentUser, setCurrentUser] = useState<{id: string, username: string, pathType: string} | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const t = useTranslations("SimulatorPage");

  // Get current user from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  // Fetch tourists
  useEffect(() => {
    fetch(`${API_URL}/get_tourist_ids`)
      .then((res) => res.json())
      .then((data: TouristIdsResponse) => {
        setTourists(data || { normal: [], anomaly: [] });
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error fetching IDs:", err);
        alert("Could not connect to backend");
        setLoading(false);
      });
  }, [API_URL]);

  // Fetch safety alerts from backend
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_URL}/get_safety_alerts`);
        const data: SafetyAlert[] = await res.json();
        setSafetyAlerts(data);
      } catch (err) {
        console.error("Error fetching safety alerts:", err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 2000);
    return () => clearInterval(interval);
  }, [API_URL]);

  // Fetch live statuses to check if SOS is still active
  useEffect(() => {
    const fetchLiveStatuses = async () => {
      try {
        const res = await fetch(`${API_URL}/get_live_statuses`);
        const data = await res.json();
        setLiveStatuses(data);
      } catch (err) {
        console.error("Error fetching live statuses:", err);
      }
    };

    fetchLiveStatuses();
    const interval = setInterval(fetchLiveStatuses, 2000);
    return () => clearInterval(interval);
  }, [API_URL]);

  // Update safety scores based on various factors
  useEffect(() => {
    // Update overall safety score
    const now = new Date();
    const hour = now.getHours();
    const isLateNight = hour >= 22 || hour <= 6;
    
    let score = 85;
    
    // Deduct points for late night
    if (isLateNight) {
      score -= 10;
    }
    
    // Deduct points for anomalies
    const anomalyCount = safetyAlerts.filter(alert => alert.type === "anomaly").length;
    score -= anomalyCount * 5;
    
    // Deduct points for active SOS alerts (only if tourist still has SOS status)
    const activeSosCount = safetyAlerts.filter(alert => 
      alert.type === "sos" && 
      liveStatuses[alert.tourist_id]?.status === "sos"
    ).length;
    score -= activeSosCount * 15;
    
    // Ensure score stays within 0-100 range
    score = Math.max(0, Math.min(100, score));
    
    setSafetyScore(score);
    
    // Update individual safety scores for monitored tourists
    const newIndividualScores: Record<string, TouristSafetyScore> = {};
    
    Object.keys(activeSimulations).forEach(id => {
      const hasSOS = safetyAlerts.some(alert => 
        alert.tourist_id === id && 
        alert.type === "sos" && 
        liveStatuses[id]?.status === "sos"
      );
      const hasAnomaly = safetyAlerts.some(alert => 
        alert.tourist_id === id && 
        alert.type === "anomaly"
      );
      
      let individualScore = 85;
      
      // Deduct points for late night
      if (isLateNight) {
        individualScore -= 10;
      }
      
      // Deduct points for anomaly
      if (hasAnomaly) {
        individualScore -= 15;
      }
      
      // Deduct points for SOS (only if still active)
      if (hasSOS) {
        individualScore -= 25;
      }
      
      // Ensure score stays within 0-100 range
      individualScore = Math.max(0, Math.min(100, individualScore));
      
      newIndividualScores[id] = {
        id,
        score: individualScore,
        lateNight: isLateNight,
        hasAnomaly: hasAnomaly,
        sosActive: hasSOS
      };
    });
    
    setIndividualScores(newIndividualScores);
  }, [safetyAlerts, activeSimulations, liveStatuses]);

  // Start monitoring selected tourists
  const startMonitoring = async () => {
    if (selected.length === 0) {
      alert("Please select at least one tourist.");
      return;
    }

    // Clear previous alerts when starting new monitoring
    try {
      await fetch(`${API_URL}/clear_safety_alerts`, {
        method: "POST",
      });
      setSafetyAlerts([]);
    } catch (err) {
      console.error("Error clearing alerts:", err);
    }

    setStatus(`Starting ${selected.length} simulations...`);
    await fetch(`${API_URL}/reset_simulation`);

    const newSimulations: Record<string, Simulation> = {};

    for (const option of selected) {
      const [id, type] = option.split("|");
      const res = await fetch(`${API_URL}/get_path`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tourist_id: id,
          type: type,
          username: currentUser?.username || "Unknown"
        }),
      });
      const data: PathResponse = await res.json();

      newSimulations[id] = {
        path: data.path,
        pathType: data.path_type,
        currentIndex: 0,
        interval: null,
      };
      startIndividualSimulation(id, newSimulations);
    }
    setActiveSimulations(newSimulations);
    setStatus(`${selected.length} tourists are now being monitored.`);
    
    // Set the first active tourist as default for SOS dropdown
    const activeIds = Object.keys(newSimulations);
    if (activeIds.length > 0) {
      setSelectedSosTourist(activeIds[0]);
    }
  };

  // Run each tourist's simulation
  const startIndividualSimulation = (
    id: string,
    sims: Record<string, Simulation>
  ) => {
    const sim = sims[id];
    sim.interval = setInterval(async () => {
      if (sim.currentIndex >= sim.path.length) {
        if (sim.interval) clearInterval(sim.interval);
        return;
      }
      const point = sim.path[sim.currentIndex];

      await fetch(`${API_URL}/update_location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourist_id: id,
          lat: point.lat,
          lon: point.lon,
          path_type: sim.pathType,
        }),
      });

      const predictionResponse = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourist_id: id,
          path_type: sim.pathType,
          path: sim.path.slice(0, sim.currentIndex + 1),
        }),
      });

      sim.currentIndex++;
    }, 1500);
  };

  // SOS trigger
  const sendSOS = async () => {
    const ids = Object.keys(activeSimulations);
    if (ids.length === 0) {
      alert("No active tourists. Start monitoring first!");
      return;
    }
    
    if (!selectedSosTourist) {
      alert("Please select a tourist to send SOS from.");
      return;
    }

    const sim = activeSimulations[selectedSosTourist];
    const currentPos =
      sim.path[sim.currentIndex > 0 ? sim.currentIndex - 1 : 0];

    await fetch(`${API_URL}/sos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tourist_id: selectedSosTourist,
        lat: currentPos.lat,
        lon: currentPos.lon,
      }),
    });
    
    setStatus(`🚨 SOS sent for Tourist ${selectedSosTourist}`);
  };

  // SOS resolve
  const resolveSOS = async () => {
    const ids = Object.keys(activeSimulations);
    if (ids.length === 0) {
      alert("No active tourists. Start monitoring first!");
      return;
    }
    
    if (!selectedSosTourist) {
      alert("Please select a tourist to resolve SOS for.");
      return;
    }

    setResolvingSos(selectedSosTourist);
    
    try {
      const res = await fetch(`${API_URL}/resolve_sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourist_id: selectedSosTourist }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      setStatus(`✅ SOS resolved for Tourist ${selectedSosTourist}`);
    } catch (err) {
      console.error("Error resolving SOS:", err);
      alert("Failed to resolve SOS. Please try again.");
    } finally {
      setResolvingSos(null);
    }
  };

  // Handle dropdown selection
  const handleSelection = (value: string) => {
    if (value && !selected.includes(value)) {
      setSelected([...selected, value]);
    }
  };

  // Remove a selected path
  const removeSelected = (value: string) => {
    setSelected(selected.filter(item => item !== value));
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelected([]);
  };

  // Clear all safety alerts
  const clearAlerts = async () => {
    try {
      const res = await fetch(`${API_URL}/clear_safety_alerts`, {
        method: "POST",
      });
      if (res.ok) {
        setSafetyAlerts([]);
      }
    } catch (err) {
      console.error("Error clearing alerts:", err);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative overflow-hidden bg-[#090b14] p-4 font-sans text-slate-300">
      
      {/* Background Mesh Gradients & Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute top-[40%] left-[50%] translate-x-[-50%] w-[40rem] h-[20rem] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="flex w-full max-w-7xl gap-6 relative z-10">
        
        {/* Safety Score Section - Left Side */}
        <div className="w-1/4 bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:border-blue-500/30">
          <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 text-center mb-6 tracking-wide drop-shadow-sm">
            {t("safetyScore")}
          </h2>
          
          {/* Display current user info */}
          {currentUser && (
            <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl transition-all hover:bg-slate-800/80">
              <h3 className="font-semibold text-slate-200 mb-1 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                {t("currentUser")}
              </h3>
              <p className="text-sm font-medium text-cyan-300">{currentUser.username}</p>
              <p className="text-xs text-slate-400 mt-1">{t("pathType")} <span className="text-slate-300">{currentUser.pathType}</span></p>
            </div>
          )}
          
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-40 h-40 group">
              {/* Outer glow ring for running simulations */}
              {Object.keys(activeSimulations).length > 0 && (
                 <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-ping opacity-20"></div>
              )}
              <svg className="w-full h-full drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" viewBox="0 0 120 120">
                <circle
                  className="text-slate-800/80 stroke-current"
                  strokeWidth="8"
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                />
                <circle
                  className="text-blue-500 stroke-current transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeLinecap="round"
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                  strokeDasharray="314"
                  strokeDashoffset={314 * (1 - safetyScore / 100)}
                  transform="rotate(-90 60 60)"
                />
                <text
                  x="60"
                  y="65"
                  className="text-3xl font-black fill-white text-center"
                  textAnchor="middle"
                >
                  {safetyScore}
                </text>
              </svg>
            </div>
            <div className="mt-5 text-center">
              <p className={`text-lg font-extrabold tracking-wide ${safetyScore >= 80 ? 'text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : safetyScore >= 60 ? 'text-yellow-400' : safetyScore >= 40 ? 'text-orange-400' : 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]'}`}>
                {safetyScore >= 80 ? t("excellentSafety") : 
                 safetyScore >= 60 ? t("goodSafety") : 
                 safetyScore >= 40 ? t("fairSafety") : 
                 t("poorSafety")}
              </p>
            </div>
          </div>
          
          {/* Individual Tourist Scores */}
          {Object.keys(individualScores).length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t("touristScores")}</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {Object.values(individualScores).map((tourist) => (
                  <div key={tourist.id} className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:bg-slate-800/60 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-slate-200 text-sm">Tourist {tourist.id}</span>
                      <span className={`font-black text-sm px-2 py-0.5 rounded-full bg-slate-900/50 ${getScoreColor(tourist.score)}`}>
                        {tourist.score}
                      </span>
                    </div>
                    <div className="text-xs space-y-1.5 text-slate-400">
                      {liveStatuses[tourist.id]?.username && (
                        <div className="flex items-center">
                          <div className="w-1.5 h-1.5 rounded-full mr-2 bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]"></div>
                          <span>{t("user")} <span className="text-slate-300">{liveStatuses[tourist.id].username}</span></span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${tourist.lateNight ? 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)]' : 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]'}`}></div>
                        <span>{t("lateNight")} <span className="text-slate-300">{tourist.lateNight ? t("highRisk") : t("normal")}</span></span>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${tourist.hasAnomaly ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]' : 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]'}`}></div>
                        <span>{t("anomalyDetected")} <span className="text-slate-300">{tourist.hasAnomaly ? t("detected") : t("none")}</span></span>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${tourist.sosActive ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.9)] animate-pulse' : 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]'}`}></div>
                        <span>{t("sosActive")} <span className="text-slate-300">{tourist.sosActive ? t("active") : t("none")}</span></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("systemDiagnostics")}</h3>
            
            <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:bg-slate-800/60 transition-colors">
              <h3 className="text-sm font-semibold text-slate-200 mb-1">{t("lateNightMonitoring")}</h3>
              <div className="mt-1.5 flex items-center text-xs">
                <div className={`w-2 h-2 rounded-full mr-2 ${new Date().getHours() >= 22 || new Date().getHours() <= 6 ? 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)] animate-pulse' : 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]'}`}></div>
                <span className="text-slate-300">{new Date().getHours() >= 22 || new Date().getHours() <= 6 ? t("highRisk") : t("normal")}</span>
              </div>
            </div>
            
            <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:bg-slate-800/60 transition-colors">
              <h3 className="text-sm font-semibold text-slate-200 mb-1">{t("anomalyDetection")}</h3>
              <div className="mt-1.5 text-xs">
                {safetyAlerts.filter(a => a.type === "anomaly").length > 0 ? (
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)] mr-2 animate-pulse"></div>
                    <span className="text-red-300 font-medium">{safetyAlerts.filter(a => a.type === "anomaly").length} {t("anomalousPaths")}</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)] mr-2"></div>
                    <span className="text-slate-300">{t("noAnomaliesDetected")}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:bg-slate-800/60 transition-colors">
              <h3 className="text-sm font-semibold text-slate-200 mb-1">{t("sosActivity")}</h3>
              <div className="mt-1.5 text-xs">
                {safetyAlerts.filter(a => 
                  a.type === "sos" && 
                  liveStatuses[a.tourist_id]?.status === "sos"
                ).length > 0 ? (
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.9)] mr-2 animate-ping"></div>
                    <span className="text-red-400 font-bold">
                      {safetyAlerts.filter(a => 
                        a.type === "sos" && 
                        liveStatuses[a.tourist_id]?.status === "sos"
                      ).length} {t("activeSos")}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)] mr-2"></div>
                    <span className="text-slate-300">{t("noActiveSos")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile App Simulator Section - Middle */}
        <div className="w-2/4 bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]">
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400 text-center mb-8 tracking-wide drop-shadow-sm flex items-center justify-center gap-3">
            <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            {t("mobileAppSimulator")}
          </h1>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
               <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               <p className="text-slate-400 font-medium">{t("loadingTourists")}</p>
            </div>
          ) : (
            <>
              {/* Tourist Selection */}
              <div className="mb-8">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-700/50 pb-2">
                  {t("selectTouristPaths")}
                </h2>

                <div className="space-y-5">
                  {/* Normal paths dropdown */}
                  <div className="relative group">
                    <h3 className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]"></div>
                      {t("normalPaths")}
                    </h3>
                    <select
                      onChange={(e) => handleSelection(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-600 text-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all outline-none appearance-none cursor-pointer hover:bg-slate-700/80"
                      defaultValue=""
                    >
                      <option value="" disabled className="text-slate-500">{t("selectNormalPath")}</option>
                      {tourists.normal.map((id) => (
                        <option key={id} value={`${id}|normal`} className="bg-slate-800">
                          {id}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-[32px] pointer-events-none text-slate-400 group-hover:text-green-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>

                  {/* Anomalous paths dropdown */}
                  <div className="relative group">
                    <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_5px_rgba(251,146,60,0.8)]"></div>
                      {t("anomalousPathsLbl")}
                    </h3>
                    <select
                      onChange={(e) => handleSelection(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-600 text-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all outline-none appearance-none cursor-pointer hover:bg-slate-700/80"
                      defaultValue=""
                    >
                      <option value="" disabled className="text-slate-500">{t("selectAnomalousPath")}</option>
                      {tourists.anomaly.map((id) => (
                        <option key={id} value={`${id}|anomaly`} className="bg-slate-800">
                          {id}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-[32px] pointer-events-none text-slate-400 group-hover:text-orange-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>

                  {/* Selected paths display */}
                  {selected.length > 0 && (
                    <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                          {t("selectedPaths")} ({selected.length})
                        </h3>
                        <button
                          onClick={clearAllSelections}
                          className="text-xs font-semibold text-red-400 hover:text-red-300 hover:underline transition-all"
                        >
                          {t("clearAll")}
                        </button>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-700/50 p-3 rounded-xl space-y-2 max-h-40 overflow-y-auto custom-scrollbar shadow-inner">
                        {selected.map((selection) => {
                          const [id, type] = selection.split("|");
                          return (
                            <div key={selection} className="flex justify-between items-center bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/50 hover:border-slate-500/50 transition-colors">
                              <div>
                                <span className="text-sm font-medium text-slate-200">
                                  {id} <span className={`text-xs ml-1 px-1.5 py-0.5 rounded-md ${type === 'normal' ? 'bg-green-500/20 text-green-300' : 'bg-orange-500/20 text-orange-300'}`}>{type}</span>
                                </span>
                                {currentUser && (
                                  <div className="text-xs text-blue-300 mt-1 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                    {currentUser.username}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => removeSelected(selection)}
                                className="text-slate-400 hover:text-red-400 p-1.5 rounded-md hover:bg-red-400/10 transition-colors"
                                aria-label="Remove"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  onClick={startMonitoring}
                  disabled={selected.length === 0}
                  className="flex-1 relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-bold shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] disabled:shadow-none hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 transition-all duration-200"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    {t("startMonitoring")} {selected.length > 0 && `(${selected.length})`}
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                </button>
              </div>

              {/* SOS Section */}
              {Object.keys(activeSimulations).length > 0 && (
                <div className="mb-8 p-5 bg-slate-800/60 border border-slate-700/50 rounded-xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[50px] pointer-events-none"></div>
                  <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    {t("sosControls")}
                  </h2>
                  
                  <div className="mb-5 relative group">
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                      {t("selectTouristForSos")}
                    </label>
                    <select
                      value={selectedSosTourist}
                      onChange={(e) => setSelectedSosTourist(e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-600 text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 p-3 outline-none appearance-none cursor-pointer transition-colors hover:border-slate-500"
                    >
                      {Object.keys(activeSimulations).map((id) => (
                        <option key={id} value={id}>
                          {id} {liveStatuses[id]?.username && `(${liveStatuses[id].username})`}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-[32px] pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                    <button
                      onClick={sendSOS}
                      className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white py-2.5 px-4 rounded-xl font-bold shadow-[0_4px_14px_0_rgba(225,29,72,0.39)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.23)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      {t("sendSos")}
                    </button>
                    <button
                      onClick={resolveSOS}
                      disabled={resolvingSos !== null}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl font-bold shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] disabled:shadow-none hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      {resolvingSos ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t("resolving")}
                        </>
                      ) : (
                        <>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          {t("resolveSos")}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Status Section */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/50 rounded-xl text-center shadow-inner">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t("simulationStatus")}</h2>
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700">
               <div className={`w-2 h-2 rounded-full mr-2 ${status.includes("Idle") ? "bg-slate-500" : status.includes("SOS sent") ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" : "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"}`}></div>
               <p
                 className={`font-semibold text-sm ${
                   status.includes("Idle")
                     ? "text-slate-300"
                     : status.includes("monitor")
                     ? "text-green-400"
                     : status.includes("SOS sent")
                     ? "text-red-400"
                     : status.includes("SOS resolved")
                     ? "text-emerald-400"
                     : "text-blue-400"
                 }`}
               >
                 {status}
               </p>
            </div>
          </div>
        </div>

        {/* Safety Alert Section - Right Side */}
        <div className="w-1/4 bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]">
          <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 text-center mb-6 tracking-wide drop-shadow-sm flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
            {t("safetyAlerts")}
          </h2>
          
          <div className="mb-4 flex justify-between items-center border-b border-slate-700/50 pb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{t("activeAlerts")}</h3>
            {safetyAlerts.length > 0 && (
              <button 
                onClick={clearAlerts}
                className="text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors"
              >
                {t("clearAll")}
              </button>
            )}
          </div>
          
          <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1 custom-scrollbar">
            {safetyAlerts.length > 0 ? (
              safetyAlerts.map((alert, index) => (
                  <div 
                  key={index} 
                  className={`p-4 rounded-xl relative overflow-hidden transition-all animate-in slide-in-from-right-4 fade-in duration-300 ${
                    alert.type === "efir" ? 'bg-slate-900 border border-red-500/50 shadow-[inset_4px_0_0_0_rgb(239,68,68)]' :
                    alert.type === "sos" ? 'bg-slate-900 border border-rose-700/40 shadow-[inset_4px_0_0_0_rgb(225,29,72)]' : 
                    'bg-slate-900 border border-orange-700/40 shadow-[inset_4px_0_0_0_rgb(249,115,22)]'
                  }`}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-20" 
                    style={{ background: alert.type === "efir" || alert.type === "sos" ? 'radial-gradient(circle at top right, red, transparent)' : 'radial-gradient(circle at top right, orange, transparent)' }}></div>
                  
                  <div className="flex items-start relative z-10">
                    <div className={`w-2 h-2 rounded-full mr-3 mt-1.5 flex-shrink-0 ${
                      alert.type === "efir" ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-ping' :
                      alert.type === "sos" ? 'bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.8)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
                    }`}></div>
                    <div className="flex-1">
                      <p className={`text-sm leading-snug ${alert.type === "efir" ? 'font-bold text-red-300' : 'text-slate-200'}`}>
                        {alert.message}
                      </p>
                      {alert.username && alert.username !== "Unknown" && (
                        <p className="text-xs font-medium text-blue-300 mt-2 flex items-center gap-1">
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                           {alert.username}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 mt-3 text-right">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 h-full text-slate-500">
                <div className="w-16 h-16 mb-4 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center shadow-inner">
                  <svg className="w-8 h-8 text-green-500/70 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                </div>
                <p className="font-semibold text-slate-300 mb-1">{t("noActiveAlerts")}</p>
                <p className="text-xs text-center px-4 leading-relaxed">{t("allSystemsNormal")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Global CSS for Custom Scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.6);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(94, 114, 228, 0.8);
        }
      `}} />
    </div>
  );
}
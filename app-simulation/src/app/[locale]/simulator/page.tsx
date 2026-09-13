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

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f172a] p-4">
      <div className="flex w-full max-w-7xl gap-6">
        {/* Safety Score Section - Left Side */}
        <div className="w-1/4 bg-gray-800 shadow-lg rounded-xl p-6 text-white">
          <h2 className="text-xl font-bold text-center text-blue-400 mb-6">
            {t("safetyScore")}
          </h2>
          
          {/* Display current user info */}
          {currentUser && (
            <div className="mb-6 p-3 bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-200 mb-1">{t("currentUser")}</h3>
              <p className="text-sm text-blue-300">{currentUser.username}</p>
              <p className="text-xs text-gray-400">{t("pathType")} {currentUser.pathType}</p>
            </div>
          )}
          
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full" viewBox="0 0 120 120">
                <circle
                  className="text-gray-700 stroke-current"
                  strokeWidth="10"
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                />
                <circle
                  className="text-blue-500 stroke-current"
                  strokeWidth="10"
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
                  className="text-2xl font-bold fill-white text-center"
                  textAnchor="middle"
                >
                  {safetyScore}
                </text>
              </svg>
            </div>
            <div className="mt-4 text-center">
              <p className="text-lg font-semibold">
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
              <h3 className="font-semibold text-gray-200 mb-3">{t("touristScores")}</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {Object.values(individualScores).map((tourist) => (
                  <div key={tourist.id} className="p-3 bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Tourist {tourist.id}</span>
                      <span className={`font-bold ${getScoreColor(tourist.score)}`}>
                        {tourist.score}
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      {liveStatuses[tourist.id]?.username && (
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full mr-2 bg-blue-500"></div>
                          <span>{t("user")} {liveStatuses[tourist.id].username}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${tourist.lateNight ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <span>{t("lateNight")} {tourist.lateNight ? t("highRisk") : t("normal")}</span>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${tourist.hasAnomaly ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <span>{t("anomalyDetected")} {tourist.hasAnomaly ? t("detected") : t("none")}</span>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${tourist.sosActive ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <span>{t("sosActive")} {tourist.sosActive ? t("active") : t("none")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="p-3 bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-200 mb-1">{t("lateNightMonitoring")}</h3>
              <p className="text-sm text-gray-400">{t("basedOnCurrentTime")}</p>
              <div className="mt-2 flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${new Date().getHours() >= 22 || new Date().getHours() <= 6 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <span>{new Date().getHours() >= 22 || new Date().getHours() <= 6 ? t("highRisk") : t("normal")}</span>
              </div>
            </div>
            
            <div className="p-3 bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-200 mb-1">{t("anomalyDetection")}</h3>
              <p className="text-sm text-gray-400">{t("basedOnSelectedPaths")}</p>
              <div className="mt-2">
                {safetyAlerts.filter(a => a.type === "anomaly").length > 0 ? (
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                    <span>{safetyAlerts.filter(a => a.type === "anomaly").length} {t("anomalousPaths")}</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span>{t("noAnomaliesDetected")}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-3 bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-200 mb-1">{t("sosActivity")}</h3>
              <p className="text-sm text-gray-400">{t("emergencySignals")}</p>
              <div className="mt-2">
                {safetyAlerts.filter(a => 
                  a.type === "sos" && 
                  liveStatuses[a.tourist_id]?.status === "sos"
                ).length > 0 ? (
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                    <span>
                      {safetyAlerts.filter(a => 
                        a.type === "sos" && 
                        liveStatuses[a.tourist_id]?.status === "sos"
                      ).length} {t("activeSos")}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span>{t("noActiveSos")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile App Simulator Section - Middle */}
        <div className="w-2/4 bg-gray-800 shadow-lg rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold text-center text-blue-400 mb-6">
            {t("mobileAppSimulator")}
          </h1>

          {loading ? (
            <p className="text-center text-gray-400">{t("loadingTourists")}</p>
          ) : (
            <>
              {/* Tourist Selection */}
              <div className="mb-6">
                <h2 className="font-semibold text-gray-200 mb-2">
                  {t("selectTouristPaths")}
                </h2>

                <div className="space-y-4">
                  {/* Normal paths dropdown */}
                  <div>
                    <h3 className="text-sm font-medium text-green-400 mb-2">
                      {t("normalPaths")}
                    </h3>
                    <select
                      onChange={(e) => handleSelection(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2"
                      defaultValue=""
                    >
                      <option value="" disabled>{t("selectNormalPath")}</option>
                      {tourists.normal.map((id) => (
                        <option key={id} value={`${id}|normal`}>
                          {id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Anomalous paths dropdown */}
                  <div>
                    <h3 className="text-sm font-medium text-yellow-400 mb-2">
                      {t("anomalousPathsLbl")}
                    </h3>
                    <select
                      onChange={(e) => handleSelection(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2"
                      defaultValue=""
                    >
                      <option value="" disabled>{t("selectAnomalousPath")}</option>
                      {tourists.anomaly.map((id) => (
                        <option key={id} value={`${id}|anomaly`}>
                          {id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected paths display */}
                  {selected.length > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-blue-400">
                          {t("selectedPaths")}
                        </h3>
                        <button
                          onClick={clearAllSelections}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          {t("clearAll")}
                        </button>
                      </div>
                      <div className="bg-gray-700 p-3 rounded-md space-y-2 max-h-40 overflow-y-auto">
                        {selected.map((selection) => {
                          const [id, type] = selection.split("|");
                          return (
                            <div key={selection} className="flex justify-between items-center">
                              <div>
                                <span className="text-sm">
                                  {id} <span className="text-gray-400">({type})</span>
                                </span>
                                {currentUser && (
                                  <div className="text-xs text-blue-300">
                                    {t("user")} {currentUser.username}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => removeSelected(selection)}
                                className="text-red-400 hover:text-red-300 text-xs"
                              >
                                {t("remove")}
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
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <button
                  onClick={startMonitoring}
                  disabled={selected.length === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium shadow"
                >
                  {t("startMonitoring")} {selected.length > 0 && `(${selected.length})`}
                </button>
              </div>

              {/* SOS Section */}
              {Object.keys(activeSimulations).length > 0 && (
                <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                  <h2 className="font-semibold text-gray-200 mb-3">{t("sosControls")}</h2>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {t("selectTouristForSos")}
                    </label>
                    <select
                      value={selectedSosTourist}
                      onChange={(e) => setSelectedSosTourist(e.target.value)}
                      className="w-full bg-gray-600 border border-gray-500 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                    >
                      {Object.keys(activeSimulations).map((id) => (
                        <option key={id} value={id}>
                          {id} {liveStatuses[id]?.username && `(${liveStatuses[id].username})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={sendSOS}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium shadow"
                    >
                      {t("sendSos")}
                    </button>
                    <button
                      onClick={resolveSOS}
                      disabled={resolvingSos !== null}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium shadow disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      {resolvingSos ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t("resolving")}
                        </>
                      ) : (
                        t("resolveSos")
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Status Section */}
          <div className="p-4 bg-gray-700 border border-gray-600 rounded-lg text-center">
            <h2 className="font-semibold text-gray-200 mb-1">{t("simulationStatus")}</h2>
            <p
              className={`font-medium ${
                status.includes("Idle")
                  ? "text-gray-400"
                  : status.includes("monitor")
                  ? "text-green-400"
                  : status.includes("SOS sent")
                  ? "text-red-400"
                  : status.includes("SOS resolved")
                  ? "text-green-400"
                  : "text-blue-400"
              }`}
            >
              {status}
            </p>
          </div>
        </div>

        {/* Safety Alert Section - Right Side */}
        <div className="w-1/4 bg-gray-800 shadow-lg rounded-xl p-6 text-white">
          <h2 className="text-xl font-bold text-center text-blue-400 mb-6">
            {t("safetyAlerts")}
          </h2>
          
          <div className="mb-4 flex justify-between items-center">
            <h3 className="font-semibold text-gray-200">{t("activeAlerts")}</h3>
            {safetyAlerts.length > 0 && (
              <button 
                onClick={clearAlerts}
                className="text-xs text-red-400 hover:text-red-300"
              >
                {t("clearAll")}
              </button>
            )}
          </div>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {safetyAlerts.length > 0 ? (
              safetyAlerts.map((alert, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg ${alert.type === "sos" ? 'bg-red-900 border border-red-700' : 'bg-yellow-900 border border-yellow-700'}`}
                >
                  <div className="flex items-start">
                    <div className={`w-4 h-4 rounded-full mr-2 mt-1 ${alert.type === "sos" ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                    <div>
                      <p className="text-sm">{alert.message}</p>
                      {alert.username && alert.username !== "Unknown" && (
                        <p className="text-xs text-blue-300 mt-1">{t("user")} {alert.username}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                <p>{t("noActiveAlerts")}</p>
                <p className="text-xs mt-1">{t("allSystemsNormal")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
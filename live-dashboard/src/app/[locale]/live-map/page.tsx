"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

interface TouristData {
  lat: number;
  lon: number;
  status: "normal" | "anomaly" | "sos";
  timestamp: string;
  username: string; // Added username field
}

interface TouristLog {
  tourist_id: string;
  lat: number;
  lon: number;
  timestamp: string;
  status: "normal" | "anomaly" | "sos";
}

type TouristsResponse = Record<string, TouristData>;

const MapWrapper = dynamic(() => import("@/components/Map"), { ssr: false });

export default function DashboardPage() {
  const [tourists, setTourists] = useState<TouristsResponse>({});
  const [touristLogs, setTouristLogs] = useState<Record<string, TouristLog[]>>({});
  const [openLogsId, setOpenLogsId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingLogs, setLoadingLogs] = useState<string | null>(null);
  const [resolvingSos, setResolvingSos] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const t = useTranslations("LiveMap");

  // Generate heatmap data from tourist logs
  const heatmapData = useMemo(() => {
    const data: [number, number, number][] = [];
    
    Object.values(touristLogs).forEach(logs => {
      logs.forEach(log => {
        if (log.status === "sos") {
          // SOS events get highest intensity (1.0)
          data.push([log.lat, log.lon, 1.0]);
        } else if (log.status === "anomaly") {
          // Anomalies get medium intensity (0.6)
          data.push([log.lat, log.lon, 0.6]);
        } else {
          // Normal events get low intensity (0.3)
          data.push([log.lat, log.lon, 0.3]);
        }
      });
    });
    
  return data;
  }, [touristLogs]);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await fetch(`${API_URL}/get_live_statuses`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data: TouristsResponse = await res.json();
          setTourists(data);
          setError(null);
        } else {
          const text = await res.text();
          throw new Error(`Expected JSON but got: ${text.substring(0, 100)}...`);
        }
      } catch (err) {
        console.error("Error fetching statuses:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      }
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 2000);
    return () => clearInterval(interval);
  }, [API_URL]);

  useEffect(() => {
    // Auto-update logs for the currently open tourist
    const updateOpenLogs = async () => {
      if (!openLogsId) return;
      
      try {
        const res = await fetch(`${API_URL}/get_logs/${openLogsId}`);
        
        if (!res.ok) {
          if (res.status === 404) return; // Don't show error for 404
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data: TouristLog[] = await res.json();
          setTouristLogs(prev => ({ ...prev, [openLogsId]: data }));
        }
      } catch (err) {
        console.error("Error updating logs:", err);
      }
    };

    updateOpenLogs();
    const logsInterval = setInterval(updateOpenLogs, 2000);
    return () => clearInterval(logsInterval);
  }, [openLogsId, API_URL]);

  // Function to fetch all tourist logs for heatmap
  const fetchAllTouristLogs = async () => {
    setLoadingHeatmap(true);
    
    try {
      const touristIds = Object.keys(tourists);
      const logPromises = touristIds.map(async (id) => {
        try {
          const res = await fetch(`${API_URL}/get_logs/${id}`);
          
          if (!res.ok) {
            if (res.status === 404) return null;
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data: TouristLog[] = await res.json();
            return { id, data };
          } else {
            const text = await res.text();
            throw new Error(`Expected JSON but got: ${text.substring(0, 100)}...`);
          }
        } catch (err) {
          console.error(`Error fetching logs for ${id}:`, err);
          return null;
        }
      });
      
      const logsResults = await Promise.all(logPromises);
      
      const newLogs = { ...touristLogs };
      logsResults.forEach(result => {
        if (result) {
          newLogs[result.id] = result.data;
        }
      });
      
      setTouristLogs(newLogs);
      setError(null);
    } catch (err) {
      console.error("Error fetching all logs:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoadingHeatmap(false);
    }
  };

  const handleHeatmapToggle = async () => {
    if (showHeatmap) {
      // If we're hiding the heatmap, just toggle the state
      setShowHeatmap(false);
    } else {
      // If we're showing the heatmap, fetch all logs first
      await fetchAllTouristLogs();
      setShowHeatmap(true);
    }
  };

  const fetchTouristLogs = async (touristId: string) => {
    // If already open, close it
    if (openLogsId === touristId) {
      setOpenLogsId(null);
      return;
    }

    setLoadingLogs(touristId);
    
    try {
      const res = await fetch(`${API_URL}/get_logs/${touristId}`);
      
      // Check if the endpoint exists
      if (res.status === 404) {
        setError(t("errorLog"));
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data: TouristLog[] = await res.json();
        setTouristLogs(prev => ({ ...prev, [touristId]: data }));
        setOpenLogsId(touristId);
        setError(null);
      } else {
        const text = await res.text();
        throw new Error(`Expected JSON but got: ${text.substring(0, 100)}...`);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoadingLogs(null);
    }
  };

  const resolveSos = async (touristId: string) => {
    setResolvingSos(touristId);
    
    try {
      const res = await fetch(`${API_URL}/resolve_sos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tourist_id: touristId }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      // Update local state to reflect the resolved SOS
      setTourists(prev => ({
        ...prev,
        [touristId]: {
          ...prev[touristId],
          status: "normal"
        }
      }));
      
      // Also update the logs to show the resolution
      if (touristLogs[touristId]) {
        const updatedLogs = [...touristLogs[touristId]];
        // Add a resolution entry
        updatedLogs.push({
          tourist_id: touristId,
          lat: tourists[touristId].lat,
          lon: tourists[touristId].lon,
          timestamp: new Date().toISOString(),
          status: "normal"
        });
        setTouristLogs(prev => ({ ...prev, [touristId]: updatedLogs }));
      }
      
      setError(null);
    } catch (err) {
      console.error("Error resolving SOS:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setResolvingSos(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => setError(null)}
            className="absolute top-0 right-0 py-3 px-4"
          >
            ✕
          </button>
        </div>
      )}

      <main className="flex-1 flex flex-col sm:flex-row">
        <div className="flex-1 h-[50vh] sm:h-auto min-w-0">
          <MapWrapper 
            tourists={tourists} 
            showHeatmap={showHeatmap}
            heatmapData={heatmapData}
          />
        </div>

        <aside className="w-full sm:w-2/5 lg:w-1/3 bg-[#0f172a] border-t sm:border-l sm:border-t-0 shadow-inner p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg text-white">
              {t("activeTourists")}
            </h2>
            <button
              onClick={handleHeatmapToggle}
              disabled={loadingHeatmap}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                showHeatmap 
                  ? "bg-red-600 hover:bg-red-700 text-white" 
                  : "bg-gray-700 hover:bg-gray-600 text-gray-200"
              }`}
            >
              {loadingHeatmap ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t("loading")}
                </>
              ) : showHeatmap ? t("hideHeatmap") : t("showHeatmap")}
            </button>
          </div>
          
          {Object.entries(tourists).length === 0 ? (
            <p className="text-gray-400 italic text-sm">
              {t("noTourists")}
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(tourists).map(([id, data]) => (
                <div key={id}>
                  <div
                    className={`rounded-lg shadow-sm p-4 transition border ${
                      data.status === "normal"
                        ? "bg-gray-800 border-green-500"
                        : data.status === "anomaly"
                        ? "bg-gray-800 border-yellow-500"
                        : "bg-gray-800 border-red-500"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          <span className="font-bold">{t("id")}</span> {id}
                        </p>
                        {data.username && data.username !== "Unknown" && (
                          <p className="text-sm text-blue-300 truncate">
                            <span className="font-semibold">{t("user")}</span> {data.username}
                          </p>
                        )}
                        <p className="text-sm text-gray-300">
                          <span className="font-semibold">{t("location")}</span>{" "}
                          {data.lat.toFixed(4)}, {data.lon.toFixed(4)}
                        </p>
                        <p className="text-sm">
                          <span className="font-semibold text-gray-200">{t("status")}</span>{" "}
                          <span
                            className={`font-bold ${
                              data.status === "normal"
                                ? "text-green-400"
                                : data.status === "anomaly"
                                ? "text-yellow-400"
                                : "text-red-400"
                            }`}
                          >
                            {data.status.toUpperCase()}
                            {data.status === "sos" && (
                              <span className="ml-1 animate-pulse">🚨</span>
                            )}
                          </span>
                        </p>
                        <p className="text-sm text-gray-400">
                          {t("lastUpdate")} {new Date(data.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => fetchTouristLogs(id)}
                          disabled={loadingLogs === id}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition flex items-center justify-center gap-1 flex-shrink-0"
                        >
                          {loadingLogs === id ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              {t("loading")}
                            </>
                          ) : (
                            <>
                              {openLogsId === id ? t("hideLogs") : t("viewLogs")}
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${openLogsId === id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          )}
                        </button>
                        
                        {/* SOS Resolve Button - Only show for SOS status */}
                        {data.status === "sos" && (
                          <button
                            onClick={() => resolveSos(id)}
                            disabled={resolvingSos === id}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition flex items-center justify-center gap-1 flex-shrink-0"
                          >
                            {resolvingSos === id ? (
                              <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t("resolving")}
                              </>
                            ) : (
                              <>
                                {t("resolveSos")}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Logs Dropdown */}
                  {openLogsId === id && (
                    <div className="mt-2 bg-gray-900 rounded-lg p-3 border border-gray-700">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-white text-sm">
                          {t("activityLogsFor", { id })}
                        </h3>
                        <span className="text-xs text-gray-400">
                          {touristLogs[id]?.length || 0} {t("entries")}
                          {openLogsId === id && (
                            <span className="ml-2 text-green-400 animate-pulse">
                              ● {t("live")}
                            </span>
                          )}
                        </span>
                      </div>
                      
                      {touristLogs[id]?.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto">
                          <table className="w-full text-xs text-left text-gray-300">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-800 sticky top-0">
                              <tr>
                                <th className="px-2 py-2">{t("time")}</th>
                                <th className="px-2 py-2">{t("lat")}</th>
                                <th className="px-2 py-2">{t("lon")}</th>
                                <th className="px-2 py-2">{t("status")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {touristLogs[id].map((log, index) => (
                                <tr key={index} className="border-b border-gray-800 hover:bg-gray-800">
                                  <td className="px-2 py-2 whitespace-nowrap">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </td>
                                  <td className="px-2 py-2">{log.lat.toFixed(6)}</td>
                                  <td className="px-2 py-2">{log.lon.toFixed(6)}</td>
                                  <td className="px-2 py-2">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                                        log.status === "normal"
                                          ? "bg-green-900 text-green-300"
                                          : log.status === "anomaly"
                                          ? "bg-yellow-900 text-yellow-300"
                                          : "bg-red-900 text-red-300"
                                      }`}
                                    >
                                      {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-xs text-center py-4">
                          {t("noLogs")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
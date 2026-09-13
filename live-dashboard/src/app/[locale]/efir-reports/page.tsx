"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Dynamic import for the Map component to prevent SSR issues
const MiniMap = dynamic(() => import("@/components/MiniMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-800 animate-pulse rounded-lg flex items-center justify-center text-slate-500">Loading Map...</div>
});

export default function EfirReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch(`${API_URL}/get_efir_reports`);
        const data = await res.json();
        setReports(data);
      } catch (error) {
        console.error("Error fetching E-FIR reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
    // Poll every 5 seconds for new reports
    const interval = setInterval(fetchReports, 5000);
    return () => clearInterval(interval);
  }, [API_URL]);

  const handlePrintPDF = (report: any) => {
    try {
      const doc = new jsPDF();
      
      // Add Title
      doc.setFontSize(22);
      doc.setTextColor(220, 38, 38); // Red color
      doc.text("SafeSphere Police Authority", 105, 20, { align: "center" });
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Official E-FIR Report", 105, 30, { align: "center" });
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 38, { align: "center" });
      
      // Horizontal Line
      doc.setLineWidth(0.5);
      doc.line(14, 45, 196, 45);

      // Section: Report Info
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`FIR Number: ${report.firId}`, 14, 55);
      doc.text(`Status: ${report.status || "Filed"}`, 14, 62);
      doc.text(`Incident Timestamp: ${new Date(report.createdAt).toLocaleString()}`, 14, 69);

      // Victim Details Table
      autoTable(doc, {
        startY: 75,
        head: [['Victim Details', '']],
        body: [
          ['Name', report.victimName || "N/A"],
          ['Phone Number', report.victimPhone || "N/A"],
          ['Aadhaar Number', report.aadhaarNumber || "N/A"],
          ['Date of Birth', report.dateOfBirth || "N/A"],
          ['Email', report.victimEmail || "N/A"]
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175] },
        styles: { fontSize: 11, cellPadding: 4 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 75;

      // Incident Details Table
      autoTable(doc, {
        startY: finalY + 10,
        head: [['Incident Details', '']],
        body: [
          ['Tourist Tracker ID', report.touristId],
          ['Reason for Automation', report.reason],
          ['Last Known Latitude', report.lastKnownLat?.toFixed(6) || "N/A"],
          ['Last Known Longitude', report.lastKnownLon?.toFixed(6) || "N/A"]
        ],
        theme: 'grid',
        headStyles: { fillColor: [185, 28, 28] }, // Red header
        styles: { fontSize: 11, cellPadding: 4 }
      });

      const finalY2 = (doc as any).lastAutoTable.finalY || finalY + 50;

      // Footer / Signature line
      doc.setFontSize(10);
      doc.text("This is an automatically generated Electronic First Information Report (E-FIR).", 14, finalY2 + 20);
      doc.text("SafeSphere Automated Emergency System.", 14, finalY2 + 27);
      
      // Save PDF
      doc.save(`${report.firId}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Error generating PDF document.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-red-500 flex items-center">
              <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              Automated E-FIR Reports
            </h1>
            <p className="text-slate-400 mt-2">
              Official records of automatically filed First Information Reports for missing or endangered tourists.
            </p>
          </div>
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg font-medium">
            Confidential - Police Authority Use Only
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700">
            <svg className="w-16 h-16 text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <h2 className="text-xl font-semibold text-slate-300">No E-FIR Reports</h2>
            <p className="text-slate-400 mt-2">No missing persons or critical anomalies have triggered an automated FIR yet.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {reports.map((report) => (
              <div key={report.id} className="bg-slate-800 rounded-xl overflow-hidden border border-red-500/30 shadow-lg shadow-red-900/20">
                <div className="bg-red-900/40 px-6 py-4 border-b border-red-500/30 flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                      {report.status || "Filed"}
                    </span>
                    <h2 className="text-xl font-bold text-slate-100">{report.firId}</h2>
                  </div>
                  <div className="text-sm text-slate-300">
                    {new Date(report.createdAt).toLocaleString()}
                  </div>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-400 mb-4 border-b border-slate-700 pb-2">Victim Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Name:</span>
                        <span className="font-medium text-slate-200">{report.victimName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span className="font-medium text-slate-200">{report.victimPhone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Aadhaar Number:</span>
                        <span className="font-medium text-slate-200">{report.aadhaarNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date of Birth:</span>
                        <span className="font-medium text-slate-200">{report.dateOfBirth}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-blue-400 mb-4 border-b border-slate-700 pb-2">Incident Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tourist ID (Tracker):</span>
                        <span className="font-medium text-slate-200">{report.touristId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Last Known Lat:</span>
                        <span className="font-medium text-slate-200">{report.lastKnownLat?.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Last Known Lon:</span>
                        <span className="font-medium text-slate-200">{report.lastKnownLon?.toFixed(6)}</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <span className="block text-slate-400 mb-1">Reason for Automated Filing:</span>
                        <span className="text-red-400 font-medium">{report.reason}</span>
                      </div>
                      
                      {/* Interactive Mini-Map */}
                      <div className="mt-4 h-48 w-full rounded-lg overflow-hidden border border-slate-700 relative z-0">
                        {report.lastKnownLat && report.lastKnownLon ? (
                          <MiniMap lat={report.lastKnownLat} lon={report.lastKnownLon} />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-slate-800 text-slate-500 text-sm">Location Unavailable</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-800 px-6 py-4 border-t border-slate-700 flex justify-end">
                  <button 
                    onClick={() => handlePrintPDF(report)}
                    className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 hover:text-blue-400 text-white px-4 py-2 rounded transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                    </svg>
                    <span>Print E-FIR</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

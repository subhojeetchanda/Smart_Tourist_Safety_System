"use client";

import React from "react";
import Link from "next/link";
import { Map, Smartphone, ShieldCheck, Activity } from "lucide-react";

export default function PortalPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center px-6 py-12 font-sans relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-slate-900 bg-[radial-gradient(#2d3748_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

      {/* Header */}
      <header className="mb-16 text-center max-w-3xl z-10">
        <div className="inline-flex items-center justify-center space-x-2 bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-700 mb-6">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-slate-300">Unified Safety Platform</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-indigo-400 to-teal-300 text-transparent bg-clip-text leading-tight">
          Smart Tourist Safety System
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Select your portal to continue. The Government Official Dashboard provides real-time monitoring, while the App Simulator lets you generate test data and simulate tourist activity.
        </p>
      </header>

      {/* Portal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl z-10">
        
        {/* Live Dashboard Card */}
        <Link href="/authentication" className="group">
          <div className="h-full bg-slate-800/40 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all duration-500 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500 transform group-hover:scale-110">
              <Map className="w-32 h-32 text-blue-400" />
            </div>
            
            <div className="bg-blue-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border border-blue-500/30 group-hover:scale-110 transition-transform duration-500">
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4 group-hover:text-blue-300 transition-colors">Live Dashboard</h2>
            <p className="text-slate-400 text-lg mb-8 flex-1 leading-relaxed">
              Access the command center. Monitor live tourist locations, view real-time safety heatmaps, and respond instantly to SOS alerts and generated anomalies.
            </p>
            
            <div className="inline-flex items-center text-blue-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              Enter Dashboard
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>
        </Link>

        {/* App Simulator Card */}
        <Link href="/simulator" className="group">
          <div className="h-full bg-slate-800/40 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/50 hover:border-teal-500/50 hover:bg-slate-800/80 transition-all duration-500 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500 transform group-hover:scale-110">
              <Smartphone className="w-32 h-32 text-teal-400" />
            </div>
            
            <div className="bg-teal-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border border-teal-500/30 group-hover:scale-110 transition-transform duration-500">
              <Smartphone className="w-8 h-8 text-teal-400" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4 group-hover:text-teal-300 transition-colors">App Simulator</h2>
            <p className="text-slate-400 text-lg mb-8 flex-1 leading-relaxed">
              Test the system as a tourist. Create mock accounts, generate synthetic location data, trigger artificial anomalies, and raise simulated SOS alerts.
            </p>
            
            <div className="inline-flex items-center text-teal-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              Launch Simulator
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>
        </Link>

      </div>

      {/* Footer */}
      <footer className="mt-20 text-slate-500 text-sm z-10">
        © {new Date().getFullYear()} Smart Tourist Safety System. All Rights Reserved.
      </footer>
    </main>
  );
}
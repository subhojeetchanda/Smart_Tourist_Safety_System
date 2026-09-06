"use client";

import React from "react";

// --- Reusable UI Components ---

// A collection of SVG icons for the feature cards.
const ICONS = {
  map: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0 0v2.25m0-2.25h1.5M12 9m0 0v2.25m0-2.25h1.5m-1.5 0V6.75m0 4.5v3.75m-3.75-3.75h1.5m9-1.5V15m0 0v2.25m0-2.25h1.5m0 0V6.75m-1.5 9h-1.5m-3.75 0h1.5m-1.5 0V9m-3.75 6h1.5" />
    </svg>
  ),
  logs: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  ),
  heatmap: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.62a8.983 8.983 0 013.362-3.797A8.25 8.25 0 0115.362 5.214z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
    </svg>
  ),
  sos: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  alert: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  userAnomaly: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  signIn: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  )
};

// A reusable FeatureCard component to keep the main code DRY and readable.
type FeatureCardProps = {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  children: React.ReactNode;
  className?: string;
};

const FeatureCard = ({ icon, title, children, className = "" }: FeatureCardProps) => {
  const Icon = icon;
  return (
    <section className={`bg-slate-800/50 rounded-2xl p-6 shadow-lg border border-slate-700 hover:border-blue-500 transition-all duration-300 flex flex-col ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="bg-slate-700/50 p-2 rounded-lg">
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-100 mt-1">{title}</h2>
      </div>
      <div className="mt-4 text-slate-300 pl-14">
        {children}
      </div>
    </section>
  );
};


// --- Main Page Component ---

export default function LiveDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center px-6 py-12 font-sans">
      {/* Radial gradient for a subtle background effect */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-slate-900 bg-[radial-gradient(#2d3748_1px,transparent_1px)] [background-size:16px_16px]"></div>

      {/* Header */}
      <header className="mb-16 text-center">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-teal-300 text-transparent bg-clip-text">
          Smart Tourist Safety System
        </h1>
        <p className="text-lg text-slate-400">
          Live Dashboard - Monitoring & Control
        </p>
      </header>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-7xl">
        <FeatureCard icon={ICONS.map} title="Live Simulation">
          <p>View real-time tourist movements and activities on an interactive map.</p>
        </FeatureCard>

        <FeatureCard icon={ICONS.logs} title="Tourist Live Logs">
          <p>Monitor logs of all tourist activities and system interactions as they happen.</p>
        </FeatureCard>

        <FeatureCard icon={ICONS.heatmap} title="Tourist Heat Map">
          <p>Analyze tourist density and identify popular hotspots with a dynamic heat map.</p>
        </FeatureCard>
        
        <FeatureCard icon={ICONS.alert} title="Alert on Map">
          <p>Receive real-time anomaly alerts and SOS notifications directly on the map.</p>
        </FeatureCard>

        <FeatureCard icon={ICONS.userAnomaly} title="SOS / Anomaly Log">
          <p>Highlight tourists in distress with red ripples on the map and detailed log entries.</p>
        </FeatureCard>

        <FeatureCard icon={ICONS.sos} title="Resolve SOS">
          <button className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2">
            <span>Resolve Active SOS</span>
          </button>
        </FeatureCard>
        
        {/* Government Official Sign In - Spans three columns on large screens */}
        <div className="lg:col-span-3 w-full">
            <section className="bg-slate-800/50 rounded-2xl p-6 shadow-lg border border-slate-700 text-center">
                <h2 className="text-2xl font-semibold mb-4 text-slate-100">Government Official Access</h2>
                <p className="text-slate-400 mb-6 max-w-2xl mx-auto">Sign in to access advanced administrative controls, manage alerts, and communicate with security personnel.</p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-300 inline-flex items-center space-x-2">
                    <ICONS.signIn className="w-5 h-5" />
                    <span>Sign In</span>
                </button>
            </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 text-slate-500 text-sm">
        © {new Date().getFullYear()} Smart Tourist Safety System. All Rights Reserved.
      </footer>
    </main>
  );
}
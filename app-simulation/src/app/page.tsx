"use client";

import React from "react";

// --- Reusable UI Components ---

// A collection of SVG icons tailored for this page's features.
const ICONS = {
  score: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" />
    </svg>
  ),
  simulation: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962A3 3 0 013 10.5V18a3 3 0 01-2.121-5.228 9.094 9.094 0 002.63-1.31m1.5-3.033a9.094 9.094 0 00-2.63-1.31 3 3 0 012.121-5.228 9.094 9.094 0 003.741.479 3 3 0 014.682 2.72m-7.5 2.962h7.5" />
    </svg>
  ),
  sos: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  alert: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 100 15 7.5 7.5 0 000-15z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 10.5v.001" />
    </svg>
  ),
  userAuth: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
};

// Reusable FeatureCard component for consistency and clean code.
type FeatureCardProps = {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  children: React.ReactNode;
  className?: string;
};

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, children, className = "" }) => {
  const Icon = icon;
  return (
    <section className={`bg-slate-800/50 rounded-2xl p-6 shadow-lg border border-slate-700 hover:border-blue-500 transition-all duration-300 flex flex-col ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="bg-slate-700/50 p-2 rounded-lg">
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-100 mt-1">{title}</h2>
      </div>
      <div className="mt-4 text-slate-300 flex-grow flex flex-col">
        {children}
      </div>
    </section>
  );
};

// --- Main Page Component ---

export default function AppSimulatorPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center px-6 py-12 font-sans">
      {/* Subtle background grid pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-slate-900 bg-[radial-gradient(#2d3748_1px,transparent_1px)] [background-size:16px_16px]"></div>
      
      {/* Header */}
      <header className="mb-16 text-center">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-teal-300 text-transparent bg-clip-text">
          Smart Tourist Safety System
        </h1>
        <p className="text-lg text-slate-400">App Simulator - Landing Page</p>
      </header>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        <FeatureCard icon={ICONS.score} title="Live Safety Score">
          <p className="pl-14">Track real-time safety scores with detailed insights and metrics for any location.</p>
        </FeatureCard>

        <FeatureCard icon={ICONS.simulation} title="Tourist Simulation">
          <p className="pl-14">Simulate tourist movement, generate anomalies, and test system responses.</p>
        </FeatureCard>

        <FeatureCard icon={ICONS.alert} title="On-Screen Alerts">
          <p className="pl-14">Receive instant, high-visibility alerts on-screen whenever SOS or anomalies are detected.</p>
        </FeatureCard>

        <FeatureCard icon={ICONS.sos} title="Raise & Resolve SOS">
            {/* The content in this card is pushed to the bottom */}
           <div className="flex-grow flex items-end pl-14">
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-300">
                    Raise SOS
                    </button>
                    <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-300">
                    Resolve SOS
                    </button>
                </div>
           </div>
        </FeatureCard>

        {/* User Registration & Login - Spans full width */}
        <div className="md:col-span-2">
            <FeatureCard icon={ICONS.userAuth} title="User Registration & Login">
                <div className="pl-14">
                    <p className="mb-6">Access the tourist mobile application by registering for a new account or logging in with existing credentials.</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-300">
                        Register
                        </button>
                        <button className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-300">
                        Login
                        </button>
                    </div>
                </div>
            </FeatureCard>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 text-slate-500 text-sm">
        © {new Date().getFullYear()} Smart Tourist Safety System. All Rights Reserved.
      </footer>
    </main>
  );
}
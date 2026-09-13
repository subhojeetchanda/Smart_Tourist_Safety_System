"use client";

import React from "react";
import Link from "next/link";
import { Map, Smartphone, ShieldCheck, Activity } from "lucide-react";
import {useTranslations, useLocale} from 'next-intl';

export default function PortalPage() {
  const t = useTranslations('Dashboard');
  const locale = useLocale();

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center px-6 py-12 font-sans relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-slate-900 bg-[radial-gradient(#2d3748_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

      {/* Header */}
      <header className="mb-16 text-center max-w-3xl z-10">
        <div className="inline-flex items-center justify-center space-x-2 bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-700 mb-6">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-slate-300">{t('unifiedSafety')}</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-indigo-400 to-teal-300 text-transparent bg-clip-text leading-tight">
          {t('title')}
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {t('subtitle')}
        </p>
      </header>

      {/* Portal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl z-10">
        
        {/* Live Dashboard Card */}
        <Link href={`/${locale}/dashboard-info`} className="group">
          <div className="h-full bg-slate-800/40 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all duration-500 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500 transform group-hover:scale-110">
              <Map className="w-32 h-32 text-blue-400" />
            </div>
            
            <div className="bg-blue-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border border-blue-500/30 group-hover:scale-110 transition-transform duration-500">
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4 group-hover:text-blue-300 transition-colors">{t('liveDashboard')}</h2>
            <p className="text-slate-400 text-lg mb-8 flex-1 leading-relaxed">
              {t('liveDashboardDesc')}
            </p>
            
            <div className="inline-flex items-center text-blue-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              {t('enterDashboard')}
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>
        </Link>

        {/* App Simulator Card */}
        <a href={`/simulator/${locale}`} className="group">
          <div className="h-full bg-slate-800/40 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/50 hover:border-teal-500/50 hover:bg-slate-800/80 transition-all duration-500 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500 transform group-hover:scale-110">
              <Smartphone className="w-32 h-32 text-teal-400" />
            </div>
            
            <div className="relative z-10 flex-grow">
              <div className="bg-teal-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-teal-500/30 group-hover:bg-teal-500/30 transition-colors duration-500">
                <Smartphone className="w-8 h-8 text-teal-400" />
              </div>
              <h2 className="text-3xl font-bold mb-4 text-slate-100 group-hover:text-teal-300 transition-colors duration-300">{t('appSimulator')}</h2>
              <p className="text-slate-400 leading-relaxed mb-8">
                {t('appSimulatorDesc')}
              </p>
            </div>
            
            <div className="relative z-10 mt-auto pt-6 border-t border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="text-teal-400 font-medium hover:text-teal-300 inline-flex items-center space-x-1 group-hover:underline">
                  <span>{t('launchSimulator')}</span>
                  <span aria-hidden="true">&rarr;</span>
                </div>
              </div>
            </div>
          </div>
        </a>

      </div>

      {/* Footer */}
      <footer className="mt-20 text-slate-500 text-sm z-10">
        {t('footer', { year: new Date().getFullYear() })}
      </footer>
    </main>
  );
}
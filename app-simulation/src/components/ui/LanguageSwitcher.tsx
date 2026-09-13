"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChangeEvent } from "react";

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  // Simple locale extraction from the path
  const currentLocale = pathname.startsWith('/hi') ? 'hi' : 'en';

  const onSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = e.target.value;
    // Replace the current locale in the pathname
    const newPath = pathname.replace(`/${currentLocale}`, `/${nextLocale}`);
    
    // Fallback if the path didn't have a locale prefix (e.g. root '/')
    if (newPath === pathname) {
        router.push(`/${nextLocale}${pathname}`);
    } else {
        router.push(newPath);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Globe Icon */}
      <svg className="w-4 h-4 text-blue-400 absolute left-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      
      <select
        defaultValue={currentLocale}
        onChange={onSelectChange}
        className="appearance-none bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700/50 rounded-full py-2 pl-9 pr-8 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
      >
        <option value="en">English</option>
        <option value="hi">हिंदी</option>
      </select>

      {/* Dropdown Chevron */}
      <div className="absolute right-3 pointer-events-none flex items-center">
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
    </div>
  );
}

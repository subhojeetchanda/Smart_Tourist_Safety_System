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
    <div className="flex items-center space-x-2">
      <span className="text-xl">🌐</span>
      <select
        defaultValue={currentLocale}
        onChange={onSelectChange}
        className="bg-slate-800 text-white text-sm border border-slate-600 rounded p-1 outline-none focus:border-blue-500 transition-colors"
      >
        <option value="en">English</option>
        <option value="hi">हिंदी (Hindi)</option>
      </select>
    </div>
  );
}

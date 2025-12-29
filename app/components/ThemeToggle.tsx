'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/app/lib/ThemeContext';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="fixed top-4 right-4 z-50 p-3 bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm border border-amber-200/50 dark:border-emerald-700/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group hover:scale-110 active:scale-95"
            aria-label="Toggle theme"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? (
                <Moon className="w-5 h-5 text-emerald-700 group-hover:text-amber-600 transition-colors duration-300" />
            ) : (
                <Sun className="w-5 h-5 text-amber-400 group-hover:text-amber-300 transition-colors duration-300" />
            )}
        </button>
    );
}

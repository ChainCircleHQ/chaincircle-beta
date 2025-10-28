import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;

    // Remove all theme classes first
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem('theme', theme);

    // Dispatch custom event to notify other components (like wallet)
    window.dispatchEvent(new Event('themeChange'));
  }, [theme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const themes = [
    { name: 'light', icon: Sun, label: 'Light' },
    { name: 'dark', icon: Moon, label: 'Dark' },
    { name: 'system', icon: Monitor, label: 'System' }
  ];

  const currentTheme = themes.find(t => t.name === theme);
  const CurrentIcon = currentTheme.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-full border border-[#F4AEFF] bg-black/50 dark:bg-black/50 light:bg-white/80 backdrop-blur-md hover:bg-[#D548EC]/20 transition-all group"
        aria-label="Toggle theme"
      >
        <CurrentIcon
          size={20}
          className="text-[#F4AEFF] group-hover:text-[#D548EC] transition-colors"
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[400]"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 py-2 w-[140px] bg-[#111111] light:bg-white border border-[#F4AEFF] rounded-[12px] shadow-lg shadow-[#F4AEFF]/20 z-[500]">
            {themes.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.name}
                  onClick={() => {
                    setTheme(t.name);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    theme === t.name
                      ? 'bg-[#D548EC] text-white'
                      : 'text-gray-300 light:text-gray-700 hover:bg-[#D548EC]/20'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-[14px] font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

import React from 'react';
import { Screen, NavigationProps } from '../types';

interface BottomNavProps extends NavigationProps {
  activeScreen: Screen;
}

const BottomNav: React.FC<BottomNavProps> = ({ onNavigate, activeScreen }) => {
  const navItems = [
    { screen: Screen.DASHBOARD, label: 'Início', icon: 'dashboard' },
    { screen: Screen.FILTER, label: 'Questões', icon: 'quiz' }, // Mapping Questões to Filter for flow
    { screen: Screen.PERFORMANCE, label: 'Desempenho', icon: 'bar_chart' },
    { screen: Screen.SETTINGS, label: 'Ajustes', icon: 'settings' },
  ];

  return (
    <div className="absolute bottom-0 left-0 w-full bg-background-light/95 dark:bg-background-dark/95 backdrop-blur border-t border-gray-200 dark:border-gray-800 z-50">
      <div className="flex justify-around items-center h-16 w-full px-2">
        {navItems.map((item) => {
          const isActive = activeScreen === item.screen;
          return (
            <button
              key={item.label}
              onClick={() => onNavigate(item.screen)}
              className={`flex flex-col items-center justify-center w-full gap-1 transition-colors group ${isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
              <div className={`relative p-1 rounded-xl transition-colors ${isActive ? 'bg-primary/10' : 'group-hover:bg-slate-200 dark:group-hover:bg-slate-800'}`}>
                <span className={`material-symbols-outlined text-[24px] ${isActive ? 'fill-1' : ''}`}>
                  {item.icon}
                </span>
                {isActive && item.label === 'Ajustes' && (
                  <span className="absolute top-1 right-1 size-2 bg-primary rounded-full border border-background-dark"></span>
                )}
              </div>
              <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Safe area spacing for iOS home indicator */}
      <div className="h-[env(safe-area-inset-bottom,20px)]"></div>
    </div>
  );
};

export default BottomNav;

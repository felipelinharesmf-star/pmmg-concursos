import React from 'react';
import { Screen, NavigationProps } from '../types';

interface SidebarProps extends NavigationProps {
    activeScreen: Screen;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, activeScreen }) => {
    const navItems = [
        { screen: Screen.DASHBOARD, label: 'Início', icon: 'dashboard' },
        { screen: Screen.FILTER, label: 'Questões', icon: 'quiz' },
        { screen: Screen.PERFORMANCE, label: 'Desempenho', icon: 'bar_chart' },
        { screen: Screen.SETTINGS, label: 'Ajustes', icon: 'settings' },
    ];

    return (
        <div className="fixed top-0 left-0 bottom-0 w-[280px] bg-white border-r border-slate-200 flex flex-col z-50 hidden md:flex">
            <div className="h-16 flex items-center px-6 border-b border-slate-100">
                <span className="text-xl font-bold text-primary-600">PMMG Concursos</span>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = activeScreen === item.screen;
                    return (
                        <button
                            key={item.label}
                            onClick={() => onNavigate(item.screen)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left group ${isActive
                                ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[24px] ${isActive ? 'fill-1' : ''}`}>
                                {item.icon}
                            </span>
                            <span className="text-sm font-medium">
                                {item.label}
                            </span>
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-100">
                <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Plano Pro</p>
                    <p className="text-sm text-slate-700 mb-3">Tenha acesso a estatísticas detalhadas.</p>
                    <button className="w-full py-2 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors">
                        Assinar Agora
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;

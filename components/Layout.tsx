import React, { ReactNode } from 'react';
import { Screen } from '../types';
import BottomNav from './BottomNav';

interface LayoutProps {
    children: ReactNode;
    activeScreen: Screen;
    onNavigate: (screen: Screen, params?: any) => void;
    showBottomNav: boolean;
}

const Layout: React.FC<LayoutProps> = ({
    children,
    activeScreen,
    onNavigate,
    showBottomNav
}) => {
    return (
        <div className="app-container">
            {/* Main Content Area */}
            <div className="screen-wrapper">
                {children}
            </div>

            {/* Mobile Bottom Nav - Always rendered if showBottomNav is true */}
            {showBottomNav && (
                <div>
                    <BottomNav onNavigate={onNavigate} activeScreen={activeScreen} />
                </div>
            )}
        </div>
    );
};

export default Layout;

import React, { useState } from 'react';
import { MenuIcon, XIcon } from './icons';

type View = 'schedule' | 'calendar' | 'students' | 'payments' | 'settings';
interface HeaderProps {
  onNavigate: (view: View) => void;
  currentView: View;
}

const NavButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ onClick, isActive, children, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
          ? 'bg-blue-100 text-blue-800'
          : 'text-slate-600 hover:bg-slate-100'
        } ${className}`}
    >
      {children}
    </button>
  );
};


const Header: React.FC<HeaderProps> = ({ onNavigate, currentView }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavigate = (view: View) => {
    onNavigate(view);
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-700">Pilates Manager</h1>

          {/* Desktop Menu */}
          <nav className="hidden md:flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
            <NavButton onClick={() => handleNavigate('schedule')} isActive={currentView === 'schedule'}>
              Horario Semanal
            </NavButton>
            <NavButton onClick={() => handleNavigate('calendar')} isActive={currentView === 'calendar'}>
              Calendario Mensual
            </NavButton>
            <NavButton onClick={() => handleNavigate('students')} isActive={currentView === 'students'}>
              Alumnas
            </NavButton>
            <NavButton onClick={() => handleNavigate('payments')} isActive={currentView === 'payments'}>
              Pagos
            </NavButton>
            <NavButton onClick={() => handleNavigate('settings')} isActive={currentView === 'settings'}>
              Configuración
            </NavButton>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100 focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-slate-200 pt-4 animate-fade-in">
            <nav className="flex flex-col gap-2">
              <NavButton className="w-full text-left" onClick={() => handleNavigate('schedule')} isActive={currentView === 'schedule'}>
                Horario Semanal
              </NavButton>
              <NavButton className="w-full text-left" onClick={() => handleNavigate('calendar')} isActive={currentView === 'calendar'}>
                Calendario Mensual
              </NavButton>
              <NavButton className="w-full text-left" onClick={() => handleNavigate('students')} isActive={currentView === 'students'}>
                Alumnas
              </NavButton>
              <NavButton className="w-full text-left" onClick={() => handleNavigate('payments')} isActive={currentView === 'payments'}>
                Pagos
              </NavButton>
              <NavButton className="w-full text-left" onClick={() => handleNavigate('settings')} isActive={currentView === 'settings'}>
                Configuración
              </NavButton>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
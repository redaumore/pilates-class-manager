import React from 'react';

type View = 'schedule' | 'calendar' | 'students' | 'payments' | 'settings';
interface HeaderProps {
  onNavigate: (view: View) => void;
  currentView: View;
}

const NavButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}> = ({ onClick, isActive, children }) => {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'bg-teal-100 text-teal-800'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
};


const Header: React.FC<HeaderProps> = ({ onNavigate, currentView }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-teal-700 hidden sm:block">Pilates Manager</h1>
          <nav className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
             <NavButton onClick={() => onNavigate('schedule')} isActive={currentView === 'schedule'}>
                Horario Semanal
             </NavButton>
             <NavButton onClick={() => onNavigate('calendar')} isActive={currentView === 'calendar'}>
                Calendario Mensual
             </NavButton>
             <NavButton onClick={() => onNavigate('students')} isActive={currentView === 'students'}>
                Alumnas
             </NavButton>
             <NavButton onClick={() => onNavigate('payments')} isActive={currentView === 'payments'}>
                Pagos
             </NavButton>
             <NavButton onClick={() => onNavigate('settings')} isActive={currentView === 'settings'}>
                Configuración
             </NavButton>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
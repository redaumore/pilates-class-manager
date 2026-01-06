import React from 'react';
import { SignInButton } from '@clerk/clerk-react';

const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col font-sans">
            <header className="p-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-blue-800 tracking-tight">Pilates Manager</h1>
                <SignInButton mode="modal">
                    <button className="text-blue-600 font-semibold hover:text-blue-800 transition-colors">
                        Iniciar Sesión
                    </button>
                </SignInButton>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-3xl animate-fade-in-up">
                    <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-6">
                        Gestión Integral v1.0
                    </span>
                    <h2 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-8 leading-tight">
                        Simplifica tu estudio de <span className="text-blue-600">Pilates</span>
                    </h2>
                    <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Administra clases, pagos y estudiantes en un solo lugar.
                        Sincronizado automáticamente con Google Sheets para que nunca pierdas un dato.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <SignInButton mode="modal">
                            <button className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 shadow-blue-200">
                                Comenzar Ahora
                            </button>
                        </SignInButton>
                    </div>
                </div>

                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full text-left">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Agenda Inteligente</h3>
                        <p className="text-slate-600">Visualiza horarios semanales y mensuales. Gestiona cupos y asistencia con un clic.</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Control de Pagos</h3>
                        <p className="text-slate-600">Registro detallado de pagos mensuales. Sincronización directa con tu hoja de cálculo.</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Gestión de Alumnas</h3>
                        <p className="text-slate-600">Perfiles completos, historial de clases y seguimiento de recuperaciones.</p>
                    </div>
                </div>
            </main>

            <footer className="p-6 text-center text-slate-400 text-sm">
                © {new Date().getFullYear()} Pilates Class Manager. Todos los derechos reservados.
            </footer>
        </div>
    );
};

export default LandingPage;

import React from 'react';
import { SheetConfig } from '../services/googleSheetsService';

interface SheetSelectorProps {
    sheets: SheetConfig[];
    onSelect: (sheetId: string) => void;
    isOpen: boolean;
}

const SheetSelector: React.FC<SheetSelectorProps> = ({ sheets, onSelect, isOpen }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all p-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">
                    Bienvenido
                </h2>
                <p className="text-slate-500 mb-6 text-center">
                    Por favor selecciona la planilla que deseas administrar.
                </p>

                <div className="space-y-3">
                    {sheets.map((sheet) => (
                        <button
                            key={sheet.id}
                            onClick={() => onSelect(sheet.id)}
                            className="w-full text-left px-4 py-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:shadow-md transition-all duration-200 group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-800 group-hover:text-blue-700">
                                        {sheet.name}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">ID: ...{sheet.id.slice(-6)}</p>
                                </div>
                                <div className="text-slate-300 group-hover:text-blue-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14"></path>
                                        <path d="m12 5 7 7-7 7"></path>
                                    </svg>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="mt-6 text-center">
                    <span className="text-xs text-slate-400">Pilates Class Manager by Rolo</span>
                </div>
            </div>
        </div>
    );
};

export default SheetSelector;

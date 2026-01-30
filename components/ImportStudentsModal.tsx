
import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { loadStudentsByYear } from '../services/googleSheetsService';
import Modal from './Modal';
import { SearchIcon, UserGroupIcon, LoadingIcon } from './icons';

interface ImportStudentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (selectedStudents: Student[]) => Promise<void>;
    currentYear: string;
    existingStudentIds: string[];
}

const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
    isOpen,
    onClose,
    onImport,
    currentYear,
    existingStudentIds,
}) => {
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const previousYear = (parseInt(currentYear) - 1).toString();

    useEffect(() => {
        if (isOpen) {
            fetchPreviousYearStudents();
            setSelectedIds(new Set());
            setSearchTerm('');
        }
    }, [isOpen]);

    const fetchPreviousYearStudents = async () => {
        setLoading(true);
        try {
            const data = await loadStudentsByYear(previousYear);
            setStudents(data);
        } catch (error) {
            console.error('Error fetching students for import:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStudent = (id: string) => {
        if (existingStudentIds.includes(id)) return;
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleAll = () => {
        const selectableStudents = filteredStudents.filter(s => !existingStudentIds.includes(s.id));
        if (selectedIds.size === selectableStudents.length && selectableStudents.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(selectableStudents.map(s => s.id)));
        }
    };

    const handleImport = async () => {
        if (selectedIds.size === 0) return;
        setImporting(true);
        try {
            const selectedStudents = students.filter(s => selectedIds.has(s.id));
            await onImport(selectedStudents);
            onClose();
        } catch (error) {
            console.error('Error during import:', error);
        } finally {
            setImporting(false);
        }
    };

    const filteredStudents = students.filter(s =>
        `${s.nombre} ${s.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectableCount = filteredStudents.filter(s => !existingStudentIds.includes(s.id)).length;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Importar Alumnas de ${previousYear}`} size="lg">
            <div className="flex flex-col gap-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar alumna..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <SearchIcon className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                </div>

                <div className="max-h-[50vh] overflow-y-auto border border-slate-100 rounded-lg">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <LoadingIcon className="w-8 h-8 animate-spin mb-2" />
                            <span>Cargando alumnas de {previousYear}...</span>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            No se encontraron alumnas en el año {previousYear}.
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left">
                                        <input
                                            type="checkbox"
                                            className="rounded text-blue-500 focus:ring-blue-500 cursor-pointer"
                                            checked={selectedIds.size === selectableCount && selectableCount > 0}
                                            onChange={toggleAll}
                                        />
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Plan</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {filteredStudents.map((student) => {
                                    const isExisting = existingStudentIds.includes(student.id);
                                    return (
                                        <tr
                                            key={student.id}
                                            className={`${isExisting ? 'opacity-50 bg-slate-50' : 'hover:bg-blue-50 cursor-pointer'}`}
                                            onClick={() => !isExisting && toggleStudent(student.id)}
                                        >
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    className="rounded text-blue-500 focus:ring-blue-500 cursor-pointer"
                                                    checked={selectedIds.has(student.id)}
                                                    onChange={() => { }} // Handled by tr onClick
                                                    disabled={isExisting}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                {student.nombre} {student.apellido}
                                                {isExisting && <span className="ml-2 text-xs text-blue-600 font-medium">(Ya importada)</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500">Plan {student.plan}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs rounded-full ${student.estado === 'Activa' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {student.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-slate-500">
                        {selectedIds.size} seleccionada(s)
                    </span>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={selectedIds.size === 0 || importing}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {importing && <LoadingIcon className="w-4 h-4 animate-spin" />}
                            {importing ? 'Importando...' : 'Importar seleccionadas'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ImportStudentsModal;

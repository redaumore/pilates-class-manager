import React, { useState, useMemo } from 'react';
import { Student, Class } from '../types';
import Modal from './Modal';
import { LEVEL_HIERARCHY } from '../constants';

interface AssignClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentSelected: (student: Student) => void;
  classData: Class | null;
  allStudents: Student[];
  date: string;
}

const AssignClassModal: React.FC<AssignClassModalProps> = ({ isOpen, onClose, onStudentSelected, classData, allStudents, date }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyRecovery, setShowOnlyRecovery] = useState(false);

  const { availableStudents, classLevelNum } = useMemo(() => {
    if (!classData || !date) {
      return { availableStudents: [], classLevelNum: -1 };
    }

    const absentStudentIds = new Set(
      (classData.absences ?? []).filter(a => a.date === date).map(a => a.studentId)
    );

    const permanentStudentIds = new Set(
      classData.bookings
        .filter(b => b.startDate <= date)
        .map(b => b.studentId)
        .filter(id => !absentStudentIds.has(id))
    );

    const oneTimeStudentIds = new Set(
      (classData.oneTimeBookings ?? []).filter(b => b.date === date).map(b => b.studentId)
    );

    const presentStudentIds = new Set([...permanentStudentIds, ...oneTimeStudentIds]);

    const filteredAvailable = allStudents
      .filter(s => !presentStudentIds.has(s.id))
      .filter(s => `${s.nombre} ${s.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(s => !showOnlyRecovery || s.clases_recuperacion > 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    const presentStudents = allStudents.filter(s => presentStudentIds.has(s.id));

    const currentClassLevelNum = presentStudents.length > 0
      ? presentStudents.reduce((max, s) => Math.max(max, LEVEL_HIERARCHY[s.nivel]), -1)
      : -1;

    return { availableStudents: filteredAvailable, classLevelNum: currentClassLevelNum };

  }, [classData, allStudents, searchTerm, date, showOnlyRecovery]);


  if (!classData) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Añadir Alumna a la Clase">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Buscar alumna..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showOnlyRecovery"
            checked={showOnlyRecovery}
            onChange={(e) => setShowOnlyRecovery(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="showOnlyRecovery" className="text-sm text-slate-700 select-none cursor-pointer">
            Mostrar solo alumnas con clases a recuperar
          </label>
        </div>

        <div className="max-h-[50vh] overflow-y-auto space-y-2">
          {availableStudents.length > 0 ? (
            availableStudents.map(student => {
              const studentLevelNum = LEVEL_HIERARCHY[student.nivel];
              const isLevelCompatible = classLevelNum === -1 || studentLevelNum >= classLevelNum - 1;

              return (
                <div key={student.id} className={`flex items-center justify-between p-3 rounded-lg ${!isLevelCompatible ? 'bg-orange-50' : 'bg-slate-50'}`}>
                  <div>
                    <p className="font-semibold text-slate-800">{student.nombre} {student.apellido}</p>
                    <p className={`text-sm ${!isLevelCompatible ? 'text-orange-600' : 'text-slate-500'}`}>
                      Nivel: {student.nivel} {!isLevelCompatible && "(Advertencia de nivel)"}
                    </p>
                  </div>
                  <button
                    onClick={() => onStudentSelected(student)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Añadir
                  </button>
                </div>
              );
            })
          ) : (
            <p className="text-center text-slate-500 py-8">No hay alumnas disponibles para añadir.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AssignClassModal;
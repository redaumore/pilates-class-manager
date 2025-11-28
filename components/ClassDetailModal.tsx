import React, { useMemo, useState } from 'react';
import { Class, Student } from '../types';
import Modal from './Modal';
import RemoveStudentModal from './RemoveStudentModal';
import { LEVEL_HIERARCHY, MAX_CAPACITY } from '../constants';
import { UserIcon, XCircleIcon, PlusIcon } from './icons';

interface ClassDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: Class | null;
  allStudents: Student[];
  onUnbook: (studentId: string, classId: string, date: string) => void;
  onUnbookForDay: (studentId: string, classId: string, date: string, withMakeup: boolean) => void;
  onToggleCancel: (classId: string) => void;
  onAddStudent: () => void;
  date?: string;
}

const ClassDetailModal: React.FC<ClassDetailModalProps> = ({ isOpen, onClose, classData, allStudents, onUnbook, onUnbookForDay, onToggleCancel, onAddStudent, date }) => {
  const [isRemoveModalOpen, setRemoveModalOpen] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);

  const bookedStudents = useMemo(() => {
    if (!classData || !date) return [];

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

    const allPresentIds = new Set([...permanentStudentIds, ...oneTimeStudentIds]);

    return Array.from(allPresentIds)
      .map(id => allStudents.find(s => s.id === id))
      .filter((s): s is Student => !!s);
  }, [classData, allStudents, date]);

  const classLevelNum = useMemo(() => {
    if (!bookedStudents.length) return -1;
    return bookedStudents.reduce((maxLevel, s) => Math.max(maxLevel, LEVEL_HIERARCHY[s.nivel]), -1);
  }, [bookedStudents]);

  if (!classData) return null;

  const handleOpenRemoveModal = (student: Student) => {
    setStudentToRemove(student);
    setRemoveModalOpen(true);
  };

  const handleCloseRemoveModal = () => {
    setStudentToRemove(null);
    setRemoveModalOpen(false);
  };

  const handleRemovePermanently = () => {
    if (studentToRemove && classData && date) {
      onUnbook(studentToRemove.id, classData.id, date);
    }
    handleCloseRemoveModal();
  };

  const handleRemoveForDay = (withMakeup: boolean) => {
    if (studentToRemove && classData && date) {
      onUnbookForDay(studentToRemove.id, classData.id, date, withMakeup);
    }
    handleCloseRemoveModal();
  };

  const hasCapacity = bookedStudents.length < MAX_CAPACITY;

  const formattedDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    : classData.day;
  const title = `Clase del ${formattedDate} a las ${classData.time}:00h`;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <div className="space-y-4">
          {classData.isCancelled ? (
            <div className="p-4 bg-red-100 text-red-800 rounded-lg text-center font-semibold">
              Esta clase está CANCELADA.
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-semibold text-slate-700">Alumnas en clase</h3>
                <div className="flex items-center gap-2 text-slate-600">
                  <UserIcon className="w-5 h-5" />
                  <span>{bookedStudents.length} / {MAX_CAPACITY}</span>
                </div>
              </div>
              {bookedStudents.length > 0 ? (
                <ul className="space-y-2">
                  {bookedStudents.map(student => {
                    const studentLevelNum = LEVEL_HIERARCHY[student.nivel];
                    const isLevelCompatible = classLevelNum === -1 || studentLevelNum >= classLevelNum - 1;
                    return (
                      <li key={student.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                        <div>
                          <p className="text-slate-800">{student.nombre} {student.apellido}</p>
                          <p className={`text-sm ${isLevelCompatible ? 'text-slate-500' : 'text-orange-600 font-semibold'}`}>
                            Nivel: {student.nivel} {!isLevelCompatible && "(Advertencia de nivel)"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenRemoveModal(student)}
                          className="p-1 text-red-500 hover:bg-red-100 rounded-full"
                          title="Quitar de la clase"
                        >
                          <XCircleIcon className="w-5 h-5" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-slate-500 italic text-center py-4">No hay alumnas en esta clase.</p>
              )}
            </div>
          )}
          <div className="pt-4 mt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
            <button
              onClick={onAddStudent}
              disabled={!hasCapacity || classData.isCancelled}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors order-1 sm:order-none"
            >
              <PlusIcon className="w-5 h-5" />
              Añadir Alumna
            </button>
            <button
              onClick={() => onToggleCancel(classData.id)}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-white font-semibold ${classData.isCancelled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} order-2 sm:order-none`}
            >
              {classData.isCancelled ? 'Reactivar Clase' : 'Cancelar Clase'}
            </button>
          </div>
        </div>
      </Modal>
      {studentToRemove && (
        <RemoveStudentModal
          isOpen={isRemoveModalOpen}
          onClose={handleCloseRemoveModal}
          student={studentToRemove}
          onRemovePermanently={handleRemovePermanently}
          onRemoveForDay={handleRemoveForDay}
        />
      )}
    </>
  );
};

export default ClassDetailModal;
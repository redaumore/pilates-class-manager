import React from 'react';
import { Student, Class } from '../types';
import Modal from './Modal';
import { MAX_CAPACITY } from '../constants';

interface AssignStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  classData: Class;
  onAssignPermanently: () => void;
  onAssignForDay: () => void;
  currentBookingsCount: number;
  isSaving?: boolean;
}

const AssignStudentModal: React.FC<AssignStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  classData,
  onAssignPermanently,
  onAssignForDay,
  currentBookingsCount,
  isSaving = false
}) => {
  const isPermanentBookingPossible = classData.bookings.length < MAX_CAPACITY;
  const isPlanFull = currentBookingsCount >= student.plan;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Añadir a ${student.nombre} ${student.apellido}`}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-slate-600">¿Cómo quieres añadir a esta alumna a la clase?</p>

        <div className="space-y-3 flex flex-col items-stretch">
          <button
            onClick={onAssignPermanently}
            disabled={!isPermanentBookingPossible || isPlanFull || isSaving}
            className="w-full text-left p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-400 group relative overflow-hidden"
          >
            <div className={`font-semibold text-slate-800 ${isSaving ? 'opacity-50' : ''}`}>Permanente (esta y futuras clases)</div>
            <div className={`text-sm text-slate-600 ${isSaving ? 'opacity-50' : ''}`}>
              La alumna será inscrita en esta clase en el horario recurrente.
              {!isPermanentBookingPossible && <span className="font-semibold text-red-600"> (Clase llena)</span>}
              {isPlanFull && <span className="font-semibold text-red-600"> (Alumna con cupo por plan completo)</span>}
            </div>
          </button>

          <button
            onClick={onAssignForDay}
            disabled={student.clases_recuperacion <= 0 || isSaving}
            className="w-full text-left p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <div className={`font-semibold text-slate-800 ${isSaving ? 'opacity-50' : ''}`}>Solo por hoy</div>
            <div className={`text-sm text-slate-600 ${isSaving ? 'opacity-50' : ''}`}>
              La alumna asistirá solo a la clase de hoy. Su plaza no se reserva para futuras semanas.
              <br />
              <span className={student.clases_recuperacion > 0 ? "text-blue-600 font-medium" : "text-slate-500"}>
                Clases disponibles para recuperar: {student.clases_recuperacion}
              </span>
              {student.clases_recuperacion <= 0 && <span className="font-semibold text-red-600"> (Sin clases para recuperar)</span>}
            </div>
          </button>
        </div>

        {isSaving && (
          <div className="text-center py-2">
            <p className="text-blue-600 text-sm font-medium animate-pulse">Guardando...</p>
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignStudentModal;
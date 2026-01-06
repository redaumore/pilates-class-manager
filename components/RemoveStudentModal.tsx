import React from 'react';
import { Student } from '../types';
import Modal from './Modal';

interface RemoveStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  onRemovePermanently: () => void;
  onRemoveForDay: (withMakeup: boolean) => void;
  isSaving?: boolean;
}

const RemoveStudentModal: React.FC<RemoveStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  onRemovePermanently,
  onRemoveForDay,
  isSaving = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Quitar a ${student.nombre} ${student.apellido}`}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-slate-600">¿Cómo quieres quitar a esta alumna de la clase?</p>

        <div className="space-y-3 flex flex-col items-stretch">
          <button
            onClick={onRemovePermanently}
            disabled={isSaving}
            className="w-full text-left p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className={`font-semibold text-slate-800 ${isSaving ? 'opacity-50' : ''}`}>Eliminar de esta y futuras clases</div>
            <div className={`text-sm text-slate-600 ${isSaving ? 'opacity-50' : ''}`}>La alumna será eliminada permanentemente de esta clase en el horario.</div>
          </button>

          <button
            onClick={() => onRemoveForDay(false)}
            disabled={isSaving}
            className="w-full text-left p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className={`font-semibold text-slate-800 ${isSaving ? 'opacity-50' : ''}`}>Solo por hoy (sin recupero)</div>
            <div className={`text-sm text-slate-600 ${isSaving ? 'opacity-50' : ''}`}>La alumna no asistirá hoy, pero su reserva para futuras clases se mantiene. No se añade una clase de recuperación.</div>
          </button>

          <button
            onClick={() => onRemoveForDay(true)}
            disabled={isSaving}
            className="w-full text-left p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className={`font-semibold text-slate-800 ${isSaving ? 'opacity-50' : ''}`}>Solo por hoy (con recupero)</div>
            <div className={`text-sm text-slate-600 ${isSaving ? 'opacity-50' : ''}`}>La alumna no asistirá hoy y se le sumará 1 clase a su contador de recuperación.</div>
          </button>
        </div>

        {isSaving && (
          <div className="text-center py-2">
            <p className="text-red-600 text-sm font-medium animate-pulse">Procesando baja...</p>
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RemoveStudentModal;

import React from 'react';
import { Student } from '../types';
import Modal from './Modal';

interface RemoveStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  onRemovePermanently: () => void;
  onRemoveForDay: (withMakeup: boolean) => void;
}

const RemoveStudentModal: React.FC<RemoveStudentModalProps> = ({ 
  isOpen, 
  onClose, 
  student, 
  onRemovePermanently, 
  onRemoveForDay 
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
            className="w-full text-left p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <div className="font-semibold text-slate-800">Eliminar de esta y futuras clases</div>
            <div className="text-sm text-slate-600">La alumna será eliminada permanentemente de esta clase en el horario.</div>
          </button>

          <button
            onClick={() => onRemoveForDay(false)}
            className="w-full text-left p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <div className="font-semibold text-slate-800">Solo por hoy (sin recupero)</div>
            <div className="text-sm text-slate-600">La alumna no asistirá hoy, pero su reserva para futuras clases se mantiene. No se añade una clase de recuperación.</div>
          </button>
          
          <button
            onClick={() => onRemoveForDay(true)}
            className="w-full text-left p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <div className="font-semibold text-slate-800">Solo por hoy (con recupero)</div>
            <div className="text-sm text-slate-600">La alumna no asistirá hoy y se le sumará 1 clase a su contador de recuperación.</div>
          </button>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RemoveStudentModal;

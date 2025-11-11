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
}

const AssignStudentModal: React.FC<AssignStudentModalProps> = ({ 
  isOpen, 
  onClose, 
  student, 
  classData,
  onAssignPermanently, 
  onAssignForDay 
}) => {
  const isPermanentBookingPossible = classData.bookings.length < MAX_CAPACITY;

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
            disabled={!isPermanentBookingPossible}
            className="w-full text-left p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <div className="font-semibold text-slate-800">Permanente (esta y futuras clases)</div>
            <div className="text-sm text-slate-600">
              La alumna será inscrita en esta clase en el horario recurrente.
              {!isPermanentBookingPossible && <span className="font-semibold text-red-600"> (Clase llena)</span>}
            </div>
          </button>

          <button
            onClick={onAssignForDay}
            className="w-full text-left p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <div className="font-semibold text-slate-800">Solo por hoy</div>
            <div className="text-sm text-slate-600">La alumna asistirá solo a la clase de hoy. Su plaza no se reserva para futuras semanas.</div>
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

export default AssignStudentModal;
import React, { useState, useEffect } from 'react';
import { Student, Level, Plan } from '../types';
import Modal from './Modal';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Student) => void;
  studentToEdit?: Student | null;
}

const StudentFormModal: React.FC<StudentFormModalProps> = ({ isOpen, onClose, onSave, studentToEdit }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    nivel: Level.Basico,
    plan: 1 as Plan,
    clases_recuperacion: 0,
  });

  useEffect(() => {
    if (studentToEdit) {
      setFormData({
        nombre: studentToEdit.nombre,
        apellido: studentToEdit.apellido,
        telefono: studentToEdit.telefono,
        nivel: studentToEdit.nivel,
        plan: studentToEdit.plan || 1,
        clases_recuperacion: studentToEdit.clases_recuperacion || 0,
      });
    } else {
      setFormData({
        nombre: '',
        apellido: '',
        telefono: '',
        nivel: Level.Basico,
        plan: 1,
        clases_recuperacion: 0,
      });
    }
  }, [studentToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number = value;

    // Convert to uppercase for nombre and apellido
    if (name === 'nombre' || name === 'apellido') {
      processedValue = value.toUpperCase();
    } else if (name === 'plan' || name === 'clases_recuperacion') {
      processedValue = parseInt(value, 10);
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const studentData: Student = {
      id: studentToEdit?.id || `student-${new Date().getTime()}`,
      fecha_inscripcion: studentToEdit?.fecha_inscripcion || new Date().toISOString().split('T')[0],
      ...formData,
      plan: formData.plan as Plan,
    };
    onSave(studentData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={studentToEdit ? 'Editar Alumna' : 'Nueva Alumna'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-slate-700">Nombre</label>
          <input type="text" name="nombre" id="nombre" value={formData.nombre} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="apellido" className="block text-sm font-medium text-slate-700">Apellido</label>
          <input type="text" name="apellido" id="apellido" value={formData.apellido} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-slate-700">Teléfono</label>
          <input type="tel" name="telefono" id="telefono" value={formData.telefono} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="nivel" className="block text-sm font-medium text-slate-700">Nivel</label>
          <select name="nivel" id="nivel" value={formData.nivel} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            {Object.values(Level).map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="plan" className="block text-sm font-medium text-slate-700">Plan</label>
          <select name="plan" id="plan" value={formData.plan} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>
        <div>
          <label htmlFor="clases_recuperacion" className="block text-sm font-medium text-slate-700">Clases de Recuperación</label>
          <input
            type="number"
            name="clases_recuperacion"
            id="clases_recuperacion"
            value={formData.clases_recuperacion}
            onChange={handleChange}
            min="0"
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3">
          <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 order-2 sm:order-1">
            Cancelar
          </button>
          <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 order-1 sm:order-2">
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StudentFormModal;
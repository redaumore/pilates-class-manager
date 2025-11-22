import React, { useState } from 'react';
import { Student } from '../types';
import { PencilIcon, TrashIcon, PlusIcon, WhatsAppIcon } from './icons';

interface StudentManagementPageProps {
  students: Student[];
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
}

const StudentManagementPage: React.FC<StudentManagementPageProps> = ({ students, onAddStudent, onEditStudent, onDeleteStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredStudents = students.filter(s => 
    `${s.nombre} ${s.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const handleWhatsAppClick = (student: Student) => {
    const message = encodeURIComponent(`¡Hola ${student.nombre}! Te escribo sobre tus clases de pilates.`);
    window.open(`https://wa.me/${student.telefono}?text=${message}`, '_blank');
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-blue-800">Gestión de Alumnas</h2>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-4">
            <input 
              type="text"
              placeholder="Buscar alumna..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={onAddStudent}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Nueva Alumna</span>
            </button>
        </div>
      </div>

      <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
        {filteredStudents.length > 0 ? (
          <ul className="space-y-3">
            {filteredStudents.map(student => (
              <li key={student.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-lg gap-3">
                <div className="flex-grow">
                  <p className="font-semibold text-slate-800">{student.nombre} {student.apellido}</p>
                  <p className="text-sm text-slate-500">{student.telefono} &bull; Nivel: {student.nivel} &bull; Plan: {student.plan} &bull; Recuperaciones: {student.clases_recuperacion}</p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button onClick={() => handleWhatsAppClick(student)} title="Contactar por WhatsApp" className="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors">
                    <WhatsAppIcon className="w-5 h-5" />
                  </button>
                   <button onClick={() => onEditStudent(student)} title="Editar" className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors">
                    <PencilIcon className="w-5 h-5" />
                  </button>
                   <button onClick={() => onDeleteStudent(student.id)} title="Eliminar" className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-slate-500 py-12">No se encontraron alumnas.</p>
        )}
      </div>
    </div>
  );
};

export default StudentManagementPage;
import React, { useState, useMemo } from 'react';
import { Student, PaymentRecord, PlanCosts } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import PaymentDateModal from './PaymentDateModal';

interface PaymentsPageProps {
  students: Student[];
  payments: PaymentRecord;
  planCosts: PlanCosts;
  onMarkPayment: (studentId: string, monthYear: string, date: string) => void;
  onUndoPayment: (studentId: string, monthYear: string) => void;
}

const PaymentsPage: React.FC<PaymentsPageProps> = ({ students, payments, planCosts, onMarkPayment, onUndoPayment }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const changeMonth = (amount: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const handleOpenPaymentModal = (student: Student) => {
    setSelectedStudent(student);
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (date: string) => {
    if (selectedStudent) {
        onMarkPayment(selectedStudent.id, monthYear, date);
    }
    setIsPaymentModalOpen(false);
    setSelectedStudent(null);
  };

  const monthYear = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;

  const { totalCollected, totalPotential } = useMemo(() => {
    let collected = 0;
    let potential = 0;

    for (const student of students) {
        const cost = planCosts[student.plan] || 0;
        potential += cost;

        const hasPaid = !!payments[student.id]?.[monthYear];
        if (hasPaid) {
            collected += cost;
        }
    }
    return { totalCollected: collected, totalPotential: potential };
  }, [students, payments, planCosts, viewDate]);

  const today = new Date();
  const isCurrentMonth = viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth();
  const isPastDeadline = isCurrentMonth && today.getDate() > 10;

  const filteredStudents = students.filter(s => 
    `${s.nombre} ${s.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(s => {
    if (!showOnlyUnpaid) {
        return true;
    }
    const paymentDate = payments[s.id]?.[monthYear];
    return !paymentDate;
  }).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
  }

  return (
    <>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-blue-800">Gestión de Pagos</h2>
          
          <div className="w-full sm:w-auto flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                <ChevronLeftIcon className="w-6 h-6 text-slate-600" />
              </button>
              <h3 className="text-lg font-semibold text-blue-700 w-48 text-center capitalize">
                {viewDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                <ChevronRightIcon className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <input 
                type="text"
                placeholder="Buscar alumna..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-48 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
               <div className="flex items-center whitespace-nowrap">
                <input
                  type="checkbox"
                  id="unpaid-filter"
                  checked={showOnlyUnpaid}
                  onChange={(e) => setShowOnlyUnpaid(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="unpaid-filter" className="ml-2 block text-sm text-slate-700">
                  Mostrar solo pendientes
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-r-lg mb-6" role="alert">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <p className="font-bold text-lg">Resumen del Mes</p>
                <div className="text-right">
                    <p className="text-sm">Recaudado</p>
                    <p className="text-2xl font-bold">${totalCollected.toLocaleString('es-ES')}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm">Potencial</p>
                    <p className="text-2xl font-bold">${totalPotential.toLocaleString('es-ES')}</p>
                </div>
            </div>
        </div>

        <div className="max-h-[calc(100vh-370px)] overflow-y-auto">
          {filteredStudents.length > 0 ? (
            <ul className="space-y-3">
              {filteredStudents.map(student => {
                const paymentDate = payments[student.id]?.[monthYear];
                const isPaid = !!paymentDate;
                const isLate = !isPaid && isPastDeadline;

                let bgColor = 'bg-slate-50';
                if (isPaid) bgColor = 'bg-green-50';
                if (isLate) bgColor = 'bg-red-50';

                return (
                  <li key={student.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg gap-3 transition-colors ${bgColor}`}>
                    <div className="flex-grow">
                      <p className="font-semibold text-slate-800">{student.nombre} {student.apellido}</p>
                      <p className="text-sm text-slate-500">Plan: {student.plan}</p>
                    </div>
                    <div className="flex items-center gap-4 self-end sm:self-center w-full sm:w-auto">
                      {isPaid ? (
                        <div className="flex-grow text-center sm:text-right">
                          <p className="text-sm font-semibold text-green-700">Pagado el: {formatDate(paymentDate)}</p>
                        </div>
                      ) : isLate ? (
                          <div className="flex-grow text-center sm:text-right">
                              <p className="text-sm font-semibold text-red-700">Pago Atrasado</p>
                          </div>
                      ) : (
                          <div className="flex-grow text-center sm:text-right">
                            <p className="text-sm text-slate-600">Pendiente de Pago</p>
                          </div>
                      )}
                      
                      {isPaid ? (
                        <button onClick={() => onUndoPayment(student.id, monthYear)} className="px-3 py-1 bg-slate-400 text-white text-xs rounded-md hover:bg-slate-500 w-full sm:w-auto">
                          Deshacer
                        </button>
                      ) : (
                        <button onClick={() => handleOpenPaymentModal(student)} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 w-full sm:w-auto">
                          Marcar Pago
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-center text-slate-500 py-12">No se encontraron alumnas con los filtros seleccionados.</p>
          )}
        </div>
      </div>
      {selectedStudent && (
          <PaymentDateModal 
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            onSave={handleSavePayment}
            studentName={`${selectedStudent.nombre} ${selectedStudent.apellido}`}
          />
      )}
    </>
  );
};

export default PaymentsPage;
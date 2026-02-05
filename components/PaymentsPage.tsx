import React, { useState, useMemo } from 'react';
import { Student, PaymentRecord, PlanCosts } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeSlashIcon } from './icons';
import PaymentDateModal from './PaymentDateModal';

interface PaymentsPageProps {
  students: Student[];
  payments: PaymentRecord;
  planCosts: PlanCosts;
  onMarkPayment: (studentId: string, monthYear: string, date: string) => void;
  onUndoPayment: (studentId: string, monthYear: string) => void;
  isSaving?: boolean;
}

const PaymentsPage: React.FC<PaymentsPageProps> = ({ students, payments, planCosts, onMarkPayment, onUndoPayment, isSaving = false }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAmounts, setShowAmounts] = useState(false);


  const changeMonth = (amount: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const handleOpenPaymentModal = (student: Student) => {
    if (isSaving) return;
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

    const lastDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

    for (const student of students) {
      // Check if student was registered by the end of this month
      const registrationDate = new Date(student.fecha_inscripcion + 'T00:00:00');
      if (registrationDate > lastDayOfMonth) {
        continue;
      }

      const cost = planCosts[student.plan] || 0;
      const hasClasses = student.enrolledClasses && student.enrolledClasses.length > 0;
      if (hasClasses) {
        potential += cost;
      }

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
              <button disabled={isSaving} onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50">
                <ChevronLeftIcon className="w-6 h-6 text-slate-600" />
              </button>
              <h3 className="text-lg font-semibold text-blue-700 w-48 text-center capitalize">
                {viewDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
              </h3>
              <button disabled={isSaving} onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50">
                <ChevronRightIcon className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Buscar alumna..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex items-center whitespace-nowrap self-start sm:self-center">
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

        <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-3 sm:p-4 rounded-r-lg mb-6" role="alert">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
              <p className="font-bold text-base sm:text-lg">Resumen del Mes</p>
              <button
                onClick={() => setShowAmounts(!showAmounts)}
                className="p-1 hover:bg-blue-100 rounded-full transition-colors text-blue-600"
                title={showAmounts ? "Ocultar montos" : "Mostrar montos"}
              >
                {showAmounts ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
              {isSaving && <span className="text-blue-600 text-xs font-semibold animate-pulse">...</span>}
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-blue-200 pt-2 sm:pt-0">
              <div className="text-right">
                <p className="text-[10px] uppercase text-blue-600 font-semibold leading-tight">Recaudado</p>
                <p className="text-lg sm:text-2xl font-bold leading-tight">
                  {showAmounts ? `$${totalCollected.toLocaleString('es-ES')}` : '$*******'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-blue-600 font-semibold leading-tight">Potencial</p>
                <p className="text-lg sm:text-2xl font-bold leading-tight">
                  {showAmounts ? `$${totalPotential.toLocaleString('es-ES')}` : '$*******'}
                </p>
              </div>
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
                  <li key={student.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg gap-3 transition-colors ${bgColor}`}>
                    <div className="flex flex-row items-center justify-between w-full sm:w-auto gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800 text-sm sm:text-base">{student.nombre} {student.apellido}</p>
                        <span className="text-[10px] bg-white/50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-medium">
                          Plan {student.plan}
                        </span>
                      </div>
                      <div className="text-right">
                        {isPaid ? (
                          <p className="text-[11px] font-semibold text-green-700">Pagado: {formatDate(paymentDate)}</p>
                        ) : isLate ? (
                          <p className="text-[11px] font-semibold text-red-700">Pago Atrasado</p>
                        ) : (
                          <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Pendiente de Pago</p>
                        )}
                      </div>
                    </div>

                    <div className="w-full sm:w-auto">
                      {isPaid ? (
                        <button
                          onClick={() => onUndoPayment(student.id, monthYear)}
                          disabled={isSaving}
                          className="px-3 py-1.5 bg-slate-400 text-white text-xs font-medium rounded-md hover:bg-slate-500 w-full sm:w-auto disabled:opacity-50"
                        >
                          {isSaving ? '...' : 'Deshacer'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenPaymentModal(student)}
                          disabled={isSaving}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 w-full sm:w-auto disabled:bg-blue-300"
                        >
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
          isSaving={isSaving}
        />
      )}
    </>
  );
};

export default PaymentsPage;
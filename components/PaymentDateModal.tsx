import React, { useState, useEffect } from 'react';
import Modal from './Modal';

interface PaymentDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (date: string) => void;
  studentName: string;
}

const PaymentDateModal: React.FC<PaymentDateModalProps> = ({ isOpen, onClose, onSave, studentName }) => {
  const [paymentDate, setPaymentDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Set today's date in YYYY-MM-DD format
      setPaymentDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (paymentDate) {
      onSave(paymentDate);
    }
  };

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={`Registrar pago para ${studentName}`}
        size="sm"
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="paymentDate" className="block text-sm font-medium text-slate-700">Fecha de Pago</label>
          <input
            type="date"
            id="paymentDate"
            name="paymentDate"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Guardar Pago
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentDateModal;

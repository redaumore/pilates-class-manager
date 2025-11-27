import React, { useState, useEffect } from 'react';
import { PlanCosts, Plan } from '../types';

interface SettingsPageProps {
  planCosts: PlanCosts;
  onSave: (newCosts: PlanCosts) => Promise<void>;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ planCosts, onSave }) => {
  const [costs, setCosts] = useState<PlanCosts>(planCosts);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCosts(planCosts);
  }, [planCosts]);

  const handleChange = (plan: Plan, value: string) => {
    const newCost = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(newCost)) {
      setCosts(prev => ({ ...prev, [plan]: newCost }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setError(null);
    try {
      await onSave(costs);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus('idle');
      setError('Hubo un problema al guardar la configuración. Por favor intenta nuevamente.');
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-blue-800 mb-6">Configuración del Negocio</h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-md" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-700 mb-3">Costes de los Planes Mensuales</h3>
          <div className="space-y-4">
            {(Object.keys(costs) as unknown as Plan[]).sort().map(plan => (
              <div key={plan}>
                <label htmlFor={`plan-${plan}`} className="block text-sm font-medium text-slate-600">
                  Plan {plan} (clases/semana)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-slate-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id={`plan-${plan}`}
                    name={`plan-${plan}`}
                    value={costs[plan]}
                    onChange={(e) => handleChange(plan, e.target.value)}
                    min="0"
                    className="block w-full rounded-md border-slate-300 bg-white text-slate-900 pl-7 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 transition-colors duration-200 flex items-center justify-center"
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'idle' && 'Guardar Cambios'}
              {saveStatus === 'saving' && 'Guardando...'}
              {saveStatus === 'saved' && '¡Guardado!'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
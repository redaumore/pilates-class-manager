import React, { useState, useEffect } from 'react';
import { PlanCosts, Plan, NonWorkingDay, ScheduleConfig } from '../types';
import { TrashIcon } from './icons';
import { DAY_CODE_MAP } from '../constants';

interface SettingsPageProps {
  planCosts: PlanCosts;
  onSave: (newCosts: PlanCosts) => Promise<void>;
  nonWorkingDays: NonWorkingDay[];
  onAddNonWorkingDay: (day: Omit<NonWorkingDay, 'id'>) => Promise<void>;
  onDeleteNonWorkingDay: (id: string) => Promise<void>;
  workingDays: string[];
  onSaveWorkingDays: (days: string[]) => Promise<void>;
  scheduleConfig: ScheduleConfig | null;
  onSaveScheduleConfig: (config: ScheduleConfig) => Promise<void>;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  planCosts,
  onSave,
  nonWorkingDays,
  onAddNonWorkingDay,
  onDeleteNonWorkingDay,
  workingDays,
  onSaveWorkingDays,
  scheduleConfig,
  onSaveScheduleConfig
}) => {
  const [costs, setCosts] = useState<PlanCosts>(planCosts);
  const [currentWorkingDays, setCurrentWorkingDays] = useState<string[]>(workingDays);
  const [currentScheduleConfig, setCurrentScheduleConfig] = useState<ScheduleConfig>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [daysSaveStatus, setDaysSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [scheduleSaveStatus, setScheduleSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  // State for new non-working day form
  const [newHoliday, setNewHoliday] = useState({
    startDate: '',
    endDate: '',
    description: ''
  });
  const [addingHoliday, setAddingHoliday] = useState(false);

  const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 to 21:00

  useEffect(() => {
    setCosts(planCosts);
  }, [planCosts]);

  useEffect(() => {
    setCurrentWorkingDays(workingDays);
  }, [workingDays]);

  useEffect(() => {
    if (scheduleConfig) {
      setCurrentScheduleConfig(scheduleConfig);
    }
  }, [scheduleConfig]);

  const toggleHour = (dayName: string, hour: number) => {
    setCurrentScheduleConfig(prev => {
      const dayHours = prev[dayName] || [];
      const newHours = dayHours.includes(hour)
        ? dayHours.filter(h => h !== hour)
        : [...dayHours, hour].sort((a, b) => a - b);

      const newConfig = { ...prev, [dayName]: newHours };
      if (newHours.length === 0) {
        delete newConfig[dayName];
      }
      return newConfig;
    });
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleSaveStatus('saving');
    try {
      await onSaveScheduleConfig(currentScheduleConfig);

      // Also update workingDays for compatibility
      const newWorkingDays = Object.keys(currentScheduleConfig)
        .map(day => {
          const entry = Object.entries(DAY_CODE_MAP).find(([_, name]) => name === day);
          return entry ? entry[0] : null;
        })
        .filter((d): d is string => d !== null)
        .sort((a, b) => {
          const order = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
          return order.indexOf(a) - order.indexOf(b);
        });

      if (JSON.stringify(newWorkingDays) !== JSON.stringify(currentWorkingDays)) {
        await onSaveWorkingDays(newWorkingDays);
      }

      setScheduleSaveStatus('saved');
      setTimeout(() => setScheduleSaveStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setScheduleSaveStatus('idle');
      alert('Hubo un problema al guardar los horarios.');
    }
  };

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

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.startDate || !newHoliday.description) return;

    setAddingHoliday(true);
    try {
      await onAddNonWorkingDay({
        startDate: newHoliday.startDate,
        endDate: newHoliday.endDate || newHoliday.startDate,
        description: newHoliday.description
      });
      setNewHoliday({ startDate: '', endDate: '', description: '' });
    } catch (err) {
      console.error(err);
      alert('Error al agregar día no laborable');
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este día no laborable?')) {
      try {
        await onDeleteNonWorkingDay(id);
      } catch (err) {
        console.error(err);
        alert('Error al eliminar día no laborable');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Schedule Configuration Section */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold text-blue-800 mb-6">Configuración de Horarios de Clase</h2>
        <form onSubmit={handleScheduleSubmit} className="space-y-6">
          <p className="text-slate-600 mb-4 text-sm">Configura los días y horarios en los que se dictan clases. Al marcar una hora, el día se activará automáticamente.</p>

          <div className="space-y-6">
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dayName => (
              <div key={dayName} className="border-b border-slate-100 pb-4 last:border-0">
                <h3 className="font-semibold text-slate-700 mb-3">{dayName}</h3>
                <div className="flex flex-wrap gap-2">
                  {HOURS.map(hour => {
                    const isSelected = currentScheduleConfig[dayName]?.includes(hour);
                    return (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => toggleHour(dayName, hour)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'
                          }`}
                      >
                        {hour}:00
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 transition-colors duration-200 flex items-center justify-center font-semibold"
              disabled={scheduleSaveStatus === 'saving' || Object.keys(currentScheduleConfig).length === 0}
            >
              {scheduleSaveStatus === 'idle' && 'Guardar Horarios'}
              {scheduleSaveStatus === 'saving' && 'Guardando...'}
              {scheduleSaveStatus === 'saved' && '¡Guardado!'}
            </button>
          </div>
        </form>
      </div>

      {/* Plan Costs Section */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold text-blue-800 mb-6">Configuración de Costos</h2>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-md" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Costes de los Planes Mensuales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      className="block w-full rounded-md border-slate-300 bg-white text-slate-900 pl-7 pr-3 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 transition-colors duration-200 flex items-center justify-center"
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'idle' && 'Guardar Costos'}
              {saveStatus === 'saving' && 'Guardando...'}
              {saveStatus === 'saved' && '¡Guardado!'}
            </button>
          </div>
        </form>
      </div>

      {/* Non-Working Days Section */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold text-blue-800 mb-6">Días No Laborables / Vacaciones</h2>

        <form onSubmit={handleAddHoliday} className="mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h3 className="text-md font-semibold text-slate-700 mb-3">Agregar Nuevo Periodo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="holiday-start-date" className="block text-sm font-medium text-slate-600 mb-1">Fecha Inicio</label>
              <input
                id="holiday-start-date"
                type="date"
                required
                value={newHoliday.startDate}
                onChange={e => setNewHoliday({ ...newHoliday, startDate: e.target.value })}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="holiday-end-date" className="block text-sm font-medium text-slate-600 mb-1">Fecha Fin (Opcional)</label>
              <input
                id="holiday-end-date"
                type="date"
                value={newHoliday.endDate}
                onChange={e => setNewHoliday({ ...newHoliday, endDate: e.target.value })}
                min={newHoliday.startDate}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                placeholder="Igual a inicio si se deja vacío"
              />
            </div>
            <div>
              <label htmlFor="holiday-description" className="block text-sm font-medium text-slate-600 mb-1">Descripción</label>
              <input
                id="holiday-description"
                type="text"
                required
                value={newHoliday.description}
                onChange={e => setNewHoliday({ ...newHoliday, description: e.target.value })}
                placeholder="Ej: Feriado Nacional"
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addingHoliday}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-slate-400"
            >
              {addingHoliday ? 'Agregando...' : 'Agregar Fecha'}
            </button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Inicio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Fin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {nonWorkingDays.length > 0 ? (
                nonWorkingDays.map((day) => (
                  <tr key={day.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {new Date(day.startDate + 'T00:00:00').toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {new Date(day.endDate + 'T00:00:00').toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {day.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteHoliday(day.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-slate-500">
                    No hay días no laborables configurados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
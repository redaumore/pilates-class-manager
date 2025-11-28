import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from './SettingsPage';
import { PlanCosts, NonWorkingDay } from '../types';

describe('SettingsPage', () => {
    const mockPlanCosts: PlanCosts = {
        1: 1000,
        2: 1800,
        3: 2500,
    };

    const mockNonWorkingDays: NonWorkingDay[] = [
        {
            id: '1',
            startDate: '2025-12-25',
            endDate: '2025-12-25',
            description: 'Navidad',
        },
    ];

    const mockOnSave = vi.fn();
    const mockOnAddNonWorkingDay = vi.fn();
    const mockOnDeleteNonWorkingDay = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders plan costs correctly', () => {
        render(
            <SettingsPage
                planCosts={mockPlanCosts}
                onSave={mockOnSave}
                nonWorkingDays={mockNonWorkingDays}
                onAddNonWorkingDay={mockOnAddNonWorkingDay}
                onDeleteNonWorkingDay={mockOnDeleteNonWorkingDay}
            />
        );

        expect(screen.getByLabelText(/Plan 1/i)).toHaveValue(1000);
        expect(screen.getByLabelText(/Plan 2/i)).toHaveValue(1800);
        expect(screen.getByLabelText(/Plan 3/i)).toHaveValue(2500);
    });

    it('updates plan costs and calls onSave', async () => {
        render(
            <SettingsPage
                planCosts={mockPlanCosts}
                onSave={mockOnSave}
                nonWorkingDays={mockNonWorkingDays}
                onAddNonWorkingDay={mockOnAddNonWorkingDay}
                onDeleteNonWorkingDay={mockOnDeleteNonWorkingDay}
            />
        );

        const input = screen.getByLabelText(/Plan 1/i);
        fireEvent.change(input, { target: { value: '1200' } });

        const saveButton = screen.getByText(/Guardar Costos/i);
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith({
                ...mockPlanCosts,
                1: 1200,
            });
        });
    });

    it('renders non-working days correctly', () => {
        render(
            <SettingsPage
                planCosts={mockPlanCosts}
                onSave={mockOnSave}
                nonWorkingDays={mockNonWorkingDays}
                onAddNonWorkingDay={mockOnAddNonWorkingDay}
                onDeleteNonWorkingDay={mockOnDeleteNonWorkingDay}
            />
        );

        expect(screen.getByText('Navidad')).toBeInTheDocument();
        // Check for formatted dates (assuming locale might vary, checking parts)
        expect(screen.getByText(/25\/12\/2025/)).toBeInTheDocument();
    });

    it('adds a new non-working day', async () => {
        render(
            <SettingsPage
                planCosts={mockPlanCosts}
                onSave={mockOnSave}
                nonWorkingDays={mockNonWorkingDays}
                onAddNonWorkingDay={mockOnAddNonWorkingDay}
                onDeleteNonWorkingDay={mockOnDeleteNonWorkingDay}
            />
        );

        fireEvent.change(screen.getByLabelText(/Fecha Inicio/i), {
            target: { value: '2026-01-01' },
        });
        fireEvent.change(screen.getByLabelText(/Descripción/i), {
            target: { value: 'Año Nuevo' },
        });

        const addButton = screen.getByText(/Agregar Fecha/i);
        fireEvent.click(addButton);

        await waitFor(() => {
            expect(mockOnAddNonWorkingDay).toHaveBeenCalledWith({
                startDate: '2026-01-01',
                endDate: '2026-01-01', // Default behavior when end date is empty
                description: 'Año Nuevo',
            });
        });
    });

    it('deletes a non-working day', async () => {
        // Mock window.confirm
        vi.spyOn(window, 'confirm').mockImplementation(() => true);

        render(
            <SettingsPage
                planCosts={mockPlanCosts}
                onSave={mockOnSave}
                nonWorkingDays={mockNonWorkingDays}
                onAddNonWorkingDay={mockOnAddNonWorkingDay}
                onDeleteNonWorkingDay={mockOnDeleteNonWorkingDay}
            />
        );

        const deleteButton = screen.getByRole('button', { name: '' }); // Trash icon button might not have text, let's look for the icon or button in the row
        // Actually, the button has the TrashIcon. Let's find it by the row content or just the first delete button since there is one item.
        const deleteButtons = screen.getAllByRole('button');
        // The delete button is in the table.
        // Let's use a more specific selector if possible, or just find the one in the row.
        // In the component: <button onClick={() => handleDeleteHoliday(day.id)} ...> <TrashIcon /> </button>
        // We can find it by looking for the row with "Navidad" and then the button inside it.

        const row = screen.getByText('Navidad').closest('tr');
        const deleteBtn = row?.querySelector('button');

        expect(deleteBtn).toBeInTheDocument();
        if (deleteBtn) {
            fireEvent.click(deleteBtn);
        }

        await waitFor(() => {
            expect(mockOnDeleteNonWorkingDay).toHaveBeenCalledWith('1');
        });
    });
});

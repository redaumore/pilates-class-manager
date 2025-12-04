import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '../components/SettingsPage';
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

    let confirmSpy: any;

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.confirm globally
        confirmSpy = vi.fn(() => true);
        global.window.confirm = confirmSpy;
    });

    afterEach(() => {
        vi.restoreAllMocks();
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
        // Check for dates containing 25 and 2025 (there are two: start and end date)
        const dates = screen.getAllByText(/25.*2025|2025.*25/);
        expect(dates.length).toBeGreaterThan(0);
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
        render(
            <SettingsPage
                planCosts={mockPlanCosts}
                onSave={mockOnSave}
                nonWorkingDays={mockNonWorkingDays}
                onAddNonWorkingDay={mockOnAddNonWorkingDay}
                onDeleteNonWorkingDay={mockOnDeleteNonWorkingDay}
            />
        );

        // Find the delete button in the row with "Navidad"
        const row = screen.getByText('Navidad').closest('tr');
        const deleteBtn = row?.querySelector('button');

        expect(deleteBtn).toBeInTheDocument();
        if (deleteBtn) {
            fireEvent.click(deleteBtn);
        }

        // Verify confirm was called
        expect(confirmSpy).toHaveBeenCalled();

        await waitFor(() => {
            expect(mockOnDeleteNonWorkingDay).toHaveBeenCalledWith('1');
        });
    });
});

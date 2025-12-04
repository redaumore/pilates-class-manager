import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StudentFormModal from '../components/StudentFormModal';
import { Student, Level, Plan } from '../types';

describe('StudentFormModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    const mockStudent: Student = {
        id: '1',
        nombre: 'Maria',
        apellido: 'Perez',
        telefono: '123456789',
        nivel: Level.Basico,
        plan: 1,
        fecha_inscripcion: '2025-01-01',
        clases_recuperacion: 0,
    };

    it('apellido is required when creating a new student', () => {
        render(
            <StudentFormModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
                studentToEdit={null}
            />
        );

        const apellidoInput = screen.getByLabelText(/Apellido/i);
        expect(apellidoInput).toBeRequired();
    });

    it('apellido is NOT required when editing an existing student', () => {
        render(
            <StudentFormModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
                studentToEdit={mockStudent}
            />
        );

        const apellidoInput = screen.getByLabelText(/Apellido/i);
        expect(apellidoInput).not.toBeRequired();
    });
});

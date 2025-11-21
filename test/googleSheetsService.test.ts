
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    assignStudentToClassRecurring,
    removeStudentFromClassRecurring,
    registerStudentAbsence,
    loadDataFromSheet,
    signIn,
} from '../services/googleSheetsService';
import { AssignmentType, AttendanceStatus } from '../types';

// Mock global gapi and google
const mockGapi = {
    client: {
        setToken: vi.fn(),
        sheets: {
            spreadsheets: {
                values: {
                    get: vi.fn(),
                    update: vi.fn(),
                    append: vi.fn(),
                    clear: vi.fn(),
                },
                get: vi.fn(),
                batchUpdate: vi.fn(),
            },
        },
    },
};

const mockGoogle = {
    accounts: {
        oauth2: {
            initTokenClient: vi.fn().mockReturnValue({
                requestAccessToken: vi.fn(),
            }),
        },
    },
};

describe('googleSheetsService', () => {
    beforeEach(() => {
        vi.stubGlobal('gapi', mockGapi);
        vi.stubGlobal('google', mockGoogle);

        // Reset mocks
        vi.clearAllMocks();

        // Simulate authentication
        // We need to manually set the accessToken in the module if it wasn't exported, 
        // but since we can't easily access the private variable, we might need to mock the signIn flow 
        // or just assume the functions check for it. 
        // However, the functions check `if (!accessToken)`. 
        // Since `accessToken` is local to the module, we need to trigger `signIn` to set it.
        // But `signIn` is async and waits for callback.

        // A workaround is to mock the module itself, but we want to test the logic *inside* the functions.
        // The best way given the code structure is to actually call signIn and trigger the callback.

        // Let's try to "authenticate" by mocking the client callback execution if possible, 
        // OR we can just bypass the check if we could, but we can't.

        // Actually, we can mock `google.accounts.oauth2.initTokenClient` to immediately call the callback.
        mockGoogle.accounts.oauth2.initTokenClient.mockImplementation(({ callback }) => {
            return {
                requestAccessToken: () => {
                    callback({ access_token: 'fake-token' });
                },
            };
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('assignStudentToClassRecurring', () => {
        it('should assign a student to a class in 2025 sheet and append to monthly sheet', async () => {
            // Authenticate first
            await signIn();

            // Mock data for '2025' sheet
            mockGapi.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
                result: {
                    values: [
                        ['ID', 'NOMBRE', 'APELLIDO', 'CLASE 1', 'CLASE 2', 'CLASE 3', 'PLAN'], // Header
                        ['123', 'Maria', 'Perez', '', '', '', '3'], // Student row with empty slots
                    ],
                },
            });

            // Mock spreadsheet get (check if monthly sheet exists)
            mockGapi.client.sheets.spreadsheets.get.mockResolvedValue({
                result: {
                    sheets: [{ properties: { title: '2025-11' } }],
                },
            });

            // Call the function
            await assignStudentToClassRecurring('123', 'L09', '2025-11');

            // Verify '2025' sheet update
            // It should find the student at index 1 (row 2) and update CLASE 1 (col D -> index 3)
            // Col index 3 -> 'D'
            expect(mockGapi.client.sheets.spreadsheets.values.update).toHaveBeenCalledWith({
                spreadsheetId: expect.any(String),
                range: '2025!D2',
                valueInputOption: 'RAW',
                resource: { values: [['L09']] },
            });

            // Verify monthly sheet append
            // It should append rows for future dates.
            // We can't easily predict exact dates without mocking Date, but we can check the structure.
            expect(mockGapi.client.sheets.spreadsheets.values.append).toHaveBeenCalledWith({
                spreadsheetId: expect.any(String),
                range: '2025-11!A:G',
                valueInputOption: 'RAW',
                resource: {
                    values: expect.arrayContaining([
                        expect.arrayContaining(['L09', '123', AssignmentType.FIJA, AttendanceStatus.PROGRAMADA]),
                    ]),
                },
            });
        });

        it('should throw error if student already has 3 classes', async () => {
            await signIn();

            mockGapi.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
                result: {
                    values: [
                        ['ID', 'CLASE 1', 'CLASE 2', 'CLASE 3', 'PLAN'],
                        ['123', 'L09', 'M10', 'X11', '3'], // Full
                    ],
                },
            });

            await expect(assignStudentToClassRecurring('123', 'J12', '2025-11'))
                .rejects.toThrow('Alumna con cupo por plan completo');
        });

        it('should throw error if student plan is full (Plan 1, 1 class assigned)', async () => {
            await signIn();

            mockGapi.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
                result: {
                    values: [
                        ['ID', 'CLASE 1', 'CLASE 2', 'CLASE 3', 'PLAN'],
                        ['123', 'L09', '', '', '1'], // Plan 1, 1 class assigned
                    ],
                },
            });

            await expect(assignStudentToClassRecurring('123', 'M10', '2025-11'))
                .rejects.toThrow('Alumna con cupo por plan completo');
        });

        it('should allow assignment if student plan has space (Plan 2, 1 class assigned)', async () => {
            await signIn();

            mockGapi.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
                result: {
                    values: [
                        ['ID', 'CLASE 1', 'CLASE 2', 'CLASE 3', 'PLAN'],
                        ['123', 'L09', '', '', '2'], // Plan 2, 1 class assigned
                    ],
                },
            });

            // Mock spreadsheet get (check if monthly sheet exists)
            mockGapi.client.sheets.spreadsheets.get.mockResolvedValue({
                result: {
                    sheets: [{ properties: { title: '2025-11' } }],
                },
            });

            await assignStudentToClassRecurring('123', 'M10', '2025-11');

            // Verify '2025' sheet update
            // Should update CLASE 2 (index 2 -> 'C')
            expect(mockGapi.client.sheets.spreadsheets.values.update).toHaveBeenCalledWith({
                spreadsheetId: expect.any(String),
                range: '2025!C2',
                valueInputOption: 'RAW',
                resource: { values: [['M10']] },
            });
        });
    });

    describe('removeStudentFromClassRecurring', () => {
        it('should remove student from 2025 sheet and update monthly sheet', async () => {
            await signIn();

            // Mock data for '2025' sheet
            mockGapi.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
                result: {
                    values: [
                        ['ID', 'CLASE 1', 'CLASE 2', 'CLASE 3'],
                        ['123', 'L09', '', ''], // Has L09
                    ],
                },
            });

            // Mock spreadsheet get (check exists)
            mockGapi.client.sheets.spreadsheets.get.mockResolvedValue({
                result: {
                    sheets: [{ properties: { title: '2025-11' } }],
                },
            });

            // Mock monthly sheet data
            // We need to provide data that includes a future date to be removed
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);
            const futureDateISO = futureDate.toISOString().split('T')[0];

            mockGapi.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
                result: {
                    values: [
                        ['FECHA', 'CLASE_ID', 'ALUMNA_ID'],
                        ['2020-01-01', 'L09', '123'], // Past date (should keep)
                        [futureDateISO, 'L09', '123'], // Future date (should remove)
                        [futureDateISO, 'M10', '123'], // Different class (should keep)
                    ],
                },
            });

            await removeStudentFromClassRecurring('123', 'L09', '2025-11');

            // Verify '2025' sheet update (clearing the cell)
            // 'L09' is in CLASE 1 (index 1 -> 'B')
            expect(mockGapi.client.sheets.spreadsheets.values.update).toHaveBeenCalledWith({
                spreadsheetId: expect.any(String),
                range: '2025!B2',
                valueInputOption: 'RAW',
                resource: { values: [['']] },
            });

            // Verify monthly sheet update
            // It should clear and then write back the filtered list
            expect(mockGapi.client.sheets.spreadsheets.values.clear).toHaveBeenCalledWith({
                spreadsheetId: expect.any(String),
                range: '2025-11!A:Z',
            });

            expect(mockGapi.client.sheets.spreadsheets.values.update).toHaveBeenCalledWith({
                spreadsheetId: expect.any(String),
                range: '2025-11!A1',
                valueInputOption: 'RAW',
                resource: {
                    values: [
                        ['FECHA', 'CLASE_ID', 'ALUMNA_ID'], // Header
                        ['2020-01-01', 'L09', '123'], // Past date kept
                        [futureDateISO, 'M10', '123'], // Other class kept
                    ],
                },
            });
        });
    });


    describe('registerStudentAbsence', () => {
        it('should mark student as CANCELADA_SIN_AVISO if withMakeup is false', async () => {
            await signIn();

            // Mock monthly sheet data
            mockGapi.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
                result: {
                    values: [
                        ['FECHA', 'CLASE_ID', 'ALUMNA_ID', 'TIPO_ASIGNACION', 'ESTADO'],
                        ['2025-11-24', 'L09', '123', 'FIJA', 'PROGRAMADA'],
                    ],
                },
            });

            await registerStudentAbsence('123', 'L09', '2025-11-24', false);

            // Verify update call
            // ESTADO is at index 4 -> Column E
            // Row index is 2 (header + 1 row)
            expect(mockGapi.client.sheets.spreadsheets.values.update).toHaveBeenCalledWith({
                spreadsheetId: expect.any(String),
                range: '2025-11!E2',
                valueInputOption: 'RAW',
                resource: { values: [['CANCELADA_SIN_AVISO']] },
            });
        });

        it('should mark student as CANCELADA_AVISO and increment recupero if withMakeup is true', async () => {
            await signIn();

            // Mock monthly sheet data
            mockGapi.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
                result: {
                    values: [
                        ['FECHA', 'CLASE_ID', 'ALUMNA_ID', 'TIPO_ASIGNACION', 'ESTADO'],
                        ['2025-11-24', 'L09', '123', 'FIJA', 'PROGRAMADA'],
                    ],
                },
            });

            // Mock main sheet data for recupero increment
            mockGapi.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
                result: {
                    values: [
                        ['ID', 'RECUPERAR'],
                        ['123', '0'],
                    ],
                },
            });

            await registerStudentAbsence('123', 'L09', '2025-11-24', true);

            // Verify monthly sheet update
            expect(mockGapi.client.sheets.spreadsheets.values.update).toHaveBeenCalledWith({
                spreadsheetId: expect.any(String),
                range: '2025-11!E2',
                valueInputOption: 'RAW',
                resource: { values: [['CANCELADA_AVISO']] },
            });

            // Verify main sheet update (Recupero increment)
            // RECUPERAR is at index 1 -> Column B
            // Row index is 2
            expect(mockGapi.client.sheets.spreadsheets.values.update).toHaveBeenCalledWith({
                spreadsheetId: expect.any(String),
                range: '2025!B2',
                valueInputOption: 'RAW',
                resource: { values: [[1]] },
            });
        });
    });



    describe('loadDataFromSheet', () => {
        beforeEach(() => {
            // Fix date to November 2025 for consistent testing of monthly sheet loading
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2025-11-15T12:00:00Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should load students and absences from monthly sheet', async () => {
            await signIn();

            // Mock 1: Main '2025' sheet response
            mockGapi.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
                result: {
                    values: [
                        ['ID', 'NOMBRE', 'APELLIDO', 'TELEFONO', 'NIVEL', 'INGRESO', 'PLAN', 'RECUPERAR', 'ESTADO', 'CLASE 1'],
                        ['123', 'Maria', 'Perez', '11223344', 'B', '01/01/2025', '1', '0', 'OK', 'L16'],
                    ],
                },
            });

            // Mock 2: Monthly '2025-11' sheet response
            mockGapi.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
                result: {
                    values: [
                        ['FECHA', 'CLASE_ID', 'ALUMNA_ID', 'TIPO_ASIGNACION', 'ESTADO'],
                        ['2025-11-24', 'L16', '123', 'FIJA', 'CANCELADA_SIN_AVISO'],
                    ],
                },
            });

            const { students, schedule } = await loadDataFromSheet();

            // Verify Student loaded
            expect(students).toHaveLength(1);
            expect(students[0].id).toBe('123');

            // Verify Schedule loaded with booking
            const mondayClasses = schedule['Lunes'];
            const l16 = mondayClasses.find(c => c.time === 16);
            expect(l16).toBeDefined();
            expect(l16?.bookings).toHaveLength(1);
            expect(l16?.bookings[0].studentId).toBe('123');

            // Verify Absence loaded
            expect(l16?.absences).toBeDefined();
            expect(l16?.absences).toHaveLength(1);
            expect(l16?.absences?.[0]).toEqual({
                studentId: '123',
                date: '2025-11-24',
            });
        });
    });
});

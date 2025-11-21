
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    assignStudentToClassRecurring,
    removeStudentFromClassRecurring,
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
});

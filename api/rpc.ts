
import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

// Interface for the request body
interface RpcBody {
    action: string;
    payload?: any;
    userEmail?: string;
    spreadsheetId?: string; // Optional client-provided ID
}

// Initialize auth - requires environment variables
// GOOGLE_SERVICE_ACCOUNT_EMAIL
// GOOGLE_PRIVATE_KEY
const getAuthClient = () => {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let key = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !key) {
        throw new Error('Missing Google Service Account credentials');
    }

    // Handle potential quoting from copy-paste (e.g. if user copied "key" with quotes)
    if (key.startsWith('"') && key.endsWith('"')) {
        key = key.slice(1, -1);
    }

    // Handle escaped newlines (common in Vercel env vars)
    // We strictly replace literal \n with actual newlines
    key = key.replace(/\\n/g, '\n');

    return new google.auth.GoogleAuth({
        credentials: {
            client_email: email,
            private_key: key,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
};


// Interface for Sheet Configuration
interface SheetConfig {
    id: string;
    name: string;
}

const USER_SPREADSHEETS: Record<string, SheetConfig[]> = {
    'redaumore@gmail.com': [
        { id: '108MJXvIRSg_uXCAt4nJT0V0f96diOjaxrmqxqlq4iIM', name: 'Pilates Dev' },
        { id: '1onA2BHky-848DFSbaeTa_Qw-r8ZwpZ9nJteIn8-d1cc', name: 'Pilates Lorena' }
    ],
    'rolando.daumas@gmail.com': [
        { id: '1onA2BHky-848DFSbaeTa_Qw-r8ZwpZ9nJteIn8-d1cc', name: 'Pilates Lorena' },
        { id: '108MJXvIRSg_uXCAt4nJT0V0f96diOjaxrmqxqlq4iIM', name: 'Pilates Dev' },
        { id: '1wBbSGFK9GYnTKTiEvfaf6dUaeIQS3Ah8ey3PuVBIKLQ', name: 'Pilates Agata' }
    ],
};

const getSpreadsheetId = (userEmail?: string, requestedId?: string) => {
    // Priority: 1. Validate requestedId against User Map
    if (userEmail && USER_SPREADSHEETS[userEmail]) {
        const userSheets = USER_SPREADSHEETS[userEmail];

        // If specific ID requested, verify ownership
        if (requestedId) {
            const match = userSheets.find(s => s.id === requestedId);
            if (match) {
                console.log(`Using specific spreadsheet for user ${userEmail}: ${match.name} (${match.id})`);
                return match.id;
            }
            console.warn(`User ${userEmail} requested invalid sheet ID: ${requestedId}. Falling back to default.`);
        }

        // Default to first sheet if only one exists or no ID provided (legacy behavior)
        if (userSheets.length > 0) {
            console.log(`Using default spreadsheet for user ${userEmail}: ${userSheets[0].name} (${userSheets[0].id})`);
            return userSheets[0].id;
        }
    }

    if (process.env.GOOGLE_SPREADSHEET_ID) {
        console.log('Using spreadsheet from GOOGLE_SPREADSHEET_ID environment variable.');
        return process.env.GOOGLE_SPREADSHEET_ID;
    }

    // Fallback
    return '1onA2BHky-848DFSbaeTa_Qw-r8ZwpZ9nJteIn8-d1cc';
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { action, payload, userEmail, spreadsheetId: requestedSpreadsheetId }: RpcBody = req.body;
        const auth = getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        // Resolve the actual spreadsheet ID to use
        const spreadsheetId = getSpreadsheetId(userEmail, requestedSpreadsheetId);

        switch (action) {
            case 'getAvailableSheets':
                if (!userEmail || !USER_SPREADSHEETS[userEmail]) {
                    return res.status(200).json({ sheets: [] });
                }
                // Return only id and name, filter sensitive info if any (though currently none)
                return res.status(200).json({
                    sheets: USER_SPREADSHEETS[userEmail].map(s => ({ id: s.id, name: s.name }))
                });

            case 'loadDataFromSheet':
                // Implementation mirroring the frontend logic but server-side
                const { year: loadYear } = payload || {};
                const currentYear = new Date().getFullYear().toString();
                const sheetName = loadYear || currentYear;
                const range = `'${sheetName}'!A:Z`;
                try {
                    const response = await sheets.spreadsheets.values.get({
                        spreadsheetId,
                        range,
                    });
                    return res.status(200).json({ values: response.data.values });
                } catch (error: any) {
                    if (error.message?.includes('Unable to parse range')) {
                        const meta = await sheets.spreadsheets.get({ spreadsheetId });
                        const sheetNames = meta.data.sheets?.map(s => s.properties?.title) || [];
                        throw new Error(`No se encontró la hoja "${sheetName}". Hojas disponibles: ${sheetNames.join(', ')}`);
                    }
                    throw error;
                }

            case 'updateSheet':
                // General update proxy
                const { range: updateRange, values } = payload;
                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: updateRange,
                    valueInputOption: 'RAW',
                    requestBody: { values }
                });
                return res.status(200).json({ success: true });

            case 'appendSheet':
                const { range: appendRange, values: appendValues } = payload;
                await sheets.spreadsheets.values.append({
                    spreadsheetId,
                    range: appendRange,
                    valueInputOption: 'RAW',
                    requestBody: { values: appendValues }
                });
                return res.status(200).json({ success: true });

            case 'clearSheet':
                const { range: clearRange } = payload;
                await sheets.spreadsheets.values.clear({
                    spreadsheetId,
                    range: clearRange
                });
                return res.status(200).json({ success: true });

            case 'createSheet':
                const { title } = payload;
                const metaForCreate = await sheets.spreadsheets.get({ spreadsheetId });
                const exists = metaForCreate.data.sheets?.some(s => s.properties?.title === title);

                if (!exists) {
                    await sheets.spreadsheets.batchUpdate({
                        spreadsheetId,
                        requestBody: {
                            requests: [{
                                addSheet: { properties: { title } }
                            }]
                        }
                    });
                }
                return res.status(200).json({ success: true, alreadyExists: !!exists });

            case 'getSpreadsheetMeta':
                const meta = await sheets.spreadsheets.get({ spreadsheetId });
                return res.status(200).json(meta.data);

            case 'getSheetValues':
                const { range: getRange } = payload;
                const getRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: getRange });
                return res.status(200).json({ values: getRes.data.values });

            case 'batchUpdateValues':
                const { data, valueInputOption } = payload;
                await sheets.spreadsheets.values.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        valueInputOption: valueInputOption || 'RAW',
                        data: data // Array of { range, values }
                    }
                });
                return res.status(200).json({ success: true });

            case 'deleteRow':
                const { sheetId, rowIndex, endRowIndex } = payload;
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [{
                            deleteDimension: {
                                range: {
                                    sheetId,
                                    dimension: 'ROWS',
                                    startIndex: rowIndex,
                                    endIndex: endRowIndex
                                }
                            }
                        }]
                    }
                });
                return res.status(200).json({ success: true });

            default:
                return res.status(400).json({ error: `Unknown action: ${action}` });
        }

    } catch (error: any) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}

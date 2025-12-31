
import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

// Interface for the request body
interface RpcBody {
    action: string;
    payload?: any;
    userEmail?: string;
}

// Initialize auth - requires environment variables
// GOOGLE_SERVICE_ACCOUNT_EMAIL
// GOOGLE_PRIVATE_KEY
const getAuthClient = () => {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!email || !key) {
        throw new Error('Missing Google Service Account credentials');
    }

    return new google.auth.GoogleAuth({
        credentials: {
            client_email: email,
            private_key: key,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
};

const USER_SPREADSHEET_MAP: Record<string, string> = {
    // This should be moved to a robust config or database
    'default': '1onA2BHky-848DFSbaeTa_Qw-r8ZwpZ9nJteIn8-d1cc',
};

const getSpreadsheetId = (userEmail?: string) => {
    if (userEmail && USER_SPREADSHEET_MAP[userEmail]) {
        return USER_SPREADSHEET_MAP[userEmail];
    }
    // Fallback or error
    return USER_SPREADSHEET_MAP['default'];
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { action, payload, userEmail }: RpcBody = req.body;
        const auth = getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = getSpreadsheetId(userEmail);

        switch (action) {
            case 'loadDataFromSheet':
                // Implementation mirroring the frontend logic but server-side
                const sheetName = '2025';
                const range = `${sheetName}!A:Z`;
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range,
                });

                // TODO: We might want to parse it here or send raw data back to frontend
                // For minimal refactor, let's send values back and let frontend parse
                return res.status(200).json({ values: response.data.values });

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
                // Check existing handled in logic or here? 
                // Better to just do the operation requested
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [{
                            addSheet: { properties: { title } }
                        }]
                    }
                });
                return res.status(200).json({ success: true });

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

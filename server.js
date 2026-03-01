import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Google Sheets if env vars are present
let doc = null;
if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SPREADSHEET_ID) {
    const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle escaped newlines from Render
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID, serviceAccountAuth);
    console.log("Google Sheets integration initialized and ready.");
} else {
    console.log("No Google Sheets credentials found in environment. Running in local CSV mode only.");
}

// Serve static files from Vite build directory
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

const excelFile = path.join(__dirname, 'orders.csv');

// Initialize CSV with headers if it doesn't exist
if (!fs.existsSync(excelFile)) {
    fs.writeFileSync(excelFile, 'Timestamp,Name,WhatsApp Number\n', 'utf8');
}

app.post('/api/order', (req, res) => {
    const { name, whatsapp } = req.body;

    if (!name || !whatsapp) {
        return res.status(400).json({ error: 'Name and WhatsApp are required' });
    }

    // Escape commas in strings for CSV safely
    const safeName = `"${name.replace(/"/g, '""')}"`;
    const safeWhatsApp = `"${whatsapp.replace(/"/g, '""')}"`;
    const timestamp = new Date().toISOString();

    const csvLine = `${timestamp},${safeName},${safeWhatsApp}\n`;

    fs.appendFile(excelFile, csvLine, 'utf8', async (err) => {
        if (err) {
            console.error('Failed to write to excel file:', err);
        } else {
            console.log(`Order saved locally: ${name} / ${whatsapp}`);
        }

        // Attempt to sync to Google Sheets if configured
        if (doc) {
            try {
                await doc.loadInfo();
                const sheet = doc.sheetsByIndex[0];
                await sheet.addRow({
                    Timestamp: timestamp,
                    Name: name,
                    'WhatsApp Number': whatsapp
                });
                console.log(`Order synced to Google Sheets: ${name}`);
            } catch (sheetErr) {
                console.error("Failed to sync to Google Sheets:", sheetErr);
            }
        }

        res.status(200).json({ success: true });
    });
});

// Serve the SPA for frontend routes
app.get('/', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Junk Baby Backend running on http://localhost:${PORT}`);
    console.log(`Orders will be saved to ${excelFile}`);
});

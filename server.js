import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

    fs.appendFile(excelFile, csvLine, 'utf8', (err) => {
        if (err) {
            console.error('Failed to write to excel file:', err);
            return res.status(500).json({ error: 'Failed to process order' });
        }

        console.log(`Order saved: ${name} / ${whatsapp}`);
        res.status(200).json({ success: true });
    });
});

// Catch-all route to serve the SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Junk Baby Backend running on http://localhost:${PORT}`);
    console.log(`Orders will be saved to ${excelFile}`);
});

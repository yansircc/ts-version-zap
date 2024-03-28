// src/server.js
import express from 'express';
import { getLogs } from '../utils/logger';

const app = express();
const PORT = 3000;

app.get('/logs', (req, res) => {
    res.json(getLogs());
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const consultaRoutes = require('./routes/consulta');
const operativoRoutes = require('./routes/operativo');

const app = express();
const PORT = process.env.PORT || 3002;

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['https://frontend-eight-beta-69.vercel.app', 'http://localhost:3000', 'http://localhost:3002', 'http://localhost:4200'];

app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api', consultaRoutes);
app.use('/api', operativoRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        mensaje: err.message
    });
});

app.get('/health', (req, res) => {
    res.json({ status: "ok", service: "simit-backend" });
});

app.listen(PORT, () => {
    console.log(`SIMIT backend corriendo en puerto ${PORT}`);
});

module.exports = app;

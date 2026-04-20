const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['https://frontend-eight-beta-69.vercel.app', 'http://localhost:3000', 'http://localhost:4200'];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));

app.get('/api/senales', async (req, res) => {
  try {
    const response = await axios.get('https://practicatest.co/senales-transito-colombia', {
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const senales = [];

    $('h2.apartado').each((_, h2) => {
      const titulo = $(h2).text().toLowerCase();
      let tipo = null;
      if (titulo.includes('reglament')) tipo = 'reglamentarias';
      else if (titulo.includes('peligro') || titulo.includes('prevent')) tipo = 'preventivas';
      else if (titulo.includes('inform')) tipo = 'informativas';
      else if (titulo.includes('transitor')) tipo = 'transitorias';

      if (tipo) {
        const parent = $(h2).parent();
        parent.find('img').each((_, img) => {
          const src = $(img).attr('src') || '';
          const imgSrc = src.startsWith('http') ? src : 'https://practicatest.co' + src;
          const nombre = src.split('/').pop().split('.')[0].toUpperCase().replace(/_/g, ' ');
          
          const nextP = $(img).next('p');
          const descripcion = nextP.length ? nextP.text().trim() : '';

          senales.push({ tipo, nombre, descripcion, imagen: imgSrc });
        });
      }
    });

    res.json(senales);
  } catch (err) {
    console.error('Error scraping señales:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: "ok", service: "senales-backend" });
});

app.listen(PORT, () => console.log(`Señales backend corriendo en puerto ${PORT}`));
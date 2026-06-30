const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require("cors");

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://www.report-elo.com', 'https://report-elo.com', 'https://frontend-eight-beta-69.vercel.app', 'http://localhost:3000', 'http://localhost:4200'];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));
app.use(express.json());

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getFromCache(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

async function obtenerNoticiasIDTQ(start = 0) {
  try {
    const cacheKey = `list-${start}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const url = `https://www.idtq.gov.co/?start=${start}`;

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "es-CO,es;q=0.9"
      },
      timeout: 15000
    });

    const $ = cheerio.load(data);
    const noticias = [];

    $('div.item[itemprop="blogPost"]').each((_, item) => {
      const $item = $(item);

      const $link = $item.find('h2 a[itemprop="url"]').first();
      const titulo = $link.text().trim();
      const enlaceRelativo = $link.attr("href");

      if (!titulo || !enlaceRelativo) return;

      let imagen = $item.find('.item-image img').first().attr("src") || null;

      if (imagen) {
        if (imagen.startsWith("//")) imagen = "https:" + imagen;
        else if (imagen.startsWith("/")) imagen = "https://www.idtq.gov.co" + imagen;
      }

      const enlace = enlaceRelativo.startsWith("http")
        ? enlaceRelativo
        : "https://www.idtq.gov.co" + enlaceRelativo;

      noticias.push({ titulo, imagen, enlace });
    });

    setCache(cacheKey, noticias);
    return noticias;
  } catch (error) {
    console.error("Error scraper:", error.message);
    return [];
  }
}

app.get("/api/noticias", async (req, res) => {
  try {
    const start = Number(req.query.start) || 0;
    const noticias = await obtenerNoticiasIDTQ(start);
    if (!noticias.length) return res.status(500).json({ error: "No se pudieron obtener noticias" });
    res.json(noticias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener noticias" });
  }
});

app.get("/api/noticia-detalle", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "URL requerida" });

    const cacheKey = `detail-${url}`;
    const cached = getFromCache(cacheKey);
    if (cached) return res.json(cached);

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "es-CO,es;q=0.9"
      },
      timeout: 15000
    });
    const $ = cheerio.load(data);

    const titulo = $('[itemprop="headline"]').first().text().trim();
    const fecha = $('[itemprop="datePublished"]').attr('datetime') || $(".published").text().trim();
    let contenido = $('[itemprop="articleBody"]').html() || "";
    let imagen = $('[itemprop="image"]').first().attr("src") || $(".item-image img").first().attr("src") || null;

    if (imagen && imagen.startsWith("/")) imagen = "https://www.idtq.gov.co" + imagen;
    contenido = contenido.replace(/src="\/([^"]+)"/g, 'src="https://www.idtq.gov.co/$1"');

    const result = { titulo, fecha, imagen, contenido };
    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error("Error detalle noticia:", error.message);
    res.status(500).json({ error: "Error al obtener detalle" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "noticias-backend" });
});

app.listen(PORT, () => {
  console.log(`Noticias backend corriendo en puerto ${PORT}`);
});

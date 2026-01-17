import cors from 'cors';
import express from 'express';
import 'express-async-errors';
import { errorHandler } from '../middlewares/errorHandler';
import axios from 'axios';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(errorHandler);

// =================================================================
// LÓGICA DE LISTA NEGRA (CIRCUIT BREAKER)
// =================================================================
const blockedChildren = new Map<string, number>();
const BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 horas

app.get('/', (req, res) => {
  return res.json({ status: 'OK' });
});

app.get('/suggestion', async (req, res) => {
  const headerAuth = req.headers['authorization']?.split(' ')[1];
  if (headerAuth !== process.env.NODE_AUTH)
    return res.status(401).json({ error: 'Unauthorized' });

  const parentType = process.env.PARENT_TYPE as 'MAIN' | 'CHILDREN';
  const query = req.query.q as string;

  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  const googleUrl = process.env.GOOGLE_URL;

  // Ajuste necessário: garante que childUrls seja um array iterável
  let childUrls = process.env.CHILD_URLS || [];
  if (!parentType) {
    return res.status(500).json({ error: 'PARENT_TYPE not defined' });
  }

  if (!query) {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  /**
   * CHILDREN → chama Google diretamente
   */
  if (parentType === 'CHILDREN') {
    if (!googleUrl || !apiKey || !searchEngineId) {
      return res
        .status(500)
        .json({ error: 'Google API configuration is missing.' });
    }

    try {
      const response = await axios.get(googleUrl, {
        params: {
          key: apiKey,
          cx: searchEngineId,
          q: query,
          searchType: 'image',
          num: 5,
          safe: 'active',
        },
      });

      const items = response.data.items || [];

      const results = items.map((item: any) => ({
        title: item.title,
        link: item.link,
        contextLink: item.image?.contextLink,
        width: item.image?.width,
        height: item.image?.height,
      }));

      return res.json({ data: results });
    } catch (error) {
      return res.json({ data: [] });
    }
  }

  if (parentType === 'MAIN') {
    for (const rawUrl of childUrls) {
      const url = rawUrl.trim();
      if (!url) continue;

      // 1. Verifica se está na lista negra
      if (blockedChildren.has(url)) {
        const releaseTime = blockedChildren.get(url) || 0;
        if (Date.now() < releaseTime) {
          console.log(`Child bloqueado (skip): ${url}`);
          continue; // Pula para o próximo child
        } else {
          blockedChildren.delete(url); // Remove da lista se o tempo expirou
        }
      }

      try {
        const response = await axios.get(url, {
          params: { q: query },
          timeout: 5000,
        });

        // Se retornou algo válido, já encerra
        if (response.data?.data?.length) {
          return res.json(response.data);
        }
      } catch (error) {
        // 2. Adiciona à lista negra por 24h em caso de erro
        console.warn(`Erro no child ${url}. Bloqueando por 24h.`);
        blockedChildren.set(url, Date.now() + BLOCK_DURATION);
      }
    }

    // Se nenhum CHILD respondeu corretamente
    return res.json({ data: [] });
  }

  return res.status(500).json({ error: 'Invalid PARENT_TYPE' });
});

export { app };

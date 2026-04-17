import type { NextApiRequest, NextApiResponse } from 'next';

// Proxy /api/items --> http://localhost:3001/api/items
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const backendUrl = `http://localhost:3001/api/items${req.query.id ? '/' + req.query.id : ''}`;

  const options: RequestInit = {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: (req.method !== 'GET' && req.body) ? JSON.stringify(req.body) : undefined,
  };

  try {
    const fetchRes = await fetch(backendUrl, options as any);
    const data = await fetchRes.json();
    res.status(fetchRes.status).json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Proxy error', details: err?.toString() });
  }
}

import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    cards: [
      { id: '1', name: 'Blue-Eyes White Dragon', description: 'Legendary dragon.' },
      { id: '2', name: 'Dark Magician', description: 'Powerful wizard in attack and defense.' }
    ]
  });
});

export default router;
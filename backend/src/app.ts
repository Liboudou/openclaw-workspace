import express from 'express';
import cors from 'cors';
import pingRouter from './routes/ping';
import dataRouter from './routes/data';

const app = express();

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/ping', pingRouter);
app.use('/api/data', dataRouter);

export default app;
import express from 'express';
const app = express();

app.get('/', (_req, res) => {
  res.send('Backend API is running.');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

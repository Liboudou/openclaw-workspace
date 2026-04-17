import app from "./app";

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend listening (stateless, in-memory) on port ${PORT}`);
});

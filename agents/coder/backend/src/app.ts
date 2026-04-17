import express, { Request, Response } from "express";

const app = express();

app.get("/api/demo", (_: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;

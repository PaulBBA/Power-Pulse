import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/groups", async (_req, res) => {
    const groups = await storage.getGroups();
    res.json(groups);
  });

  app.get("/api/sites", async (_req, res) => {
    const sites = await storage.getSites();
    res.json(sites);
  });

  app.get("/api/meters", async (_req, res) => {
    const meters = await storage.getMeters();
    res.json(meters);
  });

  app.get("/api/meters/:id/readings", async (req, res) => {
    const readings = await storage.getReadings(parseInt(req.params.id));
    res.json(readings);
  });

  return httpServer;
}

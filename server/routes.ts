import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { db } from "./db.js";
import { users } from "@shared/schema.js";

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

  app.post("/api/sites", async (req, res) => {
    try {
      const site = await storage.createSite(req.body);
      res.status(200).json(site);
    } catch (error: any) {
      console.error("Error creating site:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/users", async (_req, res) => {
    try {
      const allUsers = await db.select().from(users);
      // Don't send passwords
      const safeUsers = allUsers.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/users", async (req, res) => {
    try {
      const newUser = await storage.createUser(req.body);
      const { password, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: error.message || "Failed to create user" });
    }
  });

  app.get("/api/data-sets", async (_req, res) => {
    const dataSets = await storage.getDataSets();
    res.json(dataSets);
  });

  app.get("/api/data-sets/:id/invoices", async (req, res) => {
    const invoices = await storage.getInvoices(parseInt(req.params.id));
    res.json(invoices);
  });

  return httpServer;
}

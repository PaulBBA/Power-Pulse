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

  app.get("/api/groups/hierarchy", async (_req, res) => {
    try {
      const hierarchy = await storage.getGroupsHierarchy();
      res.json(hierarchy);
    } catch (error: any) {
      console.error("Error fetching hierarchy:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const group = await storage.createGroup(req.body);
      res.status(201).json(group);
    } catch (error: any) {
      console.error("Error creating group:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/site-groups", async (req, res) => {
    try {
      const { siteId, groupId } = req.body;
      await storage.assignSiteToGroup(siteId, groupId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Error assigning site to group:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/site-groups", async (req, res) => {
    try {
      const { siteId, groupId } = req.body;
      await storage.removeSiteFromGroup(siteId, groupId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Error removing site from group:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/utilities", async (_req, res) => {
    const utils = await storage.getUtilities();
    res.json(utils);
  });

  app.get("/api/sites", async (_req, res) => {
    const sites = await storage.getSites();
    res.json(sites);
  });

  app.patch("/api/sites/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const site = await storage.updateSite(id, req.body);
      res.json(site);
    } catch (error: any) {
      console.error("Error updating site:", error);
      res.status(400).json({ message: error.message });
    }
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

  app.patch("/api/data-sets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataSet = await storage.updateDataSet(id, req.body);
      res.json(dataSet);
    } catch (error: any) {
      console.error("Error updating data set:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/data-sets", async (req, res) => {
    try {
      const dataSet = await storage.createDataSet(req.body);
      res.status(200).json(dataSet);
    } catch (error: any) {
      console.error("Error creating data set:", error);
      res.status(400).json({ message: error.message });
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

  app.get("/api/todos", async (_req, res) => {
    const items = await storage.getTodoItems();
    res.json(items);
  });

  app.post("/api/todos", async (req, res) => {
    try {
      const item = await storage.createTodoItem(req.body);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/todos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.toggleTodoItem(id, req.body.isDone);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/todos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTodoItem(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  return httpServer;
}

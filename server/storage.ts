import { 
  users, type User, type InsertUser,
  sites, type Site, 
  groups, type Group,
  dataSets, type DataSet,
  dataInvoices, type Invoice
} from "@shared/schema.js";
import { db } from "./db.js";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Groups
  getGroups(): Promise<Group[]>;
  createGroup(group: { name: string }): Promise<Group>;

  // Sites
  getSites(): Promise<Site[]>;
  getSite(id: number): Promise<Site | undefined>;
  createSite(site: any): Promise<Site>;

  // Data Sets (Meters)
  getDataSets(): Promise<DataSet[]>;
  getDataSetsBySite(siteId: number): Promise<DataSet[]>;
  createDataSet(dataSet: any): Promise<DataSet>;

  // Invoices (Readings)
  getInvoices(dataSetId: number): Promise<Invoice[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    if (!user) {
      // If we see the data in DB but this fails, it might be a weird driver state
      // Let's try to fetch it if the insert didn't return but somehow succeeded
      const existing = await this.getUserByUsername(insertUser.username);
      if (existing) return existing;
      throw new Error("Failed to insert user into database");
    }
    return user;
  }

  async getGroups(): Promise<Group[]> {
    return await db.select().from(groups);
  }

  async createGroup(group: { name: string }): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    return newGroup;
  }

  async getSites(): Promise<Site[]> {
    return await db.select().from(sites);
  }

  async getSite(id: number): Promise<Site | undefined> {
    const [site] = await db.select().from(sites).where(eq(sites.id, id));
    return site;
  }

  async createSite(site: any): Promise<Site> {
    const [newSite] = await db.insert(sites).values(site).returning();
    return newSite;
  }

  async getDataSets(): Promise<DataSet[]> {
    return await db.select().from(dataSets);
  }

  async getDataSetsBySite(siteId: number): Promise<DataSet[]> {
    return await db.select().from(dataSets).where(eq(dataSets.siteId, siteId));
  }

  async createDataSet(dataSet: any): Promise<DataSet> {
    try {
      if (dataSet.mpanCoreMprn) {
        const queryResult = await db.select().from(dataSets).where(
          eq(dataSets.mpanCoreMprn, dataSet.mpanCoreMprn)
        );
        if (queryResult && Array.isArray(queryResult) && queryResult.length > 0) {
          throw new Error(`A meter with MPAN Core/MPRN ${dataSet.mpanCoreMprn} already exists.`);
        }
      }

      if (!dataSet.siteId) {
        throw new Error("Site is required");
      }
      if (!dataSet.utilityTypeId) {
        throw new Error("Utility type is required");
      }

      const results = await db.insert(dataSets).values(dataSet).returning();
      
      if (!results || !Array.isArray(results) || results.length === 0) {
        // Fallback: The insert might have worked but returning() failed
        // This is a common issue with Neon HTTP driver
        if (dataSet.mpanCoreMprn) {
          const fallback = await db.select().from(dataSets).where(
            eq(dataSets.mpanCoreMprn, dataSet.mpanCoreMprn)
          );
          if (fallback && Array.isArray(fallback) && fallback.length > 0) {
            return fallback[0];
          }
        }
        throw new Error("Failed to insert data set: No result returned from database");
      }
      return results[0];
    } catch (error: any) {
      console.error("Database error in createDataSet:", error);
      // If it's the specific map error, it's a driver issue. We try to provide a better message
      // or even a retry logic if needed, but for now we'll just throw a more descriptive error.
      if (error instanceof TypeError && error.message.includes("reading 'map'")) {
         throw new Error("Database communication error. The record might have been created; please refresh the page.");
      }
      throw error;
    }
  }

  async getInvoices(dataSetId: number): Promise<Invoice[]> {
    return await db.select().from(dataInvoices).where(eq(dataInvoices.dataSetId, dataSetId));
  }
}

export const storage = new DatabaseStorage();

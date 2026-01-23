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
      console.log("Creating data set with data:", JSON.stringify(dataSet));
      
      if (dataSet.mpanCoreMprn) {
        const existingResults = await db.select().from(dataSets).where(
          eq(dataSets.mpanCoreMprn, dataSet.mpanCoreMprn)
        );
        if (existingResults && existingResults.length > 0) {
          throw new Error(`A meter with MPAN Core/MPRN ${dataSet.mpanCoreMprn} already exists.`);
        }
      }

      const results = await db.insert(dataSets).values(dataSet).returning();
      console.log("Insert results:", JSON.stringify(results));
      
      if (!results || results.length === 0) {
        throw new Error("Failed to insert data set: No result returned from database");
      }
      return results[0];
    } catch (error: any) {
      console.error("Database error in createDataSet:", error);
      throw error;
    }
  }

  async getInvoices(dataSetId: number): Promise<Invoice[]> {
    return await db.select().from(dataInvoices).where(eq(dataInvoices.dataSetId, dataSetId));
  }
}

export const storage = new DatabaseStorage();

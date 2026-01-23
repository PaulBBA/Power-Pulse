import { 
  users, type User, type InsertUser,
  sites, type Site, 
  groups, type Group,
  dataSets, type DataSet,
  dataInvoices, type Invoice
} from "@shared/schema";
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
    const [newDataSet] = await db.insert(dataSets).values(dataSet).returning();
    return newDataSet;
  }

  async getInvoices(dataSetId: number): Promise<Invoice[]> {
    return await db.select().from(dataInvoices).where(eq(dataInvoices.dataSetId, dataSetId));
  }
}

export const storage = new DatabaseStorage();

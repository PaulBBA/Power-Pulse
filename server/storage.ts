import { 
  users, type User, type InsertUser,
  sites, type Site, 
  groups, type Group,
  siteGroups,
  dataSets, type DataSet,
  dataInvoices, type Invoice,
  utilities
} from "@shared/schema.js";
import { db } from "./db.js";
import { eq, inArray, notInArray, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Groups
  getGroups(): Promise<Group[]>;
  createGroup(group: { name: string }): Promise<Group>;
  getGroupsHierarchy(): Promise<any>;

  // Site-Group assignments
  assignSiteToGroup(siteId: number, groupId: number): Promise<void>;
  removeSiteFromGroup(siteId: number, groupId: number): Promise<void>;

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

  // Utilities
  getUtilities(): Promise<any[]>;
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

  async getGroupsHierarchy(): Promise<any> {
    const allGroups = await db.select().from(groups);
    const allSites = await db.select().from(sites);
    const allDataSets = await db.select().from(dataSets);
    const allSiteGroups = await db.select().from(siteGroups);
    const allUtilities = await db.select().from(utilities);

    const utilityMap = new Map(allUtilities.map(u => [u.id, u]));
    const metersBySite = new Map<number, any[]>();
    for (const ds of allDataSets) {
      const list = metersBySite.get(ds.siteId) || [];
      list.push({
        ...ds,
        utilityName: utilityMap.get(ds.utilityTypeId)?.name || "Unknown",
        utilityCode: utilityMap.get(ds.utilityTypeId)?.code || "",
      });
      metersBySite.set(ds.siteId, list);
    }

    const assignedSiteIds = new Set(allSiteGroups.map(sg => sg.siteId));

    const groupsWithSites = allGroups.map(g => {
      const groupSiteIds = allSiteGroups
        .filter(sg => sg.groupId === g.id)
        .map(sg => sg.siteId);
      const groupSites = allSites
        .filter(s => groupSiteIds.includes(s.id))
        .map(s => ({
          ...s,
          meters: metersBySite.get(s.id) || [],
        }));
      return { ...g, sites: groupSites };
    });

    const unassignedSites = allSites
      .filter(s => !assignedSiteIds.has(s.id))
      .map(s => ({
        ...s,
        meters: metersBySite.get(s.id) || [],
      }));

    return { groups: groupsWithSites, unassigned: unassignedSites };
  }

  async assignSiteToGroup(siteId: number, groupId: number): Promise<void> {
    await db.insert(siteGroups).values({ siteId, groupId });
  }

  async removeSiteFromGroup(siteId: number, groupId: number): Promise<void> {
    await db.delete(siteGroups)
      .where(sql`${siteGroups.siteId} = ${siteId} AND ${siteGroups.groupId} = ${groupId}`);
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

  async updateSiteName(id: number, name: string): Promise<Site> {
    const [updated] = await db.update(sites).set({ name }).where(eq(sites.id, id)).returning();
    return updated;
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

  async getUtilities(): Promise<any[]> {
    return await db.select().from(utilities);
  }
}

export const storage = new DatabaseStorage();

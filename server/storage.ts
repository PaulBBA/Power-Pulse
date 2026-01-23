import { users, type User, type InsertUser, groups, type Group, type InsertGroup, sites, type Site, type InsertSite, meters, type Meter, type InsertMeter, readings, type Reading, type InsertReading } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Groups
  getGroups(): Promise<Group[]>;
  createGroup(group: InsertGroup): Promise<Group>;

  // Sites
  getSites(): Promise<Site[]>;
  getSitesByGroup(groupId: number): Promise<Site[]>;
  createSite(site: InsertSite): Promise<Site>;

  // Meters
  getMeters(): Promise<Meter[]>;
  getMetersBySite(siteId: number): Promise<Meter[]>;
  createMeter(meter: InsertMeter): Promise<Meter>;

  // Readings
  getReadings(meterId: number): Promise<Reading[]>;
  createReading(reading: InsertReading): Promise<Reading>;
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

  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const [group] = await db.insert(groups).values(insertGroup).returning();
    return group;
  }

  async getSites(): Promise<Site[]> {
    return await db.select().from(sites);
  }

  async getSitesByGroup(groupId: number): Promise<Site[]> {
    return await db.select().from(sites).where(eq(sites.groupId, groupId));
  }

  async createSite(insertSite: InsertSite): Promise<Site> {
    const [site] = await db.insert(sites).values(insertSite).returning();
    return site;
  }

  async getMeters(): Promise<Meter[]> {
    return await db.select().from(meters);
  }

  async getMetersBySite(siteId: number): Promise<Meter[]> {
    return await db.select().from(meters).where(eq(meters.siteId, siteId));
  }

  async createMeter(insertMeter: InsertMeter): Promise<Meter> {
    const [meter] = await db.insert(meters).values(insertMeter).returning();
    return meter;
  }

  async getReadings(meterId: number): Promise<Reading[]> {
    return await db.select().from(readings).where(eq(readings.meterId, meterId));
  }

  async createReading(insertReading: InsertReading): Promise<Reading> {
    const [reading] = await db.insert(readings).values(insertReading).returning();
    return reading;
  }
}

export const storage = new DatabaseStorage();

import { 
  users, type User, type InsertUser,
  sites, type Site, 
  groups, type Group,
  siteGroups,
  dataSets, type DataSet,
  dataRecords, type DataRecord,
  contracts, type Contract, type InsertContract,
  contractCharges, type ContractCharge, type InsertContractCharge,
  chargeTypes, type ChargeType,
  utilities,
  todoItems, type TodoItem, type InsertTodo
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
  updateSite(id: number, data: Partial<Site>): Promise<Site>;

  // Data Sets (Meters)
  getDataSet(id: number): Promise<DataSet | undefined>;
  getDataSets(): Promise<DataSet[]>;
  getDataSetsBySite(siteId: number): Promise<DataSet[]>;
  createDataSet(dataSet: any): Promise<DataSet>;
  updateDataSet(id: number, data: Partial<DataSet>): Promise<DataSet>;

  // Invoices (Readings)
  getDataRecords(dataSetId: number): Promise<DataRecord[]>;

  // Utilities
  getUtilities(): Promise<any[]>;

  // Contracts
  getContracts(): Promise<Contract[]>;
  getContractsByDataSet(dataSetId: number): Promise<Contract[]>;
  getContract(id: number): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, data: Partial<Contract>): Promise<Contract>;
  deleteContract(id: number): Promise<void>;

  // Contract Charges
  getContractCharges(contractId: number): Promise<ContractCharge[]>;
  createContractCharge(charge: InsertContractCharge): Promise<ContractCharge>;
  updateContractCharge(id: number, data: Partial<ContractCharge>): Promise<ContractCharge>;
  deleteContractCharge(id: number): Promise<void>;

  // Charge Types
  getChargeTypes(): Promise<ChargeType[]>;
  createChargeType(name: string): Promise<ChargeType>;

  // Todo Items
  getTodoItems(): Promise<TodoItem[]>;
  createTodoItem(item: InsertTodo): Promise<TodoItem>;
  toggleTodoItem(id: number, isDone: boolean): Promise<TodoItem>;
  deleteTodoItem(id: number): Promise<void>;
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
    const [updated] = await db.update(sites).set({ name, lastUpdate: new Date() }).where(eq(sites.id, id)).returning();
    return updated;
  }

  async updateSite(id: number, data: Partial<Site>): Promise<Site> {
    const [updated] = await db.update(sites).set({ ...data, lastUpdate: new Date() }).where(eq(sites.id, id)).returning();
    return updated;
  }

  async getDataSet(id: number): Promise<DataSet | undefined> {
    const [dataSet] = await db.select().from(dataSets).where(eq(dataSets.id, id));
    return dataSet;
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

  async updateDataSet(id: number, data: Partial<DataSet>): Promise<DataSet> {
    const [updated] = await db.update(dataSets).set({ ...data, lastUpdate: new Date() }).where(eq(dataSets.id, id)).returning();
    return updated;
  }

  async getDataRecords(dataSetId: number): Promise<DataRecord[]> {
    return await db.select().from(dataRecords).where(eq(dataRecords.dataSetId, dataSetId));
  }

  async getUtilities(): Promise<any[]> {
    return await db.select().from(utilities);
  }

  async getContracts(): Promise<Contract[]> {
    return await db.select().from(contracts);
  }

  async getContractsByDataSet(dataSetId: number): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.dataSetId, dataSetId));
  }

  async getContract(id: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db.insert(contracts).values(contract).returning();
    return newContract;
  }

  async updateContract(id: number, data: Partial<Contract>): Promise<Contract> {
    const [updated] = await db.update(contracts).set({ ...data }).where(eq(contracts.id, id)).returning();
    return updated;
  }

  async deleteContract(id: number): Promise<void> {
    await db.delete(contractCharges).where(eq(contractCharges.contractId, id));
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  async getContractCharges(contractId: number): Promise<ContractCharge[]> {
    return await db.select().from(contractCharges).where(eq(contractCharges.contractId, contractId));
  }

  async createContractCharge(charge: InsertContractCharge): Promise<ContractCharge> {
    const [newCharge] = await db.insert(contractCharges).values(charge).returning();
    return newCharge;
  }

  async updateContractCharge(id: number, data: Partial<ContractCharge>): Promise<ContractCharge> {
    const [updated] = await db.update(contractCharges).set({ ...data }).where(eq(contractCharges.id, id)).returning();
    return updated;
  }

  async deleteContractCharge(id: number): Promise<void> {
    await db.delete(contractCharges).where(eq(contractCharges.id, id));
  }

  async getChargeTypes(): Promise<ChargeType[]> {
    return await db.select().from(chargeTypes);
  }

  async createChargeType(name: string): Promise<ChargeType> {
    const [newType] = await db.insert(chargeTypes).values({ name }).returning();
    return newType;
  }

  async getTodoItems(): Promise<TodoItem[]> {
    return await db.select().from(todoItems).orderBy(todoItems.createdAt);
  }

  async createTodoItem(item: InsertTodo): Promise<TodoItem> {
    const [newItem] = await db.insert(todoItems).values(item).returning();
    return newItem;
  }

  async toggleTodoItem(id: number, isDone: boolean): Promise<TodoItem> {
    const [updated] = await db.update(todoItems).set({ isDone }).where(eq(todoItems.id, id)).returning();
    return updated;
  }

  async deleteTodoItem(id: number): Promise<void> {
    await db.delete(todoItems).where(eq(todoItems.id, id));
  }
}

export const storage = new DatabaseStorage();

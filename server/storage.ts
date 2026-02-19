import { 
  users, type User, type InsertUser,
  sites, type Site, 
  groups, type Group,
  siteGroups,
  userGroups,
  dataSets, type DataSet,
  dataRecords, type DataRecord,
  contracts, type Contract, type InsertContract,
  contractCharges, type ContractCharge, type InsertContractCharge,
  contractData, type ContractData,
  chargeTypes, type ChargeType,
  utilities,
  todoItems, type TodoItem, type InsertTodo
} from "@shared/schema.js";
import { db } from "./db.js";
import { eq, and, inArray, notInArray, sql, not, between } from "drizzle-orm";

const DEGREE_DAY_GROUP_IDS = [
  70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87,
  353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370,
];

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Groups
  getGroups(): Promise<Group[]>;
  getGroupsWithSites(): Promise<Group[]>;
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

  // Contract Data (time-of-use rates)
  getContractData(contractId: number): Promise<ContractData[]>;
  getContractDataByContractIds(contractIds: number[]): Promise<ContractData[]>;

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

  // User Groups
  getUserGroupIds(userId: number): Promise<number[]>;
  setUserGroups(userId: number, groupIds: number[]): Promise<void>;
  getAllUsers(): Promise<Omit<User, 'password'>[]>;
  updateUser(id: number, data: { role?: string; username?: string; password?: string }): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Filtered access
  getGroupsForUser(userId: number): Promise<Group[]>;
  getSiteIdsForUser(userId: number): Promise<number[]>;
  getSitesForUser(userId: number): Promise<Site[]>;
  getDataSetsForUser(userId: number): Promise<DataSet[]>;
  getGroupsHierarchyForUser(userId: number): Promise<any>;
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

  async getGroupsWithSites(): Promise<Group[]> {
    return await db.select().from(groups).where(notInArray(groups.id, DEGREE_DAY_GROUP_IDS));
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

    const groupsWithSites = allGroups
      .filter(g => !DEGREE_DAY_GROUP_IDS.includes(g.id))
      .map(g => {
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

  async getContractData(contractId: number): Promise<ContractData[]> {
    return await db.select().from(contractData).where(eq(contractData.contractId, contractId));
  }

  async getContractDataByContractIds(contractIds: number[]): Promise<ContractData[]> {
    if (contractIds.length === 0) return [];
    return await db.select().from(contractData).where(inArray(contractData.contractId, contractIds));
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

  async getUserGroupIds(userId: number): Promise<number[]> {
    const rows = await db.select({ groupId: userGroups.groupId })
      .from(userGroups)
      .where(eq(userGroups.userId, userId));
    return rows.map(r => r.groupId);
  }

  async setUserGroups(userId: number, groupIds: number[]): Promise<void> {
    await db.delete(userGroups).where(eq(userGroups.userId, userId));
    if (groupIds.length > 0) {
      await db.insert(userGroups).values(
        groupIds.map(groupId => ({ userId, groupId }))
      );
    }
  }

  async getAllUsers(): Promise<Omit<User, 'password'>[]> {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      role: users.role,
    }).from(users);
    return allUsers;
  }

  async updateUser(id: number, data: { role?: string; username?: string; password?: string }): Promise<User> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getGroupsForUser(userId: number): Promise<Group[]> {
    const groupIds = await this.getUserGroupIds(userId);
    const filtered = groupIds.filter(id => !DEGREE_DAY_GROUP_IDS.includes(id));
    if (filtered.length === 0) return [];
    return await db.select().from(groups).where(inArray(groups.id, filtered));
  }

  async getSiteIdsForUser(userId: number): Promise<number[]> {
    const groupIds = await this.getUserGroupIds(userId);
    if (groupIds.length === 0) return [];
    const rows = await db.select({ siteId: siteGroups.siteId })
      .from(siteGroups)
      .where(inArray(siteGroups.groupId, groupIds));
    return Array.from(new Set(rows.map(r => r.siteId)));
  }

  async getSitesForUser(userId: number): Promise<Site[]> {
    const siteIds = await this.getSiteIdsForUser(userId);
    if (siteIds.length === 0) return [];
    return await db.select().from(sites).where(inArray(sites.id, siteIds));
  }

  async getDataSetsForUser(userId: number): Promise<DataSet[]> {
    const siteIds = await this.getSiteIdsForUser(userId);
    if (siteIds.length === 0) return [];
    return await db.select().from(dataSets).where(inArray(dataSets.siteId, siteIds));
  }

  async getGroupsHierarchyForUser(userId: number): Promise<any> {
    const groupIds = await this.getUserGroupIds(userId);
    if (groupIds.length === 0) return { groups: [], unassigned: [] };

    const userGroupsList = await db.select().from(groups).where(inArray(groups.id, groupIds));
    const allSiteGroups = await db.select().from(siteGroups).where(inArray(siteGroups.groupId, groupIds));
    const siteIds = Array.from(new Set(allSiteGroups.map(sg => sg.siteId)));
    
    if (siteIds.length === 0) {
      return { groups: userGroupsList.map(g => ({ ...g, sites: [] })), unassigned: [] };
    }

    const userSites = await db.select().from(sites).where(inArray(sites.id, siteIds));
    const userDataSets = await db.select().from(dataSets).where(inArray(dataSets.siteId, siteIds));
    const allUtilities = await db.select().from(utilities);

    const utilityMap = new Map(allUtilities.map(u => [u.id, u]));
    const metersBySite = new Map<number, any[]>();
    for (const ds of userDataSets) {
      const list = metersBySite.get(ds.siteId) || [];
      list.push({
        ...ds,
        utilityName: utilityMap.get(ds.utilityTypeId)?.name || "Unknown",
        utilityCode: utilityMap.get(ds.utilityTypeId)?.code || "",
      });
      metersBySite.set(ds.siteId, list);
    }

    const groupsWithSites = userGroupsList.map(g => {
      const groupSiteIds = allSiteGroups
        .filter(sg => sg.groupId === g.id)
        .map(sg => sg.siteId);
      const groupSites = userSites
        .filter(s => groupSiteIds.includes(s.id))
        .map(s => ({
          ...s,
          meters: metersBySite.get(s.id) || [],
        }));
      return { ...g, sites: groupSites };
    });

    return { groups: groupsWithSites, unassigned: [] };
  }
}

export const storage = new DatabaseStorage();

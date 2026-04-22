import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["admin", "manager", "staff"]);
export const projectStatusEnum = pgEnum("project_status", ["TENDER", "PENAWARAN", "NEGO", "PO", "KONTRAK", "SELESAI", "BATAL"]);
export const procurementTypeEnum = pgEnum("procurement_type", ["BELI_BARU", "STOK_GUDANG", "SUBKON"]);
export const manpowerSourceEnum = pgEnum("manpower_source", ["INTERNAL", "SUBKON"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["IN", "OUT", "RETURN", "ADJUSTMENT"]);
export const planStatusEnum = pgEnum("plan_status", ["DRAFT", "AKTIF", "SELESAI", "BATAL"]);
export const budgetCategoryEnum = pgEnum("budget_category", ["MATERIAL", "MANPOWER", "EQUIPMENT", "OVERHEAD", "LAINNYA"]);

// ─── USER MANAGEMENT ──────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  role: roleEnum("role").notNull().default("staff"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── CRM MODULE ───────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectCode: varchar("project_code", { length: 30 }).unique(),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  customerName: varchar("customer_name", { length: 150 }).notNull(),
  picName: varchar("pic_name", { length: 100 }).notNull(),
  projectValue: decimal("project_value", { precision: 15, scale: 2 }),
  status: projectStatusEnum("status").notNull().default("TENDER"),
  // SOURCE OF TRUTH UNTUK TANGGAL:
  tenderDate: timestamp("tender_date"),
  estimatedFinish: timestamp("estimated_finish"),
  location: varchar("location", { length: 200 }),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sph = pgTable("sph", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  sphNumber: varchar("sph_number", { length: 50 }).notNull(),
  sphValue: decimal("sph_value", { precision: 15, scale: 2 }).notNull(),
  sphDate: timestamp("sph_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  poNumber: varchar("po_number", { length: 50 }).notNull(),
  poValue: decimal("po_value", { precision: 15, scale: 2 }).notNull(),
  poDate: timestamp("po_date").notNull(),
  poFileUrl: varchar("po_file_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  poId: uuid("po_id").references(() => purchaseOrders.id),
  contractNumber: varchar("contract_number", { length: 50 }).notNull(),
  contractValue: decimal("contract_value", { precision: 15, scale: 2 }).notNull(),
  // Tanggal ini akan diwariskan dari Projects via API:
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── PRODUCTION MODULE ────────────────────────────────────────────────────────

export const productionPlans = pgTable("production_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").references(() => contracts.id, { onDelete: "cascade" }).notNull(),
  spkNumber: varchar("spk_number", { length: 50 }),
  targetVolume: integer("target_volume").notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default("pcs"),
  // Tanggal ini akan diwariskan dari Contracts via API:
  commenceDate: timestamp("commence_date").notNull(),
  deadlineDate: timestamp("deadline_date").notNull(),
  status: planStatusEnum("status").notNull().default("DRAFT"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bomMaterials = pgTable("bom_materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").references(() => productionPlans.id, { onDelete: "cascade" }).notNull(),
  materialName: varchar("material_name", { length: 100 }).notNull(),
  estimatedQty: decimal("estimated_qty", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  procurementType: procurementTypeEnum("procurement_type").notNull().default("BELI_BARU"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }),
  notes: text("notes"),
});

export const manpowerPlans = pgTable("manpower_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").references(() => productionPlans.id, { onDelete: "cascade" }).notNull(),
  sourceType: manpowerSourceEnum("source_type").notNull().default("INTERNAL"),
  headcount: integer("headcount").notNull(),
  roleDescription: varchar("role_description", { length: 100 }).notNull(),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }),
  notes: text("notes"),
});

export const dailyReports = pgTable("daily_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").references(() => productionPlans.id, { onDelete: "cascade" }).notNull(),
  reportedBy: uuid("reported_by").references(() => users.id).notNull(),
  reportDate: timestamp("report_date").notNull(),
  fgQty: integer("fg_qty").notNull().default(0),
  damagedQty: integer("damaged_qty").notNull().default(0),
  returnQty: integer("return_qty").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── GUDANG PUSAT (MASTER) ───────────────────────────────────────────────────

export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").default("Raw Material"),
  unit: varchar("unit", { length: 20 }).notNull(),
  stock: decimal("stock", { precision: 15, scale: 3 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const materialInbound = pgTable("material_inbound", {
  id: uuid("id").primaryKey().defaultRandom(),
  materialId: uuid("material_id").references(() => materials.id, { onDelete: "cascade" }).notNull(),
  vendorName: text("vendor_name").notNull(),
  qty: decimal("qty", { precision: 15, scale: 3 }).notNull(),
  entryDate: timestamp("entry_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const materialOutbound = pgTable("material_outbound", {
  id: uuid("id").primaryKey().defaultRandom(),
  materialId: uuid("material_id").references(() => materials.id, { onDelete: "cascade" }).notNull(),
  recipient: text("recipient").notNull(),
  qty: decimal("qty", { precision: 15, scale: 3 }).notNull(),
  exitDate: timestamp("exit_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── LOGISTIK PROYEK ─────────────────────────────────────────────────────────

export const inventoryLog = pgTable("inventory_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").references(() => productionPlans.id, { onDelete: "cascade" }).notNull(),
  bomId: uuid("bom_id").references(() => bomMaterials.id),
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  qty: decimal("qty", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  transactionDate: timestamp("transaction_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── BUDGETING MODULE ────────────────────────────────────────────────────────

export const budgetRab = pgTable("budget_rab", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").references(() => productionPlans.id, { onDelete: "cascade" }).notNull(),
  category: budgetCategoryEnum("category").notNull(),
  description: varchar("description", { length: 200 }).notNull(),
  plannedAmount: decimal("planned_amount", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
});

export const budgetRealization = pgTable("budget_realization", {
  id: uuid("id").primaryKey().defaultRandom(),
  rabId: uuid("rab_id").references(() => budgetRab.id, { onDelete: "cascade" }).notNull(),
  realizedAmount: decimal("realized_amount", { precision: 15, scale: 2 }).notNull(),
  realizationDate: timestamp("realization_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── INVENTORY ITEMS & OTHERS ────────────────────────────────────────────────

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemName: text("item_name").notNull(),
  unitPrice: integer("unit_price").default(0),
});

export const projectBudgets = pgTable("project_budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  totalAllocation: integer("total_allocation").notNull(),
  materialAllocation: integer("material_allocation").default(0),
  laborAllocation: integer("labor_allocation").default(0),
  otherAllocation: integer("other_allocation").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const operationalExpenses = pgTable("operational_expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").references(() => productionPlans.id).notNull(),
  expenseType: text("expense_type").notNull(),
  amount: integer("amount").notNull(),
  expenseDate: timestamp("expense_date").defaultNow(),
  notes: text("notes"),
});

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  dailyReports: many(dailyReports),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  createdBy: one(users, { fields: [projects.createdBy], references: [users.id] }),
  sph: many(sph),
  purchaseOrders: many(purchaseOrders),
  contracts: many(contracts),
  projectBudgets: many(projectBudgets),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  project: one(projects, { fields: [contracts.projectId], references: [projects.id] }),
  po: one(purchaseOrders, { fields: [contracts.poId], references: [purchaseOrders.id] }),
  plans: many(productionPlans),
}));

export const productionPlansRelations = relations(productionPlans, ({ one, many }) => ({
  contract: one(contracts, { fields: [productionPlans.contractId], references: [contracts.id] }),
  bomMaterials: many(bomMaterials),
  manpowerPlans: many(manpowerPlans),
  dailyReports: many(dailyReports),
  inventoryLog: many(inventoryLog),
  budgetRab: many(budgetRab),
  operationalExpenses: many(operationalExpenses),
}));

export const manpowerPlansRelations = relations(manpowerPlans, ({ one }) => ({
  plan: one(productionPlans, { fields: [manpowerPlans.planId], references: [productionPlans.id] }),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  inbounds: many(materialInbound),
  outbounds: many(materialOutbound),
}));

export const materialInboundRelations = relations(materialInbound, ({ one }) => ({
  material: one(materials, { fields: [materialInbound.materialId], references: [materials.id] }),
}));

export const materialOutboundRelations = relations(materialOutbound, ({ one }) => ({
  material: one(materials, { fields: [materialOutbound.materialId], references: [materials.id] }),
}));

export const dailyReportsRelations = relations(dailyReports, ({ one }) => ({
  plan: one(productionPlans, { fields: [dailyReports.planId], references: [productionPlans.id] }),
  user: one(users, { fields: [dailyReports.reportedBy], references: [users.id] }),
}));

export const bomMaterialsRelations = relations(bomMaterials, ({ one }) => ({
  plan: one(productionPlans, { fields: [bomMaterials.planId], references: [productionPlans.id] }),
}));

export const inventoryLogRelations = relations(inventoryLog, ({ one }) => ({
  plan: one(productionPlans, { fields: [inventoryLog.planId], references: [productionPlans.id] }),
}));

export const projectBudgetsRelations = relations(projectBudgets, ({ one }) => ({
  project: one(projects, { fields: [projectBudgets.projectId], references: [projects.id] }),
}));

export const operationalExpensesRelations = relations(operationalExpenses, ({ one }) => ({
  plan: one(productionPlans, { fields: [operationalExpenses.planId], references: [productionPlans.id] }),
}));

export const budgetRabRelations = relations(budgetRab, ({ one, many }) => ({
  plan: one(productionPlans, { fields: [budgetRab.planId], references: [productionPlans.id] }),
  realizations: many(budgetRealization),
}));

export const budgetRealizationRelations = relations(budgetRealization, ({ one }) => ({
  rab: one(budgetRab, { fields: [budgetRealization.rabId], references: [budgetRab.id] }),
}));
import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["admin", "manager", "staff", "assistant_manager"]);
export const projectStatusEnum = pgEnum("project_status", ["TENDER", "PENAWARAN", "NEGO", "PO", "KONTRAK", "SELESAI", "BATAL"]);
export const procurementTypeEnum = pgEnum("procurement_type", ["BELI_BARU", "STOK_GUDANG", "SUBKON"]);
export const manpowerSourceEnum = pgEnum("manpower_source", ["INTERNAL", "SUBKON"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["IN", "OUT", "RETURN", "ADJUSTMENT"]);
export const planStatusEnum = pgEnum("plan_status", ["DRAFT", "AKTIF", "SELESAI", "BATAL"]);
export const budgetCategoryEnum = pgEnum("budget_category", ["MATERIAL", "MANPOWER", "EQUIPMENT", "OVERHEAD", "LAINNYA"]);
// 🔥 ENUM BARU UNTUK STATUS PR 🔥
export const prStatusEnum = pgEnum("pr_status", ["PENDING", "APPROVED", "REJECTED"]);
// 🔥 ENUM BARU UNTUK STATUS RAB 🔥
export const rabStatusEnum = pgEnum("rab_status", ["DRAFT", "APPROVED", "REJECTED"]);

// ─── USER MANAGEMENT ──────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  role: roleEnum("role").notNull().default("staff"),
  isActive: boolean("is_active").default(true).notNull(),
  profilePic: text("profile_pic"),
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
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── PRODUCTION MODULE ────────────────────────────────────────────────────────

export const productionPlans = pgTable("production_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").references(() => contracts.id, { onDelete: "cascade" }).notNull(),
  rabId: uuid("rab_id").references(() => rabs.id, { onDelete: "set null" }), // 🔥 Hubungkan ke RAB
  spkNumber: varchar("spk_number", { length: 50 }),
  targetVolume: integer("target_volume").notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default("pcs"),
  overheadPercentage: integer("overhead_percentage").default(10),
  actualMaterial: integer("actual_material").default(0),
  actualManpower: integer("actual_manpower").default(0),
  actualOverhead: integer("actual_overhead").default(0),
  commenceDate: timestamp("commence_date").notNull(),
  deadlineDate: timestamp("deadline_date").notNull(),
  status: planStatusEnum("status").notNull().default("DRAFT"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").default("Raw Material"),
  unit: varchar("unit", { length: 20 }).notNull(),
  stock: decimal("stock", { precision: 15, scale: 3 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bomMaterials = pgTable("bom_materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").references(() => productionPlans.id, { onDelete: "cascade" }), // nullable untuk transisi ke RAB
  rabId: uuid("rab_id").references(() => rabs.id, { onDelete: "cascade" }), // 🔥 Hubungkan ke RAB
  materialId: uuid("material_id").references(() => materials.id),
  materialName: varchar("material_name", { length: 100 }).notNull(),
  estimatedQty: decimal("estimated_qty", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  procurementType: procurementTypeEnum("procurement_type").notNull().default("BELI_BARU"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }),
  notes: text("notes"),
});

export const manpowerPlans = pgTable("manpower_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").references(() => productionPlans.id, { onDelete: "cascade" }), // nullable untuk transisi ke RAB
  rabId: uuid("rab_id").references(() => rabs.id, { onDelete: "cascade" }), // 🔥 Hubungkan ke RAB
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

export const finishedGoods = pgTable("finished_goods", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").references(() => productionPlans.id), 
  productName: varchar("product_name", { length: 200 }).notNull(),
  stock: integer("stock").notNull().default(0),
  unit: varchar("unit", { length: 20 }).notNull().default("pcs"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fgOutbound = pgTable("fg_outbound", {
  id: uuid("id").primaryKey().defaultRandom(),
  fgId: uuid("fg_id").references(() => finishedGoods.id, { onDelete: "cascade" }).notNull(),
  deliveryNumber: varchar("delivery_number", { length: 100 }), 
  recipient: varchar("recipient", { length: 200 }).notNull(), 
  qty: integer("qty").notNull(),
  exitDate: timestamp("exit_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

// 🔥 TABEL BARU UNTUK PURCHASE REQUEST (PR) 🔥
export const purchaseRequests = pgTable("purchase_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").references(() => productionPlans.id, { onDelete: "cascade" }).notNull(),
  prNumber: varchar("pr_number", { length: 50 }).notNull(),
  requestDate: timestamp("request_date").defaultNow().notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  status: prStatusEnum("status").notNull().default("PENDING"), // PENDING, APPROVED, REJECTED
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

// 🔥 TABEL BARU UNTUK RENCANA ANGGARAN BIAYA (RAB) 🔥
export const rabs = pgTable("rabs", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").references(() => contracts.id, { onDelete: "cascade" }).notNull(),
  rabNumber: varchar("rab_number", { length: 50 }).notNull().unique(),
  targetVolume: integer("target_volume").notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default("pcs"),
  depreciationMethod: varchar("depreciation_method", { length: 20 }).notNull().default("DIRECT"), // DIRECT atau FORMULA
  depreciationValue: decimal("depreciation_value", { precision: 15, scale: 2 }).notNull().default("0"),
  fixedCostMethod: varchar("fixed_cost_method", { length: 20 }).notNull().default("DIRECT"), // DIRECT atau FORMULA
  fixedCostValue: decimal("fixed_cost_value", { precision: 15, scale: 2 }).notNull().default("0"),
  overheadHo: decimal("overhead_ho", { precision: 15, scale: 2 }).notNull().default("0"),
  status: rabStatusEnum("status").notNull().default("DRAFT"), // DRAFT, APPROVED, REJECTED
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 🔥 TABEL BARU UNTUK PELACAKAN UNIT PRODUKSI PRECAST INDIVIDUAL 🔥
export const fgItems = pgTable("fg_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").references(() => productionPlans.id, { onDelete: "cascade" }).notNull(),
  itemCode: varchar("item_code", { length: 100 }).notNull().unique(), // KB-[NoSPK]-[Tanggal]-[RunningNumber]
  productName: varchar("product_name", { length: 200 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("GOOD"), // GOOD, REJECT
  defectReason: text("defect_reason"),
  castingDate: timestamp("casting_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  rabs: many(rabs), // 🔥 Relasi ke RAB
}));

export const productionPlansRelations = relations(productionPlans, ({ one, many }) => ({
  contract: one(contracts, { fields: [productionPlans.contractId], references: [contracts.id] }),
  rab: one(rabs, { fields: [productionPlans.rabId], references: [rabs.id] }), // 🔥 Relasi ke RAB
  bomMaterials: many(bomMaterials),
  manpowerPlans: many(manpowerPlans),
  dailyReports: many(dailyReports),
  inventoryLog: many(inventoryLog),
  budgetRab: many(budgetRab),
  operationalExpenses: many(operationalExpenses),
  finishedGoods: many(finishedGoods),
  purchaseRequests: many(purchaseRequests),
  fgItems: many(fgItems), // 🔥 Relasi ke barang individual
}));

// 🔥 RELASI TABEL PR 🔥
export const purchaseRequestsRelations = relations(purchaseRequests, ({ one }) => ({
  plan: one(productionPlans, { fields: [purchaseRequests.planId], references: [productionPlans.id] }),
}));

export const manpowerPlansRelations = relations(manpowerPlans, ({ one }) => ({
  plan: one(productionPlans, { fields: [manpowerPlans.planId], references: [productionPlans.id] }),
  rab: one(rabs, { fields: [manpowerPlans.rabId], references: [rabs.id] }), // 🔥 Relasi ke RAB
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  inbounds: many(materialInbound),
  outbounds: many(materialOutbound),
  bomMaterials: many(bomMaterials),
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
  rab: one(rabs, { fields: [bomMaterials.rabId], references: [rabs.id] }), // 🔥 Relasi ke RAB
  material: one(materials, { fields: [bomMaterials.materialId], references: [materials.id] }),
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

export const finishedGoodsRelations = relations(finishedGoods, ({ one, many }) => ({
  plan: one(productionPlans, { fields: [finishedGoods.planId], references: [productionPlans.id] }),
  outbounds: many(fgOutbound),
}));

export const fgOutboundRelations = relations(fgOutbound, ({ one }) => ({
  fg: one(finishedGoods, { fields: [fgOutbound.fgId], references: [finishedGoods.id] }),
}));

// 🔥 RELASI TABEL RAB 🔥
export const rabsRelations = relations(rabs, ({ one, many }) => ({
  contract: one(contracts, { fields: [rabs.contractId], references: [contracts.id] }),
  bomMaterials: many(bomMaterials),
  manpowerPlans: many(manpowerPlans),
  productionPlans: many(productionPlans),
}));

// 🔥 RELASI TABEL FG ITEMS (INDIVIDUAL) 🔥
export const fgItemsRelations = relations(fgItems, ({ one }) => ({
  plan: one(productionPlans, { fields: [fgItems.planId], references: [productionPlans.id] }),
}));

// 🔥 TABEL SUPPLIERS 🔥
export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  address: text("address").notNull(),
  category: varchar("category", { length: 100 }).notNull(), // SEMEN, PASIR, BESI, DLL.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 🔥 TABEL SUPPLIER PURCHASE ORDERS (PO KE SUPPLIER) 🔥
export const supplierPurchaseOrders = pgTable("supplier_purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  poNumber: varchar("po_number", { length: 100 }).notNull().unique(),
  orderDate: timestamp("order_date").defaultNow().notNull(),
  status: varchar("status", { length: 50 }).notNull().default("PENDING"), // PENDING, SHIPPED, COMPLETED, CANCELLED
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 🔥 TABEL SUPPLIER PURCHASE ORDER ITEMS 🔥
export const supplierPurchaseOrderItems = pgTable("supplier_purchase_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  poId: uuid("po_id").references(() => supplierPurchaseOrders.id, { onDelete: "cascade" }).notNull(),
  materialId: uuid("material_id").references(() => materials.id).notNull(),
  qty: decimal("qty", { precision: 15, scale: 3 }).notNull(),
  pricePerUnit: decimal("price_per_unit", { precision: 12, scale: 2 }).notNull(),
});

// 🔥 RELASI TABEL SUPPLIERS, SUPPLIER PO, DAN ITEMS 🔥
export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchaseOrders: many(supplierPurchaseOrders),
}));

export const supplierPurchaseOrdersRelations = relations(supplierPurchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [supplierPurchaseOrders.supplierId], references: [suppliers.id] }),
  items: many(supplierPurchaseOrderItems),
}));

export const supplierPurchaseOrderItemsRelations = relations(supplierPurchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(supplierPurchaseOrders, { fields: [supplierPurchaseOrderItems.poId], references: [supplierPurchaseOrders.id] }),
  material: one(materials, { fields: [supplierPurchaseOrderItems.materialId], references: [materials.id] }),
}));
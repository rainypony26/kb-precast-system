import { db } from "./index";
import { 
  projects, contracts, productionPlans, dailyReports, 
  rabs, bomMaterials, manpowerPlans, supplierPurchaseOrders,
  budgetRealization, budgetRab
} from "./schema";
import { eq, sql, desc } from "drizzle-orm";

async function test() {
  try {
    console.log("Starting test query...");
    // 1. Projects
    console.log("Querying projects...");
    const rawProjects = await db
      .select({
        id: projects.id,
        projectName: projects.projectName,
        projectCode: projects.projectCode,
        status: projects.status,
        contractValue: contracts.contractValue,
        actualMaterial: sql<number>`COALESCE(sum(${productionPlans.actualMaterial}), 0)::int`,
        actualManpower: sql<number>`COALESCE(sum(${productionPlans.actualManpower}), 0)::int`,
        actualOverhead: sql<number>`COALESCE(sum(${productionPlans.actualOverhead}), 0)::int`,
      })
      .from(projects)
      .leftJoin(contracts, eq(contracts.projectId, projects.id))
      .leftJoin(productionPlans, eq(productionPlans.contractId, contracts.id))
      .groupBy(projects.id, projects.projectName, projects.projectCode, projects.status, contracts.contractValue)
      .orderBy(desc(contracts.contractValue));
    console.log("rawProjects count:", rawProjects.length);

    // 2. BEP
    console.log("Querying BEP...");
    const rawRabs = await db
      .select({
        projectId: projects.id,
        projectName: projects.projectName,
        contractValue: contracts.contractValue,
        targetVolume: rabs.targetVolume,
        fixedCostValue: rabs.fixedCostValue,
        depreciationValue: rabs.depreciationValue,
        overheadHo: rabs.overheadHo,
        rabId: rabs.id,
      })
      .from(rabs)
      .innerJoin(contracts, eq(rabs.contractId, contracts.id))
      .innerJoin(projects, eq(contracts.projectId, projects.id))
      .where(eq(rabs.status, 'APPROVED'));
    console.log("rawRabs count:", rawRabs.length);

    // 3. Cash flow Inflows
    console.log("Querying Inflows...");
    const rawInflows = await db
      .select({
        month: sql<string>`to_char(${contracts.startDate}, 'YYYY-MM')`,
        total: sql<number>`sum(${contracts.contractValue})::float`
      })
      .from(contracts)
      .groupBy(sql`to_char(${contracts.startDate}, 'YYYY-MM')`);
    console.log("rawInflows count:", rawInflows.length);

    // 4. Outflows PO
    console.log("Querying Outflows PO...");
    const rawOutflowsPo = await db
      .select({
        month: sql<string>`to_char(${supplierPurchaseOrders.orderDate}, 'YYYY-MM')`,
        total: sql<number>`sum(${supplierPurchaseOrders.totalAmount})::float`
      })
      .from(supplierPurchaseOrders)
      .groupBy(sql`to_char(${supplierPurchaseOrders.orderDate}, 'YYYY-MM')`);
    console.log("rawOutflowsPo count:", rawOutflowsPo.length);

    // 5. Outflows Budget
    console.log("Querying Outflows Budget...");
    const rawOutflowsBudget = await db
      .select({
        month: sql<string>`to_char(${budgetRealization.realizationDate}, 'YYYY-MM')`,
        total: sql<number>`sum(${budgetRealization.realizedAmount})::float`
      })
      .from(budgetRealization)
      .groupBy(sql`to_char(${budgetRealization.realizationDate}, 'YYYY-MM')`);
    console.log("rawOutflowsBudget count:", rawOutflowsBudget.length);

    console.log("All queries executed successfully!");
  } catch (err: any) {
    console.error("Query failed with error:", err);
  }
}

test().then(() => process.exit(0));

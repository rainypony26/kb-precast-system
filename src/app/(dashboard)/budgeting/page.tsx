import BudgetingClient from "@/components/crm/budgeting-client";

export default function BudgetPage() {
  // Langsung panggil client component. 
  // Biarkan client yang mengambil data via useEffect agar tidak eror JSON.
  return <BudgetingClient />;
}
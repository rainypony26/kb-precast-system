import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileClient from "@/components/profile/profile-client";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <ProfileClient session={session} />;
}

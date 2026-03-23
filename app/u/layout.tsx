import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { AppPlayerShell } from "@/components/AppPlayerShell";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  const profile = session
    ? await prisma.profile.findUnique({
        where:  { userId: session.user.id },
        select: { username: true, avatarUrl: true },
      })
    : null;

  return (
    <div className="min-h-screen bg-surface-0">
      <SiteHeader
        isAuthenticated={!!session}
        username={profile?.username}
        avatarUrl={profile?.avatarUrl}
      />
      <AppPlayerShell>
        {children}
      </AppPlayerShell>
    </div>
  );
}

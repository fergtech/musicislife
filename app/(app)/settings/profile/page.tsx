import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import type { ProfileRow, SocialLinks } from "@/types";

export const metadata = { title: "Profile Settings" };

export default async function ProfileSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  const serialized: ProfileRow | null = profile
    ? {
        id:          profile.id,
        userId:      profile.userId,
        username:    profile.username,
        avatarUrl:   profile.avatarUrl,
        socialLinks: (profile.socialLinks ?? {}) as SocialLinks,
        isPublic:    profile.isPublic,
        createdAt:   profile.createdAt.toISOString(),
        updatedAt:   profile.updatedAt.toISOString(),
      }
    : null;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Set up your public profile so others can discover your music taste.
        </p>
      </div>
      <ProfileSettingsForm initialProfile={serialized} />
    </div>
  );
}

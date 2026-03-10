import { auth } from "../config/firebase";
import { useAuthContext } from "../context/AuthContext";
import { useMemo } from "react";

type Role = "member" | "officer" | "admin" | "superadmin";

const ROLE_RANK: Record<Role, number> = {
  member: 1,
  officer: 2,
  admin: 3,
  superadmin: 4,
};

function normalizeRole(rawRole: string | undefined, isOfficerByPosition: boolean, isSuperEmail: boolean): Role {
  if (isSuperEmail) {
    return "superadmin";
  }
  if (rawRole === "superadmin" || rawRole === "admin" || rawRole === "officer" || rawRole === "member") {
    return rawRole;
  }
  if (isOfficerByPosition) {
    return "officer";
  }
  return "member";
}

function atLeast(current: Role, required: Role): boolean {
  return ROLE_RANK[current] >= ROLE_RANK[required];
}

export function usePermissions() {
  const { profile } = useAuthContext();
  const currentEmail = auth.currentUser?.email?.toLowerCase() ?? "";
  const isSuperEmail = currentEmail === "admin@fblaatlas.com";
  const isOfficerByPosition =
    Boolean(profile?.officerPosition && profile.officerPosition !== "Member") ||
    Boolean(profile?.chapterRoles?.includes("Chapter Officer")) ||
    Boolean(profile?.chapterRoles?.includes("Regional Officer")) ||
    Boolean(profile?.chapterRoles?.includes("State Officer")) ||
    Boolean(profile?.chapterRoles?.includes("National Officer"));

  const role = normalizeRole(profile?.role, isOfficerByPosition, isSuperEmail);
  return useMemo(
    () => ({
      role,
      isMember: atLeast(role, "member"),
      isOfficer: atLeast(role, "officer"),
      isAdmin: atLeast(role, "admin"),
      isSuperadmin: role === "superadmin",
      canPost: () => atLeast(role, "member"),
      canCreateEvent: () => atLeast(role, "officer"),
      canPostAnnouncement: () => atLeast(role, "officer"),
      canPostMeetingNotes: () => atLeast(role, "officer"),
      canManageTasks: () => atLeast(role, "officer"),
      canVerifyPlacements: () => atLeast(role, "officer"),
      canManageDues: () => atLeast(role, "admin"),
      canBanUsers: () => atLeast(role, "admin"),
      canAdjustXP: () => atLeast(role, "admin"),
      canAccessAdminDash: () => atLeast(role, "admin"),
      canManageAllChapters: () => role === "superadmin",
    }),
    [role],
  );
}

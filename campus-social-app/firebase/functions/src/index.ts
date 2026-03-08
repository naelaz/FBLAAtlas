import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

admin.initializeApp();

/**
 * Syncs Firebase Auth custom claims when users/{uid}.role changes.
 * If role == "admin", writes { role: "admin" } custom claim.
 * Otherwise clears role claim back to "member".
 */
export const syncAdminClaim = onDocumentWritten("users/{uid}", async (event) => {
  const uid = event.params.uid;
  const afterData = event.data?.after?.data() as { role?: string } | undefined;
  const role = afterData?.role === "admin" ? "admin" : "member";

  try {
    const user = await admin.auth().getUser(uid);
    const existingClaims = user.customClaims ?? {};
    const nextClaims = {
      ...existingClaims,
      role,
    };
    await admin.auth().setCustomUserClaims(uid, nextClaims);
    logger.info("Updated custom claim for user", { uid, role });
  } catch (error) {
    logger.error("Failed to sync admin custom claim", { uid, error });
  }
});


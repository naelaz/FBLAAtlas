import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

admin.initializeApp();

/**
 * Syncs Firebase Auth custom claims when users/{uid}.role changes.
 * Supports role claims: member, officer, admin, superadmin.
 */
/**
 * Proxies FBLA guideline PDFs so they can be embedded in iframes.
 * Fetches the connect.fbla.org redirect page, extracts the signed S3 URL,
 * then fetches and streams the actual PDF bytes back.
 */
export const pdfProxy = onRequest({ cors: true, memory: "256MiB", invoker: "public" }, async (req, res) => {
  const pdfPath = req.query.path as string | undefined;
  if (!pdfPath) {
    res.status(400).send("Missing path parameter");
    return;
  }

  const allowedPrefix = "https://connect.fbla.org/headquarters/files/";
  const fullUrl = pdfPath.startsWith("http") ? pdfPath : `${allowedPrefix}${pdfPath}`;

  if (!fullUrl.startsWith(allowedPrefix)) {
    res.status(403).send("URL not allowed");
    return;
  }

  try {
    const pageResponse = await fetch(fullUrl);
    const html = await pageResponse.text();

    let s3Url = "";
    const scriptMatch = html.match(/window\.location\.href\s*=\s*"([^"]+)"/);
    if (scriptMatch?.[1]) {
      s3Url = scriptMatch[1].replace(/\\\//g, "/");
    } else {
      const hrefMatch = html.match(/href="(https:\/\/greektrack[^"]*\.pdf[^"]*)"/);
      if (hrefMatch?.[1]) {
        s3Url = hrefMatch[1].replace(/&amp;/g, "&");
      }
    }

    if (!s3Url) {
      res.status(502).send("Could not resolve PDF URL");
      return;
    }

    const pdfResponse = await fetch(s3Url);
    if (!pdfResponse.ok) {
      res.status(502).send("Failed to fetch PDF from source");
      return;
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    logger.error("PDF proxy failed", { error, fullUrl });
    res.status(500).send("PDF proxy error");
  }
});

export const syncAdminClaim = onDocumentWritten("users/{uid}", async (event) => {
  const uid = event.params.uid;
  const afterData = event.data?.after?.data() as { role?: string } | undefined;
  const role =
    afterData?.role === "superadmin" ||
    afterData?.role === "admin" ||
    afterData?.role === "officer"
      ? afterData.role
      : "member";

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

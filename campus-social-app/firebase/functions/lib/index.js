"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAdminClaim = exports.pdfProxy = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
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
exports.pdfProxy = (0, https_1.onRequest)({ cors: true, memory: "256MiB" }, async (req, res) => {
    const pdfPath = req.query.path;
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
        }
        else {
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
    }
    catch (error) {
        firebase_functions_1.logger.error("PDF proxy failed", { error, fullUrl });
        res.status(500).send("PDF proxy error");
    }
});
exports.syncAdminClaim = (0, firestore_1.onDocumentWritten)("users/{uid}", async (event) => {
    const uid = event.params.uid;
    const afterData = event.data?.after?.data();
    const role = afterData?.role === "superadmin" ||
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
        firebase_functions_1.logger.info("Updated custom claim for user", { uid, role });
    }
    catch (error) {
        firebase_functions_1.logger.error("Failed to sync admin custom claim", { uid, error });
    }
});

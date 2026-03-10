import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { FBLA_GLOSSARY_TERMS, GlossaryTerm } from "../constants/fblaGlossary";
import { db } from "../config/firebase";

const GLOSSARY_META_ID = "fbla_glossary_seed_v1";

export async function ensureGlossarySeeded(): Promise<void> {
  const metaRef = doc(db, "app_meta", GLOSSARY_META_ID);
  const metaSnap = await getDoc(metaRef);
  if (metaSnap.exists()) {
    return;
  }

  const batchWrites = FBLA_GLOSSARY_TERMS.map((term) =>
    setDoc(
      doc(db, "fblaGlossary", term.id),
      {
        ...term,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  );
  await Promise.all(batchWrites);
  await setDoc(metaRef, { seededAt: serverTimestamp(), count: FBLA_GLOSSARY_TERMS.length }, { merge: true });
}

export async function fetchGlossaryTerms(): Promise<GlossaryTerm[]> {
  await ensureGlossarySeeded();
  const snap = await getDocs(query(collection(db, "fblaGlossary"), orderBy("term"), limit(300)));
  const rows = snap.docs.map((row) => {
    const data = row.data() as Record<string, unknown>;
    return {
      id: row.id,
      term: typeof data.term === "string" ? data.term : "",
      category:
        data.category === "FBLA" ||
        data.category === "Parliamentary" ||
        data.category === "Business" ||
        data.category === "Finance" ||
        data.category === "Marketing" ||
        data.category === "Technology" ||
        data.category === "Leadership"
          ? data.category
          : "FBLA",
      definition: typeof data.definition === "string" ? data.definition : "",
      related: Array.isArray(data.related)
        ? data.related.filter((item): item is string => typeof item === "string")
        : [],
    } satisfies GlossaryTerm;
  });
  return rows.filter((row) => Boolean(row.term));
}

export function findGlossaryTermInText(text: string, terms: GlossaryTerm[]): GlossaryTerm | null {
  const lower = text.toLowerCase();
  for (const term of terms) {
    if (lower.includes(term.term.toLowerCase())) {
      return term;
    }
  }
  return null;
}


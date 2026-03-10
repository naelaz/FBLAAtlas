export interface School {
  name: string;
  city: string;
  state: string;
  level: string;
}

function normalizeSchool(raw: Record<string, unknown>): School | null {
  const fields =
    raw.fields && typeof raw.fields === "object"
      ? (raw.fields as Record<string, unknown>)
      : raw;

  const name = typeof fields.name === "string" ? fields.name : "";
  const city =
    typeof fields.city === "string"
      ? fields.city
      : typeof fields.city_name === "string"
        ? fields.city_name
        : "";
  const state =
    typeof fields.state === "string"
      ? fields.state
      : typeof fields.state_name === "string"
        ? fields.state_name
        : "";
  const level =
    typeof fields.level === "string"
      ? fields.level
      : typeof fields.school_level === "string"
        ? fields.school_level
        : "";

  if (!name || !state) {
    return null;
  }

  return { name, city, state, level };
}

export const formatSchoolLabel = (school: School): string => {
  const location = school.city ? `${school.city}, ${school.state}` : school.state;
  return `${school.name} — ${location}`;
};

export const searchSchools = async (query: string, limit = 20): Promise<School[]> => {
  const queryValue = query.trim();
  if (queryValue.length < 2) {
    return [];
  }

  try {
    const sanitized = queryValue.replace(/"/g, "");
    const where = encodeURIComponent(`search(name,"${sanitized}")`);
    const url = `https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/us-public-schools/records?limit=${limit}&where=${where}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`School search request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      results?: Array<Record<string, unknown>>;
    };

    const schools = (payload.results ?? [])
      .map(normalizeSchool)
      .filter((item): item is School => Boolean(item));

    const highSchools = schools.filter((school) => school.level.toLowerCase().includes("high"));
    return highSchools.length > 0 ? highSchools : schools;
  } catch (error) {
    console.error("School search failed:", error);
    return [];
  }
};

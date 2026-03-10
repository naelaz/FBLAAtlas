import { School, searchSchools } from "../utils/schoolSearch";

export type SchoolSearchResult = School;

export async function getSchools(query: string, limit = 20): Promise<SchoolSearchResult[]> {
  return searchSchools(query, limit);
}

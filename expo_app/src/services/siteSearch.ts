export type SiteSearchResult = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: 'FBLA Website';
};

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function readTag(block: string, tag: 'title' | 'link' | 'description'): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match) {
    return '';
  }
  return decodeXml(match[1]).trim();
}

export async function searchFblaWebsite(query: string): Promise<SiteSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const searchQuery = `site:fbla.org OR site:connect.fbla.org ${trimmed}`;
  const url = `https://www.bing.com/search?format=rss&q=${encodeURIComponent(searchQuery)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Search provider unavailable');
  }
  const xml = await response.text();
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  const results: SiteSearchResult[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const title = readTag(item, 'title');
    const link = readTag(item, 'link');
    const snippet = readTag(item, 'description');
    if (!link || seen.has(link)) {
      continue;
    }
    seen.add(link);
    results.push({
      id: link,
      title: title || link,
      url: link,
      snippet,
      source: 'FBLA Website',
    });
  }

  return results;
}

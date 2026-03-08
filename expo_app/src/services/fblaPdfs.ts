export type FblaDivision = 'High School' | 'Middle School' | 'Collegiate';

export type FblaPdfLink = {
  id: string;
  title: string;
  url: string;
  division: FblaDivision;
};

const SOURCE_PAGES: Array<{ division: FblaDivision; url: string }> = [
  { division: 'High School', url: 'https://www.fbla.org/high-school/competitive-events/' },
  { division: 'Middle School', url: 'https://www.fbla.org/middle-school/competitive-events/' },
  { division: 'Collegiate', url: 'https://www.fbla.org/collegiate/competitive-events/' },
];

const PDF_URL_PATTERN = /https:\/\/connect\.fbla\.org\/[^"'<>\\s]+?\.pdf/gi;

function decodeTitleFromUrl(url: string): string {
  const fileName = url.split('/').pop() ?? 'Event-Guidelines.pdf';
  const clean = decodeURIComponent(fileName).replace(/\.pdf$/i, '');
  return clean
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchFblaEventPdfs(): Promise<FblaPdfLink[]> {
  const results: FblaPdfLink[] = [];

  for (const source of SOURCE_PAGES) {
    try {
      const response = await fetch(source.url);
      if (!response.ok) {
        continue;
      }
      const html = await response.text();
      const matches = html.match(PDF_URL_PATTERN) ?? [];
      const uniqueUrls = Array.from(new Set(matches));
      for (const url of uniqueUrls) {
        results.push({
          id: `${source.division}:${url}`,
          title: decodeTitleFromUrl(url),
          url,
          division: source.division,
        });
      }
    } catch {
      // Ignore a single source failure and continue collecting from others.
    }
  }

  return results.sort((a, b) => {
    if (a.division === b.division) {
      return a.title.localeCompare(b.title);
    }
    return a.division.localeCompare(b.division);
  });
}

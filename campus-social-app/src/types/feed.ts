export type FeedItem = {
  id: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
};

export type HomeFeedResponse = {
  items: FeedItem[];
  source: "firestore" | "fallback";
};


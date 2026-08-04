export type TweetType = "tweet" | "retweet" | "reply";

export interface TweetMedia {
  id: string;
  previewUrl: string;
  type: string;
}

export interface TweetRecord {
  id: string;
  text: string;
  retweet: number;
  likes: number;
  type: TweetType;
  createdAt: Date;
  media: TweetMedia[];
  sourceTweetId?: string;
}

export interface TweetFilters {
  tweetType: TweetType[];
  startDate: string | null;
  endDate: string | null;
  minLikes: number | null;
  maxLikes: number | null;
  minRetweet: number | null;
  maxRetweet: number | null;
  containsMedia: boolean;
}

export interface TweetCriteria {
  query: string;
  filters: TweetFilters;
}

export interface TweetCursor {
  createdAt: Date;
  id: string;
}

export interface TweetPage {
  items: TweetRecord[];
  total: number;
  nextCursor: TweetCursor | null;
  hasMore: boolean;
}

export interface DeletionTarget {
  id: string;
  type: TweetType;
  sourceTweetId?: string;
}

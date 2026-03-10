// types/index.ts - Shared TypeScript types for the NaviKid app

export interface Driver {
  id: string;
  name: string;
  vanNumber: string;
  route: string;
}

/** A driver rating submitted by a parent, stored in Firestore */
export interface Rating {
  id?: string;
  ratingId?: string;
  parentId: string;
  driverId: string;
  driverName?: string;
  /** Single overall star score 1–5 (sum of all ratings / number of raters) */
  overall: number;
  comment?: string | null;
  createdAt?: any;
}

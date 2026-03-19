// Shared TypeScript types for the NaviKid mobile app

export interface Route {
    id: string;
    name: string;   // e.g. "Route A"
    area: string;   // e.g. "Colombo North"
}

export interface Driver {
    id: string;
    name: string;
    vanNumber?: string;     // vehicle/license plate number
    route?: string;         // route name or area
    routeId?: string | null;
    averageRating?: {
        overall: number;
        safety?: number;
        punctuality?: number;
        service?: number;
        totalRatings: number;
        lastUpdated: string;
    } | null;
}

export interface Rating {
    id?: string;
    parentId: string;
    driverId: string;
    driverName?: string | null;
    overall: number;         // 1–5 (average of safety/punctuality/service, or direct score)
    safety?: number;         // 1–5
    punctuality?: number;    // 1–5
    service?: number;        // 1–5
    comment?: string | null;
    createdAt: any;          // Firestore Timestamp or ISO string
}

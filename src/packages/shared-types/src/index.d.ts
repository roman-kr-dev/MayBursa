export type OptionType = 'call' | 'put';
export type OptionStatus = 'active' | 'expired' | 'exercised' | 'closed';
export interface Option {
    id: string;
    symbol: string;
    type: OptionType;
    strike: number;
    expiration: Date;
    premium: number;
    contractSize: number;
    status: OptionStatus;
    createdAt: Date;
    updatedAt: Date;
}
export interface Trade {
    id: string;
    optionId: string;
    userId: string;
    action: 'buy' | 'sell';
    quantity: number;
    price: number;
    commission: number;
    executedAt: Date;
    notes?: string;
}
export interface PriceUpdate {
    id: string;
    optionId: string;
    bid: number;
    ask: number;
    last: number;
    volume: number;
    openInterest: number;
    impliedVolatility: number;
    timestamp: Date;
}
export type IntuitionStatus = 'draft' | 'published' | 'archived';
export type TagCategory = 'sector' | 'strategy' | 'sentiment' | 'custom';
export interface Tag {
    id: string;
    name: string;
    color?: string;
    description?: string;
}
export interface User {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Intuition {
    id: string;
    title: string;
    content: string;
    tags: string[];
    confidence: number;
    timeframe: string;
    createdAt: string;
    updatedAt: string;
}
export interface Attachment {
    id: string;
    url: string;
    filename: string;
    mimeType: string;
    size: number;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: ResponseMeta;
}
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, any>;
}
export interface ResponseMeta {
    timestamp: Date;
    requestId: string;
    pagination?: PaginationMeta;
}
export interface PaginationMeta {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
}
export interface TimeRange {
    start: Date;
    end: Date;
}
export interface PriceRange {
    min: number;
    max: number;
}
export type SortOrder = 'asc' | 'desc';
export interface SortOptions<T> {
    field: keyof T;
    order: SortOrder;
}
//# sourceMappingURL=index.d.ts.map
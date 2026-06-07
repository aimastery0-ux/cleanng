import client from "./client";

export interface SearchResult {
  id: number;
  full_name: string;
  avatar_url: string;
  bio: string;
  years_experience: number;
  service_areas: string[];
  base_hourly_rate: string;
  is_verified: boolean;
  is_featured: boolean;
  rating_avg: string;
  rating_count: number;
  active_service_types: string[];
  availability_days: number[];
  distance_km: number | null;
}

export interface SearchResponse {
  results: SearchResult[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SearchParams {
  area?: string;
  type?: string;
  min_price?: number | string;
  max_price?: number | string;
  min_rating?: number | string;
  available_day?: number | string;
  sort?: "featured" | "rating" | "price_asc" | "price_desc" | "distance";
  lat?: number | string;
  lng?: number | string;
  radius?: number;
  page?: number;
  page_size?: number;
}

export const searchApi = {
  searchCleaners: (params: SearchParams) =>
    client
      .get<SearchResponse>("/api/v1/search/cleaners/", { params })
      .then((r) => r.data),
};

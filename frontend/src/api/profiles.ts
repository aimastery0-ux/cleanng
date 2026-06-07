import apiClient from "./client";

export interface AvailabilitySlot {
  id: number;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
}

export interface ServiceSummary {
  id: number;
  type: string;
  title: string;
  price: string;
  pricing_unit: string;
  is_active: boolean;
}

export interface ReviewSummary {
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface CleanerProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  bio: string;
  years_experience: number;
  service_areas: string[];
  base_hourly_rate: string;
  is_verified: boolean;
  verification_status: "PENDING" | "APPROVED" | "REJECTED";
  id_doc_url: string;
  portfolio_images: string[];
  rating_avg: string;
  rating_count: number;
  is_featured: boolean;
  services: ServiceSummary[];
  availability: AvailabilitySlot[];
  recent_reviews: ReviewSummary[];
  created_at: string;
}

export interface CleanerStats {
  total_bookings: number;
  completed_bookings: number;
  pending_bookings: number;
  total_earned: string;
  rating_avg: string;
  rating_count: number;
  this_month_bookings: number;
  this_month_earned: string;
}

export interface OnboardingStatus {
  current_step: number;
  verification_status: string;
  is_verified: boolean;
}

export interface Address {
  id?: number;
  label: string;
  line1: string;
  area: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
}

export const profilesApi = {
  getCleanerProfile: () =>
    apiClient.get<CleanerProfile>("/profiles/cleaner/").then((r) => r.data),

  getPublicCleanerProfile: (id: number) =>
    apiClient.get<CleanerProfile>(`/profiles/cleaner/${id}/`).then((r) => r.data),

  getOnboardingStatus: () =>
    apiClient.get<OnboardingStatus>("/profiles/onboarding/cleaner/status/").then((r) => r.data),

  onboardingStep1: (data: { first_name: string; last_name: string; phone: string }) =>
    apiClient.post("/profiles/onboarding/cleaner/step1/", data).then((r) => r.data),

  onboardingStep2: (data: { id_doc_url: string }) =>
    apiClient.post("/profiles/onboarding/cleaner/step2/", data).then((r) => r.data),

  onboardingStep3: (data: { bio: string; years_experience: number; service_areas: string[] }) =>
    apiClient.post("/profiles/onboarding/cleaner/step3/", data).then((r) => r.data),

  onboardingStep4: (data: { base_hourly_rate: string }) =>
    apiClient.post("/profiles/onboarding/cleaner/step4/", data).then((r) => r.data),

  customerOnboarding: (data: {
    first_name: string;
    last_name: string;
    line1: string;
    area: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  }) => apiClient.post("/profiles/onboarding/customer/", data).then((r) => r.data),

  getAddresses: () =>
    apiClient.get<Address[]>("/profiles/addresses/").then((r) => r.data),

  createAddress: (data: Omit<Address, "id">) =>
    apiClient.post<Address>("/profiles/addresses/", data).then((r) => r.data),

  updateProfile: (data: Partial<Pick<CleanerProfile, "bio" | "years_experience" | "service_areas" | "base_hourly_rate" | "portfolio_images">>) =>
    apiClient.patch<CleanerProfile>("/profiles/cleaner/", data).then((r) => r.data),

  uploadAvatar: (avatar_url: string) =>
    apiClient.post<{ avatar_url: string }>("/profiles/cleaner/avatar/", { avatar_url }).then((r) => r.data),

  addPortfolioImage: (image_url: string) =>
    apiClient.post<{ portfolio_images: string[] }>("/profiles/cleaner/portfolio/add/", { image_url }).then((r) => r.data),

  removePortfolioImage: (image_url: string) =>
    apiClient.post<{ portfolio_images: string[] }>("/profiles/cleaner/portfolio/remove/", { image_url }).then((r) => r.data),

  getStats: () =>
    apiClient.get<CleanerStats>("/profiles/cleaner/stats/").then((r) => r.data),

  getAvailability: () =>
    apiClient.get<AvailabilitySlot[]>("/profiles/availability/").then((r) => r.data),

  bulkSetAvailability: (slots: Array<{ day_of_week: number; start_time: string; end_time: string }>) =>
    apiClient.put<AvailabilitySlot[]>("/profiles/availability/bulk/", { slots }).then((r) => r.data),

  deleteAvailabilitySlot: (id: number) =>
    apiClient.delete(`/profiles/availability/${id}/`),
};

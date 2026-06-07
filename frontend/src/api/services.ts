import client from "./client";

export interface Service {
  id: number;
  type: string;
  title: string;
  description: string;
  price: string;
  pricing_unit: string;
  is_active: boolean;
  created_at: string;
}

export interface ServicePayload {
  type: string;
  title: string;
  description?: string;
  price: string;
  pricing_unit: string;
  is_active?: boolean;
}

export const servicesApi = {
  list: () => client.get<Service[]>("/api/v1/services/").then((r) => r.data),
  create: (data: ServicePayload) =>
    client.post<Service>("/api/v1/services/", data).then((r) => r.data),
  update: (id: number, data: Partial<ServicePayload>) =>
    client.patch<Service>(`/api/v1/services/${id}/`, data).then((r) => r.data),
  remove: (id: number) => client.delete(`/api/v1/services/${id}/`),
  toggle: (id: number, is_active: boolean) =>
    client.patch<Service>(`/api/v1/services/${id}/`, { is_active }).then((r) => r.data),
};

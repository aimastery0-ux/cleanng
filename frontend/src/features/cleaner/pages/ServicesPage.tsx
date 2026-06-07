import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { servicesApi, Service, ServicePayload } from "@/api/services";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";

const SERVICE_TYPES = [
  { value: "HOME_CLEANING", label: "Home cleaning" },
  { value: "DEEP_CLEANING", label: "Deep cleaning" },
  { value: "OFFICE_CLEANING", label: "Office cleaning" },
  { value: "MOVE_IN_OUT", label: "Move-in/move-out" },
  { value: "POST_CONSTRUCTION", label: "Post-construction" },
  { value: "CARPET_CLEANING", label: "Carpet cleaning" },
  { value: "WINDOW_CLEANING", label: "Window cleaning" },
  { value: "LAUNDRY", label: "Laundry" },
];

const PRICING_UNITS = [
  { value: "PER_HOUR", label: "Per hour" },
  { value: "PER_JOB", label: "Per job" },
  { value: "PER_ROOM", label: "Per room" },
  { value: "PER_SQFT", label: "Per sq. ft." },
];

const schema = z.object({
  type: z.string().min(1, "Select a service type"),
  title: z.string().min(3, "Title too short").max(100),
  description: z.string().max(500).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price"),
  pricing_unit: z.string().min(1, "Select a pricing unit"),
});
type FormValues = z.infer<typeof schema>;

function ServiceForm({
  initial,
  onClose,
}: {
  initial?: Service;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? { type: initial.type, title: initial.title, description: initial.description, price: initial.price, pricing_unit: initial.pricing_unit }
      : { pricing_unit: "PER_HOUR" },
  });

  const saveMutation = useMutation({
    mutationFn: (data: ServicePayload) =>
      initial ? servicesApi.update(initial.id, data) : servicesApi.create(data),
    onSuccess: () => {
      toast.success(initial ? "Service updated." : "Service created.");
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["cleaner-profile"] });
      onClose();
    },
    onError: () => toast.error("Failed to save service."),
  });

  return (
    <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
      <div>
        <label className="block text-small font-medium mb-1.5">Service type</label>
        <select {...register("type")} className="input w-full">
          <option value="">Select type…</option>
          {SERVICE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {errors.type && <p className="text-error text-caption mt-1">{errors.type.message}</p>}
      </div>

      <Input
        label="Title"
        placeholder="e.g. Standard home cleaning (3 bed)"
        error={errors.title?.message}
        {...register("title")}
      />

      <div>
        <label className="block text-small font-medium mb-1.5">Description (optional)</label>
        <textarea
          {...register("description")}
          rows={3}
          placeholder="What's included, any special requirements…"
          className="input w-full resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Price (₦)"
          type="number"
          min={0}
          placeholder="5000"
          error={errors.price?.message}
          {...register("price")}
        />
        <div>
          <label className="block text-small font-medium mb-1.5">Pricing unit</label>
          <select {...register("pricing_unit")} className="input w-full">
            {PRICING_UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          {errors.pricing_unit && (
            <p className="text-error text-caption mt-1">{errors.pricing_unit.message}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={saveMutation.isPending}>
          {initial ? "Save changes" : "Add service"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function ServicesPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | undefined>();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => servicesApi.remove(id),
    onSuccess: () => {
      toast.success("Service removed.");
      qc.invalidateQueries({ queryKey: ["services"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      servicesApi.toggle(id, is_active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });

  const openEdit = (s: Service) => {
    setEditTarget(s);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditTarget(undefined);
    setModalOpen(true);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h2 font-extrabold">Services</h1>
        <Button onClick={openCreate} size="sm">+ Add service</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-bg-alt animate-pulse rounded-card" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🧹</div>
            <h3 className="font-semibold mb-1">No services yet</h3>
            <p className="text-small text-grey-mid mb-4">
              Add your first service to start receiving bookings.
            </p>
            <Button onClick={openCreate}>Add your first service</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <Card key={s.id} padding="md">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{s.title}</h3>
                    <Badge variant={s.is_active ? "success" : "grey"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-small text-grey-mid">
                    {SERVICE_TYPES.find((t) => t.value === s.type)?.label ?? s.type}
                  </p>
                  <p className="text-body font-bold text-orange mt-1">
                    ₦{Number(s.price).toLocaleString()}{" "}
                    <span className="text-grey-mid font-normal text-small">
                      / {PRICING_UNITS.find((u) => u.value === s.pricing_unit)?.label ?? s.pricing_unit}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleMutation.mutate({ id: s.id, is_active: !s.is_active })}
                    className="text-caption text-grey-mid hover:text-black transition-colors"
                    title={s.is_active ? "Deactivate" : "Activate"}
                  >
                    {s.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="text-caption text-orange hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this service?")) deleteMutation.mutate(s.id);
                    }}
                    className="text-caption text-error hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "Edit service" : "Add service"}
      >
        <ServiceForm
          initial={editTarget}
          onClose={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

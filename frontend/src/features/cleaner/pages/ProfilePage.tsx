import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { profilesApi } from "@/api/profiles";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Card from "@/components/Card";

const LAGOS_AREAS = [
  "Ikeja", "Victoria Island", "Lekki", "Ajah", "Yaba", "Surulere",
  "Ikoyi", "Gbagada", "Maryland", "Ojodu", "Berger", "Agege",
  "Oshodi", "Isolo", "Festac", "Badagry", "Epe", "Ikorodu",
];

const schema = z.object({
  bio: z.string().min(50, "Bio must be at least 50 characters").max(500),
  years_experience: z.coerce.number().min(0).max(50),
});
type FormValues = z.infer<typeof schema>;

async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    return URL.createObjectURL(file);
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "cleanng_unsigned");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: fd,
  });
  const data = await res.json();
  return data.secure_url;
}

export default function ProfilePage() {
  const qc = useQueryClient();
  const [areaInput, setAreaInput] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [portfolioUploading, setPortfolioUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["cleaner-profile"],
    queryFn: () => profilesApi.getCleanerProfile(),
    onSuccess: (p) => {
      setAreas(p.service_areas || []);
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: profile ? { bio: profile.bio, years_experience: profile.years_experience } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) =>
      profilesApi.updateProfile({ ...data, service_areas: areas }),
    onSuccess: () => {
      toast.success("Profile updated.");
      qc.invalidateQueries({ queryKey: ["cleaner-profile"] });
    },
    onError: () => toast.error("Failed to save."),
  });

  const avatarMutation = useMutation({
    mutationFn: (url: string) => profilesApi.uploadAvatar(url),
    onSuccess: () => {
      toast.success("Avatar updated.");
      qc.invalidateQueries({ queryKey: ["cleaner-profile"] });
    },
  });

  const removePortfolioMutation = useMutation({
    mutationFn: (url: string) => profilesApi.removePortfolioImage(url),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cleaner-profile"] }),
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      avatarMutation.mutate(url);
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handlePortfolioAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if ((profile?.portfolio_images?.length ?? 0) >= 10) {
      toast.error("Maximum 10 portfolio images.");
      return;
    }
    setPortfolioUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      await profilesApi.addPortfolioImage(url);
      qc.invalidateQueries({ queryKey: ["cleaner-profile"] });
      toast.success("Photo added.");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setPortfolioUploading(false);
    }
  };

  const filteredSuggestions = LAGOS_AREAS.filter(
    (a) =>
      a.toLowerCase().includes(areaInput.toLowerCase()) &&
      !areas.includes(a)
  );

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-bg-alt animate-pulse rounded-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-h2 font-extrabold">Edit profile</h1>

      {/* Avatar */}
      <Card padding="md">
        <h2 className="font-semibold mb-4">Profile photo</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-bg-alt flex items-center justify-center text-2xl">
                👤
              </div>
            )}
          </div>
          <div>
            <label className="btn btn-outline text-sm cursor-pointer">
              {uploading ? "Uploading..." : "Change photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={uploading}
              />
            </label>
            <p className="text-caption text-grey-mid mt-1">JPG, PNG, max 5 MB</p>
          </div>
        </div>
      </Card>

      {/* Bio & experience */}
      <Card padding="md">
        <h2 className="font-semibold mb-4">About you</h2>
        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-small font-medium mb-1.5">Bio</label>
            <textarea
              {...register("bio")}
              rows={4}
              placeholder="Tell customers about your experience, specialties, and approach..."
              className="input w-full resize-none"
            />
            {errors.bio && <p className="text-error text-caption mt-1">{errors.bio.message}</p>}
          </div>
          <Input
            label="Years of experience"
            type="number"
            min={0}
            max={50}
            error={errors.years_experience?.message}
            {...register("years_experience")}
          />

          {/* Service areas */}
          <div>
            <label className="block text-small font-medium mb-1.5">Service areas (Lagos)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {areas.map((a) => (
                <span
                  key={a}
                  className="badge badge-orange flex items-center gap-1"
                >
                  {a}
                  <button
                    type="button"
                    onClick={() => setAreas(areas.filter((x) => x !== a))}
                    className="ml-1 hover:text-white/70"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search area..."
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                className="input w-full"
              />
              {areaInput && filteredSuggestions.length > 0 && (
                <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-border rounded-card shadow-lg max-h-40 overflow-y-auto">
                  {filteredSuggestions.map((area) => (
                    <li
                      key={area}
                      className="px-4 py-2 text-small cursor-pointer hover:bg-bg-alt"
                      onClick={() => {
                        setAreas([...areas, area]);
                        setAreaInput("");
                      }}
                    >
                      {area}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <Button type="submit" loading={updateMutation.isPending}>
            Save changes
          </Button>
        </form>
      </Card>

      {/* Portfolio */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Portfolio photos</h2>
          <span className="text-caption text-grey-mid">
            {profile?.portfolio_images?.length ?? 0}/10
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {profile?.portfolio_images?.map((url, i) => (
            <div key={i} className="relative group aspect-square">
              <img
                src={url}
                alt={`Portfolio ${i + 1}`}
                className="w-full h-full object-cover rounded-input"
              />
              <button
                onClick={() => removePortfolioMutation.mutate(url)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 text-xs
                           opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}

          {(profile?.portfolio_images?.length ?? 0) < 10 && (
            <label className="aspect-square border-2 border-dashed border-border rounded-input
                              flex flex-col items-center justify-center text-grey-mid cursor-pointer
                              hover:border-orange hover:text-orange transition-colors">
              {portfolioUploading ? (
                <span className="text-caption">Uploading...</span>
              ) : (
                <>
                  <span className="text-2xl">+</span>
                  <span className="text-caption">Add photo</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePortfolioAdd}
                disabled={portfolioUploading}
              />
            </label>
          )}
        </div>
      </Card>
    </div>
  );
}

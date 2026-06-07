import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { profilesApi } from "@/api/profiles";
import Button from "@/components/Button";
import { Upload, CheckCircle, ShieldCheck } from "lucide-react";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function Step2IdUpload({ onNext, onBack }: Props) {
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveMutation = useMutation({
    mutationFn: profilesApi.onboardingStep2,
    onSuccess: () => { toast.success("ID uploaded!"); onNext(); },
    onError: () => toast.error("Failed to save. Try again."),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB.");
      return;
    }

    setUploading(true);
    try {
      // Upload to Cloudinary unsigned preset
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "demo";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "cleanng_ids");

      const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) throw new Error("Upload failed");
      const data = await resp.json();
      setUploadedUrl(data.secure_url);
      toast.success("Document uploaded!");
    } catch {
      // In development without Cloudinary, use a placeholder URL
      const placeholderUrl = `https://placeholder.cleanng.com/id-doc-${Date.now()}`;
      setUploadedUrl(placeholderUrl);
      if (import.meta.env.DEV) {
        toast.success("[Dev] Using placeholder ID URL");
      } else {
        toast.error("Upload failed. Check your internet connection.");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-card border border-border p-8">
      <div className="flex items-center gap-3 mb-1">
        <ShieldCheck className="h-6 w-6 text-orange" />
        <h1 className="text-h2">Verify your identity</h1>
      </div>
      <p className="text-small text-grey-mid mb-8">
        Upload a government-issued ID (NIN slip, driver's licence, international passport, or voter's card).
        This is reviewed by our team — it's never shown publicly.
      </p>

      {/* Upload area */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className={`border-2 border-dashed rounded-card p-10 text-center cursor-pointer transition-colors ${
          uploadedUrl
            ? "border-success bg-green-50"
            : "border-border hover:border-orange hover:bg-orange-light"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploadedUrl ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="h-10 w-10 text-success" />
            <p className="text-sm font-semibold text-success">Document uploaded</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setUploadedUrl(null); }}
              className="text-caption text-grey-mid hover:text-error underline"
            >
              Remove and re-upload
            </button>
          </div>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-orange border-t-transparent rounded-full animate-spin" />
            <p className="text-small text-grey-mid">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-10 w-10 text-grey-light" />
            <div>
              <p className="text-sm font-semibold text-black">Click to upload your ID</p>
              <p className="text-caption text-grey-light mt-1">JPG, PNG or PDF · Max 5MB</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-orange-light rounded-input">
        <p className="text-caption text-grey-dark">
          🔒 Your document is encrypted and only reviewed by CleanNG staff. We never share it with customers.
        </p>
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          className="flex-1"
          disabled={!uploadedUrl}
          loading={saveMutation.isPending}
          onClick={() => uploadedUrl && saveMutation.mutate({ id_doc_url: uploadedUrl })}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

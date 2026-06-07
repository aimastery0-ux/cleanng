import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { bookingsApi } from "@/api/bookings";
import { paymentsApi } from "@/api/payments";
import Button from "@/components/Button";
import Card from "@/components/Card";

declare global {
  interface Window {
    FlutterwaveCheckout?: (config: Record<string, unknown>) => void;
  }
}

function loadFlwScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById("flw-script")) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "flw-script";
    script.src = "https://checkout.flutterwave.com/v3.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Flutterwave script."));
    document.head.appendChild(script);
  });
}

export default function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const id = Number(bookingId);
  const [paying, setPaying] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => bookingsApi.get(id),
    enabled: !!id,
  });

  useEffect(() => {
    loadFlwScript().catch(() => {});
  }, []);

  if (isLoading || !booking) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 space-y-4 animate-pulse">
        {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-bg-alt rounded-card" />)}
      </div>
    );
  }

  if (booking.status !== "ACCEPTED") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-h2 font-bold mb-2">Payment unavailable</h1>
        <p className="text-grey-mid mb-6">
          Payment can only be made for accepted bookings. This booking is {booking.status.toLowerCase()}.
        </p>
        <Button onClick={() => navigate(`/customer/bookings/${id}`)}>Back to booking</Button>
      </div>
    );
  }

  const handlePay = async () => {
    if (!window.FlutterwaveCheckout) {
      toast.error("Payment widget not loaded. Please refresh the page.");
      return;
    }
    setPaying(true);
    try {
      const params = await paymentsApi.initiate(id);

      window.FlutterwaveCheckout({
        public_key: params.public_key,
        tx_ref: params.tx_ref,
        amount: Number(params.amount),
        currency: params.currency,
        customer: params.customer,
        customizations: {
          title: "CleanNG",
          description: `Payment for ${booking.service_title}`,
          logo: "",
        },
        callback: async (response: { status: string; tx_ref: string }) => {
          if (response.status === "successful") {
            try {
              await paymentsApi.verify(response.tx_ref);
              toast.success("Payment successful! Your booking is confirmed.");
              navigate(`/customer/bookings/${id}`);
            } catch {
              toast.success("Payment received. Your booking will be updated shortly.");
              navigate(`/customer/bookings/${id}`);
            }
          } else {
            toast.error("Payment was not completed.");
            setPaying(false);
          }
        },
        onclose: () => {
          setPaying(false);
        },
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Could not initiate payment.");
      setPaying(false);
    }
  };

  const total = Number(booking.total_amount);

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-h2 font-extrabold mb-1">Complete payment</h1>
        <p className="text-small text-grey-mid">Secured by Flutterwave · Held in escrow until job is done</p>
      </div>

      <Card padding="lg" className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          {booking.cleaner_avatar ? (
            <img src={booking.cleaner_avatar} className="w-10 h-10 rounded-full object-cover border border-border" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-bg-alt flex items-center justify-center text-lg">👤</div>
          )}
          <div>
            <p className="font-semibold">{booking.cleaner_name}</p>
            <p className="text-caption text-grey-mid">{booking.service_title}</p>
          </div>
        </div>

        <div className="text-small space-y-1">
          <div className="flex justify-between">
            <span className="text-grey-mid">Date</span>
            <span>{new Date(booking.scheduled_date).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "long" })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-grey-mid">Time</span>
            <span>{booking.scheduled_time.slice(0, 5)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-grey-mid">Location</span>
            <span>{booking.address_area}</span>
          </div>
        </div>

        <div className="pt-3 border-t border-border space-y-1.5 text-small">
          <div className="flex justify-between">
            <span className="text-grey-mid">Service fee</span>
            <span>₦{total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
            <span>Total due</span>
            <span className="text-orange">₦{total.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      <div className="bg-bg-alt rounded-card p-4 text-small text-grey-mid space-y-1">
        <p className="font-medium text-black">How escrow works</p>
        <p>Your payment is held securely until the job is complete.</p>
        <p>After you confirm the cleaner has finished, funds are released to them.</p>
        <p>If anything goes wrong, contact support for assistance.</p>
      </div>

      <Button size="lg" className="w-full" loading={paying} onClick={handlePay}>
        Pay ₦{total.toLocaleString()} securely
      </Button>
    </div>
  );
}

import { Clock, Truck } from "lucide-react";

export function DeliveryInfoCallout() {
  return (
    <div className="flex w-full flex-col gap-2 rounded-lg bg-brand-tint-icon p-4">
      <p className="font-medium text-brand-navy">Delivery Information</p>
      <div className="flex items-center gap-2 text-sm text-[#4b5563]">
        <Truck className="size-[18px] shrink-0" aria-hidden />
        <span>Free delivery for orders above ₹499</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-[#4b5563]">
        <Clock className="size-[18px] shrink-0" aria-hidden />
        <span>Estimated delivery: 2-3 business days</span>
      </div>
    </div>
  );
}

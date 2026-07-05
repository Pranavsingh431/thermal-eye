import { ThermalEyeMark } from "@/components/landing/ThermalEyeMark";
import { cn } from "@/lib/utils";

/** Org's uploaded logo if set, otherwise the default Thermal Eye product mark. */
export function BrandLogo({ logoUrl, className }: { logoUrl?: string | null; className?: string }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="Logo" className={cn("rounded-lg object-contain", className)} />;
  }
  return <ThermalEyeMark className={cn("text-gray-900 dark:text-white", className)} />;
}

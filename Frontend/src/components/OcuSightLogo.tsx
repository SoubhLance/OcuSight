import { Eye } from "lucide-react";

interface OcuSightLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function OcuSightLogo({ size = "md", showText = true }: OcuSightLogoProps) {
  const iconSizes = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-10 w-10" };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };
  const containerSizes = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-14 w-14" };

  return (
    <div className="flex items-center gap-2.5">
      <div className={`${containerSizes[size]} rounded-xl gradient-primary flex items-center justify-center shadow-md`}>
        <Eye className={`${iconSizes[size]} text-primary-foreground`} />
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-heading font-bold text-foreground`}>
          Ocu<span className="text-gradient">Sight</span>
        </span>
      )}
    </div>
  );
}

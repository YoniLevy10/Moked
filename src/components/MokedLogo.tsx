import Image from "next/image";

type MokedLogoProps = {
  className?: string;
  variant?: "wordmark" | "mark";
  priority?: boolean;
};

export function MokedLogo({
  className,
  variant = "wordmark",
  priority = false,
}: MokedLogoProps) {
  if (variant === "mark") {
    return (
      <Image
        src="/brand/moked-mark-green.png"
        alt="MOKED"
        width={512}
        height={512}
        className={className}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src="/brand/moked-logo-wordmark.png"
      alt="MOKED"
      width={840}
      height={240}
      className={className}
      priority={priority}
    />
  );
}

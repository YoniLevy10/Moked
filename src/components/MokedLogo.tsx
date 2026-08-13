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
        width={890}
        height={665}
        className={className}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src="/brand/moked-logo-wordmark.png"
      alt="MOKED"
      width={1403}
      height={313}
      className={className}
      priority={priority}
    />
  );
}

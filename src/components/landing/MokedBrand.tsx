import Image from "next/image";
import Link from "next/link";

export function MokedBrand() {
  return (
    <Link aria-label="מוקד — דף הבית" className="moked-brand" href="/">
      <Image
        alt=""
        className="moked-brand__mark"
        height={40}
        priority
        src="/brand/moked-mark-green.png"
        width={40}
      />
      <span className="moked-brand__name">מוקד</span>
    </Link>
  );
}

import Image from "next/image";

const photoSlugs = new Set([
  "adjustable-laptop-stand", "arduino-starter-kit", "compact-mechanical-keyboard",
  "developer-precision-mouse", "gan-fast-charger", "portable-power-bank",
  "robot-chassis-motor-bundle", "sensor-exploration-pack", "soldering-prototyping-kit",
  "studio-monitoring-headphones", "usb-c-8-in-1-hub",
]);

/** Replace only our demo artwork paths; preserve future supplier images. */
export function productPhotoSource(src: string): string {
  const match = /^\/images\/products\/([^/]+)\.svg$/.exec(src);
  return match && photoSlugs.has(match[1]) ? `/images/photography/${match[1]}.webp` : src;
}

export function ProductImage({ src, name, className = "" }: {
  src: string; name?: string; className?: string; tone?: "ink" | "accent";
}) {
  const photo = productPhotoSource(src);
  return <span className={`relative block overflow-hidden ${className}`}>
    <Image src={photo} alt={name ? `${name} — representative product photograph` : ""} fill
      sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
      className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.035] motion-reduce:transform-none"
      unoptimized={photo.endsWith(".svg") || photo.startsWith("http")} />
  </span>;
}

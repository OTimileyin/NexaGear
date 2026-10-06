import type { ImageSourcePropType } from "react-native";
import { catalogPhoto } from "./catalog-photos.ts";
// Bundled representative photos, credited in mobile/assets/photography/credits.json.
const photos: Record<string, ImageSourcePropType> = {
  "adjustable-laptop-stand": require("../../assets/photography/adjustable-laptop-stand.webp"),
  "arduino-starter-kit": require("../../assets/photography/arduino-starter-kit.webp"),
  "compact-mechanical-keyboard": require("../../assets/photography/compact-mechanical-keyboard.webp"),
  "developer-precision-mouse": require("../../assets/photography/developer-precision-mouse.webp"),
  "gan-fast-charger": require("../../assets/photography/gan-fast-charger.webp"),
  "portable-power-bank": require("../../assets/photography/portable-power-bank.webp"),
  "robot-chassis-motor-bundle": require("../../assets/photography/robot-chassis-motor-bundle.webp"),
  "sensor-exploration-pack": require("../../assets/photography/sensor-exploration-pack.webp"),
  "soldering-prototyping-kit": require("../../assets/photography/soldering-prototyping-kit.webp"),
  "studio-monitoring-headphones": require("../../assets/photography/studio-monitoring-headphones.webp"),
  "usb-c-8-in-1-hub": require("../../assets/photography/usb-c-8-in-1-hub.webp"),
};
export function productPhoto(slug: string, imageUrl: string | null): ImageSourcePropType | undefined {
  return catalogPhoto(imageUrl) ?? photos[slug] ?? (imageUrl?.startsWith("https://") ? { uri: imageUrl } : undefined);
}

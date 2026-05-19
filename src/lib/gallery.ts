import type { Database } from "@/lib/database.types";
import { createServiceClient } from "@/lib/supabase/server";

type GalleryImageRow =
  Database["public"]["Tables"]["site_gallery_images"]["Row"];

const fallbackGalleryImages = [
  {
    src: "/gallery-one.jpg",
    alt: "Come Thru dancefloor crowd",
    className: "md:col-span-2 md:row-span-2 md:min-h-112",
  },
  {
    src: "/gallery-two.jpg",
    alt: "Come Thru party lights over the crowd",
    className: "md:min-h-54",
  },
  {
    src: "/gallery-three.jpg",
    alt: "Come Thru room and lights",
    className: "md:min-h-54",
  },
  {
    src: "/gallery-four.jpg",
    alt: "Come Thru crowd beneath warm venue lights",
    className: "md:col-span-2 md:min-h-56",
  },
] as const;

const gallerySlotClasses: Record<number, string> = {
  1: "md:col-span-2 md:row-span-2 md:min-h-112",
  2: "md:min-h-54",
  3: "md:min-h-54",
  4: "md:col-span-2 md:min-h-56",
};

export async function getGalleryImages() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("site_gallery_images")
    .select("*")
    .eq("is_active", true)
    .order("slot", { ascending: true });

  if (error) {
    throw error;
  }

  const images = (data ?? []) as GalleryImageRow[];

  if (images.length === 0) {
    return fallbackGalleryImages;
  }

  return images.map((image) => ({
    src: image.image_url,
    alt: image.alt,
    className: gallerySlotClasses[image.slot] ?? "md:min-h-54",
  }));
}

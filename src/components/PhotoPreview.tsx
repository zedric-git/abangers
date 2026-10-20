"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoPreviewProps {
  /** A photo that's only in the page so far (not uploaded). */
  photo: File;
  alt: string;
  /** For <Image>: how wide the photo is shown, e.g. "50vw". */
  sizes: string;
  className?: string;
}

/**
 * Shows a photo that hasn't been uploaded yet, filling its parent (which
 * must be `relative` and have a size), e.g. an ID photo on the Verify
 * account page (#203). The whole photo is shown (object-contain), so the
 * landlord can check that nothing is cut off.
 *
 * The photo is read as a data: URL (its bytes written as text), the same
 * way as SelfieCamera's preview: unlike URL.createObjectURL(), it never
 * needs freeing.
 */
export default function PhotoPreview({
  photo,
  alt,
  sizes,
  className,
}: PhotoPreviewProps) {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null,
  );

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreview({ file: photo, url: reader.result });
      }
    };
    reader.readAsDataURL(photo);

    return () => reader.abort();
  }, [photo]);

  // Only the preview of this photo: a new one shows the spinner until
  // it's read, instead of the old photo.
  const url = preview?.file === photo ? preview.url : null;

  if (!url) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      className={cn("object-contain", className)}
    />
  );
}

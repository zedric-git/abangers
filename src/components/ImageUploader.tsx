"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Star, Loader2, ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  LISTING_PHOTO_ACCEPT,
  listingPhotoProblem,
  listingPhotoUploadErrorMessage,
} from "@/lib/listing-photo";

interface ImageUploaderProps {
  images: string[];
  coverImage?: string;
  onImagesChange: (images: string[], coverImage?: string) => void;
  error?: string;
}

export default function ImageUploader({
  images = [],
  coverImage,
  onImagesChange,
  error,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  // One line per photo that wasn't added, e.g.
  // "beach.heic: photos must be JPEG, PNG or WebP" (#234).
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const supabase = createClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadErrors([]);

    const newImageUrls: string[] = [];
    const failed: string[] = [];

    try {
      // Get current user for path prefix (or fallback to public)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userFolder = user ? user.id : "public";

      // Each file on its own: one that can't be used, or fails to upload,
      // is listed in `failed` and the rest still go up (#234).
      for (const file of Array.from(files)) {
        // Same size and type limits as the bucket (src/lib/listing-photo.ts),
        // checked first so a bad file isn't uploaded at all.
        const problem = listingPhotoProblem(file);
        if (problem) {
          failed.push(`${file.name}: ${problem}`);
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `${userFolder}/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("listing-photos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadErr) {
          console.error(`Upload error (${file.name}):`, uploadErr);
          // Storage's own code is in statusCode, not status (AGENTS.md, #213).
          failed.push(
            `${file.name}: ${listingPhotoUploadErrorMessage(uploadErr.statusCode)}`,
          );
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from("listing-photos")
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          newImageUrls.push(publicUrlData.publicUrl);
        }
      }
    } catch (err) {
      // Not a refused upload (those are returned, not thrown) but something
      // unexpected, e.g. the network dropped while signing in.
      console.error("Upload error:", err);
      failed.push("Something went wrong while uploading. Try again.");
    } finally {
      // Keep every photo that did upload, even if a later one failed.
      if (newImageUrls.length > 0) {
        const updatedImages = [...images, ...newImageUrls];
        // If no cover image was selected previously, set the first image as cover
        const updatedCover = coverImage || updatedImages[0] || "";

        onImagesChange(updatedImages, updatedCover);
      }
      setUploadErrors(failed);
      setUploading(false);
      // Reset input value so same files can be re-selected if needed
      e.target.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const removedUrl = images[indexToRemove];
    const updatedImages = images.filter((_, idx) => idx !== indexToRemove);

    let updatedCover = coverImage;
    if (removedUrl === coverImage) {
      // Automatically assign the first remaining photo as cover
      updatedCover = updatedImages[0] || "";
    }

    onImagesChange(updatedImages, updatedCover);
  };

  const handleSetCover = (url: string) => {
    onImagesChange(images, url);
  };

  return (
    <div className="space-y-6">
      {/* Upload Dropzone / Button */}
      <div className="relative">
        <label
          htmlFor="photo-upload-input"
          className={`flex cursor-pointer transition-all ${
            images.length > 0
              ? "flex-row items-center justify-between rounded-xl border-2 border-dashed px-5 py-3 text-left"
              : "flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center"
          } ${
            error
              ? "border-red-300 bg-red-50/50 hover:bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
              : "border-zinc-300 bg-zinc-50/50 hover:bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80"
          }`}
        >
          {uploading ? (
            <div className="flex flex-row items-center gap-3 py-1 text-purple-600 dark:text-purple-400">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              <span className="text-xs font-medium">
                Uploading photo(s) to storage...
              </span>
            </div>
          ) : images.length > 0 ? (
            <div className="flex w-full items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Click to upload additional photos
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-700 text-white shadow-md dark:bg-purple-600">
                <ImagePlus className="h-5 w-5" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-700 text-white shadow-md dark:bg-purple-600">
                <ImagePlus className="h-6 w-6" />
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Click to upload photos
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  PNG, JPG, WEBP up to 10MB (Multiple selection allowed)
                </p>
              </div>
            </>
          )}

          <input
            id="photo-upload-input"
            type="file"
            multiple
            accept={LISTING_PHOTO_ACCEPT}
            disabled={uploading}
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>
      </div>

      {/* Upload Error Alert: which photos weren't added, and why */}
      {uploadErrors.length > 0 && (
        <div
          role="alert"
          className="text-xs font-medium text-red-600 dark:text-red-400"
        >
          <p>
            {uploadErrors.length === 1
              ? "This photo wasn't added:"
              : "These photos weren't added:"}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {uploadErrors.map((message, idx) => (
              <li key={`${message}-${idx}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Validation Error */}
      {error && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Image Thumbnail Grid - Taller Portrait Display */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((url, idx) => {
            const isCover = coverImage === url || (!coverImage && idx === 0);

            return (
              <div
                key={`${url}-${idx}`}
                className={`group relative aspect-3/4 overflow-hidden rounded-2xl border-2 transition-all ${
                  isCover
                    ? "border-purple-600 ring-4 ring-purple-600/20 dark:border-purple-500"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <Image
                  src={url}
                  alt={`Listing photo ${idx + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />

                {/* Cover Badge / Cover Button Overlay */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  {isCover ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-xs dark:bg-purple-600">
                      <Star className="h-3 w-3 fill-current text-yellow-300" />
                      Cover Photo
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetCover(url)}
                      className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg backdrop-blur-md transition-colors hover:bg-purple-700"
                    >
                      <Star className="h-3 w-3" />
                      Set as Cover
                    </button>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-red-600"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

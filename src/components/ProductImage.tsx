"use client";

import { useState } from "react";

/**
 * Last line of defence for the "no card without an image" rule.
 *
 * The data layer already hides products whose image failed validation
 * (prisma/validate-images.ts + the DISPLAYABLE filter). This catches the gap in
 * between: an image that dies after the last validation run. `onHidden` lets the
 * parent card remove itself rather than leave a grey rectangle behind.
 */
export function ProductImage({
  src,
  alt,
  onHidden
}: {
  src: string;
  alt: string;
  onHidden: () => void;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      loading="lazy"
      onError={() => {
        setFailed(true);
        onHidden();
      }}
    />
  );
}

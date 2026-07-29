/**
 * A 44-byte 8x8 WebP tile in the card's own surface colour, used as the
 * `blurDataURL` for remote product images.
 *
 * Why a single shared tile rather than a per-image placeholder: generating one
 * blur per medicine would mean another column to seed and ship. Product shots
 * here sit on a white pack background, so one neutral tile reads correctly for
 * all of them, costs 44 bytes inlined, and needs no database change.
 *
 * It does not prevent layout shift on its own — the aspect-ratio containers
 * around each image already reserve the box. What it removes is the empty
 * flash between reserving the box and the image decoding.
 */
export const IMAGE_BLUR_DATA_URL =
  "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoIAAgAA4BaJaQAA3AA/vP1AAA=";

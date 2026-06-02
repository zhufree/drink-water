export function PixelIcon({ src, size = 24 }: { src: string; size?: number }) {
  return (
    <img
      src={src}
      alt=""
      className="shrink-0"
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}

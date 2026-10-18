// ---------------------------------------------------------------------------
// EmojiWallpaper
// A WhatsApp-style background: lots of small, faint, tilted emojis repeated
// as a tiled pattern. It sits behind the page content (see .emoji-wallpaper
// in styles.css for the opacity in light and dark mode).
// ---------------------------------------------------------------------------

const TILE = 320; // size of one repeated tile, in px

// [emoji, x, y (text baseline), size, rotation] inside one tile. They stay
// inside the tile so none of them is cut at the tile edges.
const ITEMS: [string, number, number, number, number][] = [
  ["💬", 20, 40, 30, -12],
  ["📚", 105, 30, 26, 10],
  ["✈️", 190, 52, 28, -20],
  ["☕", 270, 34, 24, 14],
  ["🎧", 58, 110, 26, 18],
  ["🗽", 145, 116, 30, -6],
  ["🍕", 232, 112, 24, 22],
  ["😊", 286, 140, 24, -10],
  ["✏️", 16, 186, 24, -28],
  ["🎤", 92, 196, 26, 8],
  ["🌎", 178, 190, 28, -14],
  ["🎬", 262, 200, 24, 16],
  ["👋", 52, 270, 26, 12],
  ["💡", 136, 280, 24, -18],
  ["🎵", 214, 268, 26, 6],
  ["⚽", 292, 286, 22, -8],
  ["📝", 0, 300, 22, 20],
  ["🚀", 176, 314, 24, -24],
];

export default function EmojiWallpaper() {
  return (
    <svg className="emoji-wallpaper" aria-hidden focusable="false">
      <defs>
        <pattern id="emoji-wallpaper-tile" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
          {ITEMS.map(([emoji, x, y, size, rotate], i) => (
            <text
              key={i}
              x={x}
              y={y}
              fontSize={size}
              transform={`rotate(${rotate} ${x + size / 2} ${y - size / 3})`}
            >
              {emoji}
            </text>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#emoji-wallpaper-tile)" />
    </svg>
  );
}

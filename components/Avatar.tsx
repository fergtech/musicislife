"use client";

interface AvatarProps {
  username: string;
  avatarUrl: string | null;
  size?: number;
  className?: string;
}

function usernameToGradient(username: string): [string, string] {
  // Deterministic hue from username characters
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) & 0xffff;
  }
  const hue1 = hash % 360;
  const hue2 = (hue1 + 40) % 360;
  return [`hsl(${hue1},65%,40%)`, `hsl(${hue2},65%,35%)`];
}

export function Avatar({ username, avatarUrl, size = 40, className = "" }: AvatarProps) {
  const style = { width: size, height: size, minWidth: size, minHeight: size };

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`@${username}`}
        style={style}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  const [c1, c2] = usernameToGradient(username);
  const initial = username[0]?.toUpperCase() ?? "?";
  const fontSize = Math.round(size * 0.42);

  return (
    <div
      style={{
        ...style,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        fontSize,
      }}
      className={`rounded-full flex items-center justify-center font-bold text-white select-none ${className}`}
      aria-label={`@${username}`}
    >
      {initial}
    </div>
  );
}

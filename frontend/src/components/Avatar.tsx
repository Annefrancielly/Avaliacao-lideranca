import { avatarHue, initials } from "../utils/format";

interface AvatarProps {
  id: number;
  name: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ id, name, size = "md" }: AvatarProps) {
  const hue = avatarHue(id);
  return (
    <span
      className={`avatar avatar--${size}`}
      style={{
        backgroundColor: `hsl(${hue} 45% 92%)`,
        color: `hsl(${hue} 50% 28%)`,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

"use client";

import { Ring } from "ldrs/react";
import "ldrs/react/Ring.css";

type LoaderProps = {
  size?: number;
  stroke?: number;
  speed?: number;
  color?: string;
  className?: string;
};

export function Loader({
  size = 40,
  stroke = 5,
  speed = 2,
  color = "#e8004d",
  className,
}: LoaderProps) {
  return (
    <div className={className}>
      <Ring
        size={String(size)}
        stroke={String(stroke)}
        bgOpacity="0"
        speed={String(speed)}
        color={color}
      />
    </div>
  );
}

export default Loader;
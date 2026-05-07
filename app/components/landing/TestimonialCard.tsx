import React, { useEffect } from "react";
import Image from "next/image";
import { motion } from "motion/react";

interface TestimonialCardProps {
  name: string;
  role: string;
  image: string;
  testimonial: string;
  duration?: number;
  onComplete?: () => void;
}

export function TestimonialCard({
  name,
  role,
  image,
  testimonial,
  duration = 30,
  onComplete,
}: TestimonialCardProps) {
  // Use a unique key based on props to reset animation when content changes
  const key = `${name}-${role}-${image}`;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm max-w-xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-16 h-16 flex-shrink-0">
          {/* Circular Progress Timer */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
            <circle
              className="text-neutral-200 dark:text-neutral-800"
              strokeWidth="4"
              stroke="currentColor"
              fill="transparent"
              r="30"
              cx="32"
              cy="32"
            />
            <motion.circle
              className="text-primary"
              strokeWidth="4"
              stroke="currentColor"
              fill="transparent"
              r="30"
              cx="32"
              cy="32"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: duration, ease: "linear" }}
              onAnimationComplete={onComplete}
            />
          </svg>

          <div className="absolute inset-1 rounded-full overflow-hidden">
            <Image
              src={image}
              alt={name}
              sizes="64px"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg text-neutral-900 dark:text-white">
            {name}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {role}
          </p>
        </div>
      </div>

      <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
        &quot;{testimonial}&quot;
      </p>
    </div>
  );
}

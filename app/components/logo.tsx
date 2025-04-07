"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { useTheme } from "../theme-provider"

interface LogoProps {
  width?: number
  height?: number
  className?: string
}

export function Logo({ width = 120, height = 40, className }: LogoProps) {
  const { theme } = useTheme()

  return (
    <div className={cn("relative", className)}>
      {theme === "dark" ? (
        <Image
          src="/dark.webp"
          alt="EOXS Logo"
          width={width}
          height={height}
          className="object-contain transition-all duration-300 hover:scale-105"
          style={{ width: "auto", height: `${height}px` }}
        />
      ) : (
        <Image
          src="/light.webp"
          alt="EOXS Logo"
          width={width}
          height={height}
          className="object-contain transition-all duration-300 hover:scale-105"
          style={{ width: "auto", height: `${height}px` }}
        />
      )}
    </div>
  )
}


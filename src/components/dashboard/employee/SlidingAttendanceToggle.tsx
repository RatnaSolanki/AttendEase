"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { useSound } from "@/hooks/useSound";

interface SlidingAttendanceToggleProps {
  isCheckedIn: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function SlidingAttendanceToggle({
  isCheckedIn,
  onCheckIn,
  onCheckOut,
  disabled = false,
  loading = false,
}: SlidingAttendanceToggleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const [startX, setStartX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const { playCheckInSound, playCheckOutSound } = useSound();

  const SLIDE_THRESHOLD = 0.7;

  useEffect(() => {
    setDragPosition(0);
  }, [isCheckedIn]);

  const handleStart = (clientX: number) => {
    if (disabled || loading) return;
    setIsDragging(true);
    setStartX(clientX);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current || !thumbRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const thumbWidth = thumbRef.current.offsetWidth;
    const maxDrag = containerWidth - thumbWidth;

    const delta = clientX - startX;
    const newPosition = Math.max(0, Math.min(delta, maxDrag));

    setDragPosition(newPosition);
  };

  const handleEnd = () => {
    if (!isDragging || !containerRef.current || !thumbRef.current) return;

    const container = containerRef.current;
    const thumbWidth = thumbRef.current.offsetWidth;
    const maxDrag = container.offsetWidth - thumbWidth;
    const progress = dragPosition / maxDrag;

    if (progress >= SLIDE_THRESHOLD) {
      if (isCheckedIn) {
        playCheckOutSound();
        setTimeout(() => onCheckOut(), 150);
      } else {
        playCheckInSound();
        setTimeout(() => onCheckIn(), 150);
      }
    }

    setIsDragging(false);
    setDragPosition(0);
    setStartX(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, startX, dragPosition]);

  const thumbStyle = {
    transform: `translateX(${dragPosition}px)`,
    transition: isDragging ? "none" : "transform 0.3s ease-out",
  };

  return (
    <div
      ref={containerRef}
      className={`
        relative h-14 rounded-full overflow-hidden
        w-full max-w-full
        ${isCheckedIn ? "bg-green-100 dark:bg-green-950/20" : "bg-blue-100 dark:bg-blue-950/20"}
        ${disabled || loading ? "opacity-50 cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}
        transition-colors duration-300
        shadow-inner
        select-none
      `}
    >
      {/* Background Text - ✅ CENTERED */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`text-xs sm:text-sm font-semibold ${
            isCheckedIn ? "text-green-700 dark:text-green-400" : "text-blue-700 dark:text-blue-400"
          }`}
        >
          {isCheckedIn ? "Slide to Check Out →" : "Slide to Check In →"}
        </span>
      </div>

      {/* Draggable Thumb - Responsive */}
      <div
        ref={thumbRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={thumbStyle}
        className={`
          absolute left-1 top-1 bottom-1
          w-20 sm:w-24 rounded-full
          ${isCheckedIn ? "bg-green-600 dark:bg-green-700" : "bg-blue-600 dark:bg-blue-700"}
          flex items-center justify-center
          shadow-lg
          transition-colors duration-300
          ${disabled || loading ? "" : "hover:scale-105 active:scale-95"}
        `}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
        ) : isCheckedIn ? (
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        ) : (
          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        )}
      </div>

      {/* Progress indicator */}
      {isDragging && containerRef.current && thumbRef.current && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to right, ${
              isCheckedIn 
                ? "rgba(34, 197, 94, 0.2)" 
                : "rgba(59, 130, 246, 0.2)"
            } 0%, transparent ${
              (dragPosition /
                (containerRef.current.offsetWidth -
                  thumbRef.current.offsetWidth)) *
              100
            }%)`,
          }}
        />
      )}
    </div>
  );
}
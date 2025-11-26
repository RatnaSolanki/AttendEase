"use client";

import { useCallback, useRef } from "react";

export function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize Web Audio API context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Helper function to create a note with envelope
  const createNote = useCallback((
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    volume: number = 0.3,
    type: OscillatorType = "sine"
  ) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.type = type;
    
    // ADSR Envelope (Attack, Decay, Sustain, Release)
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02); // Attack
    gainNode.gain.linearRampToValueAtTime(volume * 0.7, startTime + 0.05); // Decay
    gainNode.gain.setValueAtTime(volume * 0.7, startTime + duration - 0.05); // Sustain
    gainNode.gain.linearRampToValueAtTime(0.01, startTime + duration); // Release
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
    
    return { oscillator, gainNode };
  }, []);

  // Professional check-in sound: Uplifting chord progression
  const playCheckInSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Major chord: C5-E5-G5 (523.25, 659.25, 783.99 Hz)
      // Play as arpeggio for pleasant effect
      createNote(ctx, 523.25, now, 0.15, 0.25); // C5
      createNote(ctx, 659.25, now + 0.05, 0.15, 0.20); // E5
      createNote(ctx, 783.99, now + 0.10, 0.20, 0.25); // G5
      
      // Add subtle bass note for richness
      createNote(ctx, 261.63, now, 0.25, 0.15, "sine"); // C4
      
    } catch (error) {
      console.warn("Failed to play check-in sound:", error);
    }
  }, [getAudioContext, createNote]);

  // Professional check-out sound: Completion melody
  const playCheckOutSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Descending arpeggio: G5-E5-C5 with resolution
      createNote(ctx, 783.99, now, 0.12, 0.22); // G5
      createNote(ctx, 659.25, now + 0.08, 0.12, 0.20); // E5
      createNote(ctx, 523.25, now + 0.16, 0.25, 0.25); // C5 (longer for finality)
      
      // Add harmony
      createNote(ctx, 392.00, now + 0.16, 0.25, 0.15); // G4
      
    } catch (error) {
      console.warn("Failed to play check-out sound:", error);
    }
  }, [getAudioContext, createNote]);

  // Error/Warning sound: Attention-grabbing but not harsh
  const playErrorSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Minor second dissonance followed by resolution
      createNote(ctx, 349.23, now, 0.15, 0.30, "triangle"); // F4
      createNote(ctx, 369.99, now + 0.02, 0.15, 0.30, "triangle"); // F#4 (dissonant)
      
      // Second pulse for emphasis
      createNote(ctx, 349.23, now + 0.20, 0.15, 0.25, "triangle"); // F4
      createNote(ctx, 369.99, now + 0.22, 0.15, 0.25, "triangle"); // F#4
      
    } catch (error) {
      console.warn("Failed to play error sound:", error);
    }
  }, [getAudioContext, createNote]);

  // Subtle slide/interaction sound
  const playSlideSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Quick ascending chirp
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.04);
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      
      oscillator.start(now);
      oscillator.stop(now + 0.05);
      
    } catch (error) {
      console.warn("Failed to play slide sound:", error);
    }
  }, [getAudioContext]);

  // Success sound: Celebratory tone for successful operations
  const playSuccessSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Triumphant major arpeggio: C5-E5-G5-C6
      createNote(ctx, 523.25, now, 0.10, 0.20); // C5
      createNote(ctx, 659.25, now + 0.06, 0.10, 0.22); // E5
      createNote(ctx, 783.99, now + 0.12, 0.10, 0.24); // G5
      createNote(ctx, 1046.50, now + 0.18, 0.20, 0.26); // C6 (octave)
      
    } catch (error) {
      console.warn("Failed to play success sound:", error);
    }
  }, [getAudioContext, createNote]);

  // Location verified sound: Confirmation beep
  const playLocationVerifiedSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Two quick ascending beeps
      createNote(ctx, 880.00, now, 0.08, 0.20); // A5
      createNote(ctx, 1046.50, now + 0.10, 0.12, 0.25); // C6
      
    } catch (error) {
      console.warn("Failed to play location verified sound:", error);
    }
  }, [getAudioContext, createNote]);

  // Warning sound: Less severe than error
  const playWarningSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Single moderate tone
      createNote(ctx, 440.00, now, 0.15, 0.25, "triangle"); // A4
      createNote(ctx, 440.00, now + 0.18, 0.12, 0.20, "triangle"); // A4 (echo)
      
    } catch (error) {
      console.warn("Failed to play warning sound:", error);
    }
  }, [getAudioContext, createNote]);

  // Button tap sound: Micro-interaction feedback
  const playTapSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Very short click
      createNote(ctx, 800, now, 0.03, 0.10);
      
    } catch (error) {
      console.warn("Failed to play tap sound:", error);
    }
  }, [getAudioContext, createNote]);

  // Notification sound: Gentle alert
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Soft two-tone notification
      createNote(ctx, 659.25, now, 0.12, 0.18); // E5
      createNote(ctx, 783.99, now + 0.15, 0.15, 0.20); // G5
      
    } catch (error) {
      console.warn("Failed to play notification sound:", error);
    }
  }, [getAudioContext, createNote]);

  // Swipe sound: For swipe gestures
  const playSwipeSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Swoosh effect
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.10);
      
      oscillator.start(now);
      oscillator.stop(now + 0.10);
      
    } catch (error) {
      console.warn("Failed to play swipe sound:", error);
    }
  }, [getAudioContext]);

  return {
    // Core attendance sounds
    playCheckInSound,
    playCheckOutSound,
    playErrorSound,
    
    // Utility sounds
    playSlideSound,
    playSuccessSound,
    playLocationVerifiedSound,
    playWarningSound,
    playTapSound,
    playNotificationSound,
    playSwipeSound,
  };
}
"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentAudioVolume } from '../utils/audioUtils';

const AudioContext = createContext({
  audioVolume: 1.0,
  isPlaying: false
});

export function AudioProvider({ children }) {
  const [audioVolume, setAudioVolume] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 주기적으로 오디오 볼륨 업데이트
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      const volume = getCurrentAudioVolume();
      setAudioVolume(volume);
    }, 100); // 20fps 속도로 업데이트
    
    return () => clearInterval(interval);
  }, [isPlaying]);
  
  return (
    <AudioContext.Provider value={{ 
      audioVolume, 
      isPlaying,
      setAudioVolume,
      setIsPlaying
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
} 
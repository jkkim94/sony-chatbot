export const createAudioAnalyzer = (audioContext, audioElement) => {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  
  const source = audioContext.createMediaElementSource(audioElement);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  return {
    analyser,
    dataArray,
    getVolume: () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      return Math.min(average / 128, 1); // 0-1 사이의 값으로 정규화
    }
  };
};

export const getVisemeFromAudio = (volume) => {
  // 기본적인 립싱크를 위한 블렌드쉐입 매핑
  const mouthOpen = Math.min(volume * 2, 1);
  const mouthSmile = Math.max(0, (volume - 0.5) * 2);
  
  // 부드러운 전환을 위한 최소값 설정
  const minMouthOpen = 0.1;
  const minMouthSmile = 0.05;
  
  return {
    volume, // 원본 볼륨 값 추가
    mouthOpen: Math.max(mouthOpen, minMouthOpen),
    mouthSmile: Math.max(mouthSmile, minMouthSmile),
    // 추가적인 블렌드쉐입은 필요에 따라 구현
  };
}; 
export const createAudioAnalyzer = (audioContext, audioElement) => {
  console.log('🔍 [AudioAnalyzer] 생성 시작:', {
    hasAudioContext: !!audioContext,
    hasAudioElement: !!audioElement,
    audioElementType: audioElement?.tagName,
    audioElementSrc: audioElement?.src || audioElement?.currentSrc
  });

  if (!audioContext || !audioElement) {
    console.error('❌ [AudioAnalyzer] audioContext 또는 audioElement가 없습니다', {
      audioContext: !!audioContext,
      audioElement: !!audioElement
    });
    return null;
  }

  try {
    console.log('🔍 [AudioAnalyzer] Analyser 생성 중...');
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // 더 정밀한 분석을 위해 증가
    analyser.smoothingTimeConstant = 0.8; // 부드러운 전환
    analyser.minDecibels = -90; // 더 민감한 감지
    analyser.maxDecibels = -10;
    
    console.log('🔍 [AudioAnalyzer] MediaElementSource 생성 중...');
    const source = audioContext.createMediaElementSource(audioElement);
    
    console.log('🔍 [AudioAnalyzer] 연결 중...');
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    console.log('✅ [AudioAnalyzer] 성공적으로 생성됨');
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    return {
      analyser,
      dataArray,
      audioElement,
      audioContext,
      getVolume: () => {
        try {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          return Math.min(average / 128, 1); // 0-1 사이의 값으로 정규화
        } catch (error) {
          console.warn('⚠️ [AudioAnalyzer] getVolume 오류:', error);
          return 0;
        }
      },
      
      // 주파수 대역별 분석 (음성 특성에 맞게 세밀하게 조정)
      getFrequencyAnalysis: () => {
        try {
          analyser.getByteFrequencyData(dataArray);
          
          // 더 세밀한 주파수 대역 분석
          // 모음 (저주파): 0-800Hz
          const lowFreq = dataArray.slice(0, 80).reduce((a, b) => a + b) / 80;
          
          // 자음 (중주파): 800-2000Hz  
          const midFreq = dataArray.slice(80, 200).reduce((a, b) => a + b) / 120;
          
          // 치찰음 (고주파): 2000-4000Hz
          const highFreq = dataArray.slice(200, 400).reduce((a, b) => a + b) / 200;
          
          // 초고주파 (치찰음 강화): 4000-8000Hz
          const ultraHighFreq = dataArray.slice(400, 800).reduce((a, b) => a + b) / 400;
          
          return {
            low: Math.min(lowFreq / 128, 1),      // 모음 (아, 오, 우)
            mid: Math.min(midFreq / 128, 1),      // 자음 (에, 이)
            high: Math.min(highFreq / 128, 1),    // 치찰음 (스, 즈)
            ultraHigh: Math.min(ultraHighFreq / 128, 1), // 강한 치찰음 (시, 치)
            overall: Math.min((lowFreq + midFreq + highFreq + ultraHighFreq) / (128 * 4), 1)
          };
        } catch (error) {
          console.warn('⚠️ [AudioAnalyzer] getFrequencyAnalysis 오류:', error);
          return { low: 0, mid: 0, high: 0, ultraHigh: 0, overall: 0 };
        }
      },
      
      // 실시간 오디오 특성 분석 (개선된 버전)
      getAudioFeatures: () => {
        try {
          analyser.getByteFrequencyData(dataArray);
          
          // 에너지 분포 분석 (더 정교한 계산)
          let totalEnergy = 0;
          let weightedEnergy = 0;
          let spectralCentroid = 0;
          let spectralRolloff = 0;
          
          for (let i = 0; i < bufferLength; i++) {
            const frequency = i * (analyser.context.sampleRate / analyser.fftSize);
            const magnitude = dataArray[i] / 128;
            
            totalEnergy += magnitude;
            weightedEnergy += magnitude * magnitude; // 제곱으로 가중치 부여
            
            if (magnitude > 0) {
              spectralCentroid += frequency * magnitude;
            }
          }
          
          // 에너지 정규화 (더 민감하게)
          const energy = Math.min(totalEnergy / bufferLength, 1);
          const energyVariance = Math.min(weightedEnergy / bufferLength, 1);
          
          // 스펙트럼 중심 주파수
          spectralCentroid = totalEnergy > 0 ? spectralCentroid / totalEnergy : 0;
          spectralCentroid = Math.min(spectralCentroid / 8000, 1); // 8kHz로 정규화
          
          // 스펙트럼 롤오프 (주파수 분포 특성)
          let cumulativeEnergy = 0;
          const targetEnergy = totalEnergy * 0.85; // 85% 에너지 지점
          
          for (let i = 0; i < bufferLength; i++) {
            const magnitude = dataArray[i] / 128;
            cumulativeEnergy += magnitude;
            if (cumulativeEnergy >= targetEnergy) {
              const frequency = i * (analyser.context.sampleRate / analyser.fftSize);
              spectralRolloff = Math.min(frequency / 8000, 1);
              break;
            }
          }
          
          return {
            energy: energy,
            energyVariance: energyVariance, // 에너지 변화량
            spectralCentroid: spectralCentroid, // 스펙트럼 중심
            spectralRolloff: spectralRolloff, // 스펙트럼 롤오프
            frequencyData: Array.from(dataArray).slice(0, 200) // 처음 200개 주파수 데이터
          };
        } catch (error) {
          console.warn('⚠️ [AudioAnalyzer] getAudioFeatures 오류:', error);
          return { energy: 0, energyVariance: 0, spectralCentroid: 0, spectralRolloff: 0, frequencyData: [] };
        }
      },
      
      // 실시간 연결 상태 확인
      isConnected: () => {
        try {
          analyser.getByteFrequencyData(dataArray);
          return true;
        } catch (error) {
          return false;
        }
      },
      
      // 연결 상태 상세 정보
      getStatus: () => {
        return {
          isConnected: this?.isConnected() || false,
          audioElement: audioElement ? '존재함' : '없음',
          audioContext: audioContext ? '활성화' : '비활성화',
          analyser: analyser ? '생성됨' : '없음'
        };
      }
    };
  } catch (error) {
    console.error('❌ [AudioAnalyzer] 생성 실패:', error);
    return null;
  }
};

export const getVisemeFromAudio = (volume) => {
  // 기본적인 립싱크를 위한 블렌드쉐입 매핑 (더 민감하게 조정)
  const mouthOpen = Math.min(volume * 3, 1);  // 2 → 3으로 증가
  const mouthSmile = Math.max(0, (volume - 0.3) * 2);  // 0.5 → 0.3으로 감소
  
  // 부드러운 전환을 위한 최소값 설정 (더 낮게 조정)
  const minMouthOpen = 0.05;   // 0.1 → 0.05로 감소
  const minMouthSmile = 0.02;  // 0.05 → 0.02로 감소
  
  return {
    volume, // 원본 볼륨 값 추가
    mouthOpen: Math.max(mouthOpen, minMouthOpen),
    mouthSmile: Math.max(mouthSmile, minMouthSmile),
    // 추가적인 블렌드쉐입은 필요에 따라 구현
  };
}; 
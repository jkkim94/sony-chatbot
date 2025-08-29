import { createAudioAnalyzer, getVisemeFromAudio } from '../utils/audioAnalysis';

// 오디오 분석을 위한 설정
const AUDIO_SETTINGS = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  minDecibels: -100,
  maxDecibels: -10
};

export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.audioSource = null;
  }

  // 오디오 분석 초기화
  initAudioAnalysis() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
    }
  }

  // 오디오 데이터로부터 viseme 추출
  extractViseme(audioData) {
    if (!audioData) {
      console.log('오디오 데이터 없음');
      return null;
    }

    console.log('받은 오디오 데이터:', audioData);

    // audioAnalysis.js의 getVisemeFromAudio 함수 사용
    const visemeData = getVisemeFromAudio(audioData.volume);
    
    // mouthOpen 값에 따른 viseme 결정
    let viseme = 'sil';
    const { volume, mouthOpen, mouthSmile } = visemeData;

    if (volume < 0.05) {
      return { viseme: 'sil', intensity: 0 };
    }

    if (mouthOpen > 0.7) {
      viseme = 'aa';  // a 소리
    } else if (mouthOpen > 0.5) {
      viseme = 'O';   // o 소리
    } else if (mouthOpen > 0.3) {
      viseme = 'E';   // e 소리
    } else if (mouthOpen > 0.1) {
      viseme = 'SS';  // s, z 소리
    }

    // mouthSmile 값이 높으면 viseme 조정
    if (mouthSmile > 0.3) {
      if (mouthOpen > 0.5) {
        viseme = 'E';  // 웃으면서 말할 때는 'E' 소리로
      }
    }

    console.log('Viseme 결정:', {
      volume: volume.toFixed(2),
      mouthOpen: mouthOpen.toFixed(2),
      mouthSmile: mouthSmile.toFixed(2),
      viseme,
      intensity: volume
    });

    return { viseme, intensity: volume };
  }

  // 리소스 정리
  dispose() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.audioSource = null;
  }
} 
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
    this.audioAnalyzer = null; // audioAnalysis.js의 분석기 추가
    this.debugMode = true; // 디버그 모드를 기본적으로 활성화
    this.lastViseme = null; // 마지막 viseme 추적
    this.visemeChangeCount = 0; // viseme 변화 횟수 추적
    this.lastLogTime = 0; // 마지막 로그 시간
    this.logThrottleMs = 1000; // 로그 스로틀링 (1초)
  }

  // 디버그 모드 설정
  setDebugMode(enabled) {
    this.debugMode = enabled;
    if (enabled) {
      console.log('🔊 [AudioManager] 디버그 모드 활성화됨');
    }
  }

  // 로그 스로틀링을 위한 헬퍼 함수
  _shouldLog() {
    const now = Date.now();
    if (now - this.lastLogTime > this.logThrottleMs) {
      this.lastLogTime = now;
      return true;
    }
    return false;
  }

  // 오디오 분석 초기화
  initAudioAnalysis() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      if (this.debugMode) {
        console.log('🔊 [AudioManager] 오디오 컨텍스트 초기화됨');
      }
    }
  }

  // 실시간 오디오 분석기 설정
  setAudioAnalyzer(audioAnalyzer) {
    this.audioAnalyzer = audioAnalyzer;
    if (this.debugMode) {
      console.log('🔊 [AudioManager] 실시간 오디오 분석기 설정됨');
    }
  }

  // 실시간 오디오 특성 분석
  analyzeRealTimeAudio() {
    if (!this.audioAnalyzer) {
      if (this.debugMode && this._shouldLog()) {
        console.log('🔊 [AudioManager] AudioAnalyzer가 연결되지 않음');
      }
      return null;
    }

    try {
      // AudioAnalyzer 상태 확인
      if (this.audioAnalyzer.getStatus) {
        const status = this.audioAnalyzer.getStatus();
        if (this.debugMode && this._shouldLog()) {
          console.log('🔊 [AudioManager] AudioAnalyzer 상태:', status);
        }
      }

      const features = this.audioAnalyzer.getAudioFeatures();
      const frequency = this.audioAnalyzer.getFrequencyAnalysis();
      
      if (!features || !frequency) {
        if (this.debugMode && this._shouldLog()) {
          console.warn('🔊 [AudioManager] AudioAnalyzer에서 데이터를 가져올 수 없음');
        }
        return null;
      }
      
      return {
        ...features,
        frequency,
        timestamp: Date.now()
      };
    } catch (error) {
      if (this.debugMode) {
        console.warn('🔊 [AudioManager] 실시간 분석 중 오류:', error);
        console.log('🔊 [AudioManager] AudioAnalyzer 정보:', {
          hasAudioAnalyzer: !!this.audioAnalyzer,
          audioAnalyzerType: typeof this.audioAnalyzer,
          audioAnalyzerKeys: this.audioAnalyzer ? Object.keys(this.audioAnalyzer) : []
        });
      }
      return null;
    }
  }

  // 오디오 데이터로부터 viseme 추출 (한국어 발음에 최적화)
  extractViseme(audioData) {
    if (!audioData) {
      if (this.debugMode && this._shouldLog()) {
        console.log('🔊 [AudioManager] 오디오 데이터 없음');
      }
      return null;
    }

    // 실시간 오디오 분석만 사용
    const realTimeData = this.analyzeRealTimeAudio();
    if (!realTimeData) {
      if (this.debugMode && this._shouldLog()) {
        console.log('🔊 [AudioManager] 실시간 분석 데이터 없음');
      }
      return { viseme: 'sil', intensity: 0 };
    }

    // 실시간 분석 결과로 viseme 결정
    const { energy, frequency, spectralCentroid } = realTimeData;
    const { low, mid, high } = frequency;
    
    let viseme = 'sil';
    let intensity = energy || 0;

    // 디버그: 실제 주파수 값들 확인
    if (this.debugMode && this._shouldLog()) {
      console.log('🔊 [AudioManager] 주파수 분석 데이터:', {
        energy: energy?.toFixed(3) || 'N/A',
        low: low?.toFixed(3) || 'N/A',
        mid: mid?.toFixed(3) || 'N/A',
        high: high?.toFixed(3) || 'N/A',
        spectralCentroid: spectralCentroid?.toFixed(3) || 'N/A'
      });
    }

    // 한국어 발음에 맞는 viseme 결정 (더 민감하게)
    if (energy < 0.05) {
      // 무음 상태
      viseme = 'sil';
    } else if (low > 0.2 && low > mid && low > high) {
      // 저주파 강함 - 모음 (아, 오, 우)
      if (low > 0.5) {
        viseme = 'aa';  // 아 소리 (가장 큰 입)
      } else if (low > 0.3) {
        viseme = 'O';   // 오 소리
      } else {
        viseme = 'E';   // 에 소리
      }
    } else if (mid > 0.2 && mid > low && mid > high) {
      // 중주파 강함 - 자음 (에, 이)
      if (mid > 0.4) {
        viseme = 'E';   // 에 소리
      } else {
        viseme = 'SS';  // 스, 즈 소리
      }
    } else if (high > 0.2 && high > low && high > mid) {
      // 고주파 강함 - 치찰음 (스, 시, 치)
      viseme = 'SS';
    } else if (energy > 0.15) {
      // 에너지 기반으로 결정 (더 낮은 임계값)
      if (energy > 0.6) {
        viseme = 'aa';  // 아 소리
      } else if (energy > 0.4) {
        viseme = 'O';   // 오 소리
      } else if (energy > 0.25) {
        viseme = 'E';   // 에 소리
      } else {
        viseme = 'SS';  // 스 소리
      }
    } else {
      // 낮은 에너지 - 무음
      viseme = 'sil';
    }

    // 한국어 특성에 맞는 보정
    if (energy > 0.1 && energy < 0.3) {
      // 중간 에너지일 때 더 다양한 viseme 사용
      if (spectralCentroid && spectralCentroid < 0.3) {
        viseme = 'aa';  // 저주파 특성
      } else if (spectralCentroid && spectralCentroid > 0.7) {
        viseme = 'SS';  // 고주파 특성
      }
    }

    // viseme 변화 감지 및 로깅
    const visemeChanged = this.lastViseme !== viseme;
    if (visemeChanged) {
      this.visemeChangeCount++;
      this.lastViseme = viseme;
      
      if (this.debugMode && this._shouldLog()) {
        console.log(`🔊 [AudioManager] Viseme 변화 #${this.visemeChangeCount}: ${this.lastViseme} → ${viseme}`);
        console.log(`🔊 [AudioManager] 분석 결과:`, {
          energy: energy?.toFixed(3) || 'N/A',
          lowFreq: low?.toFixed(3) || 'N/A',
          midFreq: mid?.toFixed(3) || 'N/A',
          highFreq: high?.toFixed(3) || 'N/A',
          spectralCentroid: spectralCentroid?.toFixed(3) || 'N/A',
          viseme,
          visemeReason: this._getVisemeReason(viseme, low, mid, high, energy)
        });
      }
    }

    return { viseme, intensity: intensity };
  }

  // viseme 결정 이유 설명 (한국어 발음에 맞게)
  _getVisemeReason(viseme, low, mid, high, energy) {
    if (energy < 0.05) {
      return `무음 상태 (${energy.toFixed(3)})`;
    } else if (low > 0.2 && low > mid && low > high) {
      return `저주파 강함 (${low.toFixed(3)}) - 모음 (아, 오, 우)`;
    } else if (mid > 0.2 && mid > low && mid > high) {
      return `중주파 강함 (${mid.toFixed(3)}) - 자음 (에, 이)`;
    } else if (high > 0.2 && high > low && high > mid) {
      return `고주파 강함 (${high.toFixed(3)}) - 치찰음 (스, 시, 치)`;
    } else if (energy > 0.15) {
      return `에너지 기반 (${energy.toFixed(3)}) - 스펙트럼 분석`;
    } else {
      return `낮은 에너지 (${energy.toFixed(3)}) - 무음`;
    }
  }

  // 현재 상태 정보 반환
  getStatus() {
    return {
      debugMode: this.debugMode,
      lastViseme: this.lastViseme,
      visemeChangeCount: this.visemeChangeCount,
      lastLogTime: this.lastLogTime,
      audioAnalyzer: this.audioAnalyzer ? '연결됨' : '미연결',
      audioContext: this.audioContext ? '활성화' : '비활성화'
    };
  }

  // 실시간 분석 테스트
  testRealTimeAnalysis() {
    if (!this.audioAnalyzer) {
      console.warn('🔊 [AudioManager] AudioAnalyzer가 연결되지 않음');
      return null;
    }

    try {
      const result = this.analyzeRealTimeAudio();
      console.log('🔊 [AudioManager] 실시간 분석 테스트 결과:', result);
      return result;
    } catch (error) {
      console.error('🔊 [AudioManager] 실시간 분석 테스트 실패:', error);
      return null;
    }
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
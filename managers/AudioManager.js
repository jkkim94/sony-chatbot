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
    this.logThrottleMs = 300; // 로그 스로틀링 (0.3초로 줄임)
    
    // viseme 지속 시스템
    this.currentViseme = 'sil'; // 현재 유지 중인 viseme
    this.visemeStartTime = 0; // viseme 시작 시간
    this.visemeMinDuration = 300; // viseme 최소 지속 시간 (ms)
    this.visemeStabilityThreshold = 0.6; // viseme 안정성 임계값
    this.visemeHistory = []; // viseme 변화 히스토리
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

  // viseme 지속 시간 확인
  _shouldChangeViseme(newViseme) {
    const now = Date.now();
    const elapsed = now - this.visemeStartTime;
    
    // 최소 지속 시간이 지나지 않았으면 변경하지 않음
    if (elapsed < this.visemeMinDuration) {
      return false;
    }
    
    // 같은 viseme이면 변경하지 않음
    if (newViseme === this.currentViseme) {
      return false;
    }
    
    // 무음(sil)에서 다른 viseme으로의 전환은 즉시 허용
    if (this.currentViseme === 'sil' && newViseme !== 'sil') {
      return true;
    }
    
    // 다른 viseme에서 무음으로의 전환은 지연
    if (newViseme === 'sil' && this.currentViseme !== 'sil') {
      return elapsed > this.visemeMinDuration * 2; // 2배 더 오래 기다림
    }
    
    // 일반적인 viseme 전환
    return true;
  }

  // viseme 안정성 계산
  _calculateVisemeStability(newViseme, energy, low, mid, high) {
    let stability = 0;
    
    // 에너지 기반 안정성
    if (energy > 0.3) stability += 0.3;
    else if (energy > 0.1) stability += 0.2;
    
    // 주파수 기반 안정성
    if (newViseme === 'aa' && low > 0.4) stability += 0.4;
    else if (newViseme === 'O' && low > 0.3) stability += 0.4;
    else if (newViseme === 'E' && mid > 0.3) stability += 0.4;
    else if (newViseme === 'I' && mid > 0.3) stability += 0.4;
    else if (newViseme === 'U' && low > 0.3) stability += 0.4;
    else if (newViseme === 'SS' && high > 0.25) stability += 0.4;
    
    return Math.min(stability, 1.0);
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
    if (audioAnalyzer === null) {
      // AudioAnalyzer 연결 해제
      this.audioAnalyzer = null;
      if (this.debugMode) {
        console.log('🔊 [AudioManager] AudioAnalyzer 연결 해제됨');
      }
    } else {
      // 새로운 AudioAnalyzer 설정
      this.audioAnalyzer = audioAnalyzer;
      if (this.debugMode) {
        console.log('🔊 [AudioManager] 실시간 오디오 분석기 설정됨');
      }
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

    // 한국어 모음별 정밀한 주파수 분석
    if (energy < 0.05) {
      // 무음 상태
      viseme = 'sil';
    } else {
      // 모음 분류를 위한 정밀한 주파수 분석
      const lowRatio = low / (low + mid + high + 0.001); // 0으로 나누기 방지
      const midRatio = mid / (low + mid + high + 0.001);
      const highRatio = high / (low + mid + high + 0.001);
      
      // 스펙트럼 중심 주파수를 이용한 모음 구분
      if (spectralCentroid && spectralCentroid < 0.2) {
        // 매우 낮은 주파수 - 우(U) 소리
        if (low > 0.3 && lowRatio > 0.6) {
          viseme = 'U';  // 우 소리
        } else {
          viseme = 'O';  // 오 소리
        }
      } else if (spectralCentroid && spectralCentroid < 0.4) {
        // 낮은 주파수 - 오(O), 에(E) 소리
        if (low > 0.25 && lowRatio > 0.5) {
          viseme = 'O';  // 오 소리
        } else {
          viseme = 'E';  // 에 소리
        }
      } else if (spectralCentroid && spectralCentroid < 0.6) {
        // 중간 주파수 - 아(aa), 에(E) 소리
        if (low > 0.3 && lowRatio > 0.4) {
          viseme = 'aa'; // 아 소리
        } else {
          viseme = 'E';  // 에 소리
        }
      } else if (spectralCentroid && spectralCentroid < 0.8) {
        // 높은 주파수 - 이(I) 소리
        if (mid > 0.25 && midRatio > 0.4) {
          viseme = 'I';  // 이 소리
        } else {
          viseme = 'E';  // 에 소리
        }
      } else {
        // 매우 높은 주파수 - 치찰음
        if (high > 0.2 && highRatio > 0.4) {
          viseme = 'SS'; // 스, 시, 치 소리
        } else {
          viseme = 'E';  // 에 소리 (기본값)
        }
      }
      
      // 에너지 기반 보정 (더 정확한 분류)
      if (energy > 0.6 && low > 0.4) {
        // 높은 에너지 + 저주파 = 아(aa) 소리
        viseme = 'aa';
      } else if (energy > 0.5 && mid > 0.3) {
        // 중간 에너지 + 중주파 = 이(I) 소리
        viseme = 'I';
      } else if (energy > 0.4 && high > 0.25) {
        // 중간 에너지 + 고주파 = 치찰음
        viseme = 'SS';
      }
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

    // viseme 지속 시스템 적용
    const now = Date.now();
    const shouldChange = this._shouldChangeViseme(viseme);
    const stability = this._calculateVisemeStability(viseme, energy, low, mid, high);
    
    let finalViseme = this.currentViseme; // 기본적으로 현재 viseme 유지
    
    if (shouldChange) {
      // viseme 변경 조건 충족
      if (stability > this.visemeStabilityThreshold) {
        // 안정성이 높으면 viseme 변경
        finalViseme = viseme;
        this.currentViseme = viseme;
        this.visemeStartTime = now;
        
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
              finalViseme,
              stability: stability.toFixed(3),
              elapsed: (now - this.visemeStartTime).toFixed(0),
              visemeReason: this._getVisemeReason(viseme, low, mid, high, energy)
            });
          }
        }
      } else {
        // 안정성이 낮으면 현재 viseme 유지
        if (this.debugMode && this._shouldLog()) {
          console.log(`🔊 [AudioManager] Viseme 안정성 부족: ${viseme} (안정성: ${stability.toFixed(3)}) - ${this.currentViseme} 유지`);
        }
      }
    } else {
      // viseme 변경 조건 미충족 - 현재 viseme 유지
      if (this.debugMode && this._shouldLog()) {
        console.log(`🔊 [AudioManager] Viseme 지속 중: ${this.currentViseme} (경과: ${(now - this.visemeStartTime).toFixed(0)}ms)`);
      }
    }

    return { viseme: finalViseme, intensity: intensity };
  }

  // viseme 결정 이유 설명 (한국어 모음별 정밀 분석)
  _getVisemeReason(viseme, low, mid, high, energy) {
    if (energy < 0.05) {
      return `무음 상태 (${energy.toFixed(3)})`;
    } else if (viseme === 'U') {
      return `우(U) 소리 - 매우 낮은 주파수 특성 (${low.toFixed(3)})`;
    } else if (viseme === 'O') {
      return `오(O) 소리 - 낮은 주파수 특성 (${low.toFixed(3)})`;
    } else if (viseme === 'aa') {
      return `아(aa) 소리 - 중간 주파수 특성 (${low.toFixed(3)})`;
    } else if (viseme === 'E') {
      return `에(E) 소리 - 중간 주파수 특성 (${mid.toFixed(3)})`;
    } else if (viseme === 'I') {
      return `이(I) 소리 - 높은 주파수 특성 (${mid.toFixed(3)})`;
    } else if (viseme === 'SS') {
      return `치찰음(SS) - 고주파 특성 (${high.toFixed(3)})`;
    } else {
      return `에너지 기반 (${energy.toFixed(3)}) - 스펙트럼 분석`;
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
      audioContext: this.audioContext ? '활성화' : '비활성화',
      // viseme 지속 시스템 상태
      currentViseme: this.currentViseme,
      visemeStartTime: this.visemeStartTime,
      visemeMinDuration: this.visemeMinDuration,
      visemeStabilityThreshold: this.visemeStabilityThreshold
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
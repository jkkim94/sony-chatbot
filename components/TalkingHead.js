// React imports
import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';

// Three.js imports
import * as THREE from 'three';

// Manager imports
import { AnimationManager } from '../managers/AnimationManager';
import { FacialAnimationManager } from '../managers/FacialAnimationManager';
import { AudioManager } from '../managers/AudioManager';
import { BlinkingManager } from '../managers/BlinkingManager';
import { LipSyncManager } from '../managers/LipSyncManager';
import { HandTrailManager } from '../managers/HandTrailManager';
import { ParticleTrailManager } from '../managers/ParticleTrailManager';
import CameraManager from '../managers/CameraManager';
import { PreloadManager } from '../managers/PreloadManager';

// Utility imports
import { applyBlendshapeValue } from '../utils/blendshapeUtils';

// ========================================
// ===== CONSTANTS & CONFIGURATION =====
// ========================================

// Three.js 캐시 활성화 (성능 향상)
THREE.Cache.enabled = true;
console.log('🚀 [TalkingHead] Three.js 캐시 활성화됨');

// ========================================
// ===== DEBUG SYSTEM INITIALIZATION =====
// ========================================

// 클라이언트 사이드에서만 디버그 시스템 초기화
const initializeDebugSystem = () => {
  if (typeof window === 'undefined') return;
  
  // 전역 디버그 시스템 초기화
  if (!window.__DEBUG_VISEME_PROCESS__) {
    window.__DEBUG_VISEME_PROCESS__ = {
      lastLogTime: 0,
      logThrottleMs: 800, // 0.8초마다 로그 허용
      shouldLog() {
        const now = Date.now();
        if (now - this.lastLogTime > this.logThrottleMs) {
          this.lastLogTime = now;
          return true;
        }
        return false;
      }
    };
  }

  // 디버그 모드 전역 제어 함수
  window.enableVisemeDebug = (enabled = true) => {
    if (enabled) {
      console.log('🔍 [Debug] Viseme 처리 디버그 모드 활성화됨');
      console.log('🔍 [Debug] 사용 가능한 디버그 함수들:');
      console.log('  - window.enableVisemeDebug(true/false)');
      console.log('  - window.enableAudioDebug(true/false)');
      console.log('  - window.enableBlendshapeDebug(true/false)');
      console.log('  - window.showDebugStatus()');
    } else {
      console.log('🔍 [Debug] Viseme 처리 디버그 모드 비활성화됨');
    }
  };

  // 오디오 디버그 모드 제어
  window.enableAudioDebug = (enabled = true) => {
    if (window.audioManagerRef && window.audioManagerRef.current) {
      window.audioManagerRef.current.setDebugMode(enabled);
    } else {
      console.warn('🔍 [Debug] AudioManager가 아직 초기화되지 않음');
    }
  };

  // 블렌드쉐이프 디버그 모드 제어
  window.enableBlendshapeDebug = (enabled = true) => {
    if (enabled) {
      window.__blendshapeLogState = {
        lastLogTime: 0,
        logThrottleMs: 300, // 0.3초마다 로그 허용
        appliedCount: 0,
        lastValues: new Map()
      };
      console.log('🔍 [Debug] Blendshape 디버그 모드 활성화됨');
    } else {
      window.__blendshapeLogState = null;
      console.log('🔍 [Debug] Blendshape 디버그 모드 비활성화됨');
    }
  };

  // 디버그 상태 확인
window.showDebugStatus = () => {
  console.log('🔍 [Debug] 현재 디버그 상태:');
  console.log('  - Viseme 처리:', window.__DEBUG_VISEME_PROCESS__ ? '활성화' : '비활성화');
  console.log('  - Blendshape:', window.__blendshapeLogState ? '활성화' : '비활성화');
  
  if (window.audioManagerRef && window.audioManagerRef.current) {
    const audioStatus = window.audioManagerRef.current.getStatus();
    console.log('  - AudioManager:', audioStatus);
  } else {
    console.log('  - AudioManager: 초기화되지 않음');
  }
};

// 실시간 분석 테스트
window.testRealTimeAnalysis = () => {
  if (window.audioManagerRef && window.audioManagerRef.current) {
    return window.audioManagerRef.current.testRealTimeAnalysis();
  } else {
    console.warn('🔍 [Debug] AudioManager가 초기화되지 않음');
    return null;
  }
};

// AudioAnalyzer 강제 재설정
window.resetAudioAnalyzer = async () => {
  try {
    const audioElement = document.querySelector('audio') || document.querySelector('video');
    if (audioElement && window.audioManagerRef && window.audioManagerRef.current) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
              const { createAudioAnalyzer } = await import('../utils/audioAnalysis');
      const audioAnalyzer = createAudioAnalyzer(audioContext, audioElement);
      
      window.audioManagerRef.current.setAudioAnalyzer(audioAnalyzer);
      console.log('🔊 [Debug] AudioAnalyzer 강제 재설정 완료');
      return true;
    } else {
      console.warn('🔍 [Debug] 오디오 요소 또는 AudioManager를 찾을 수 없음');
      return false;
    }
  } catch (error) {
    console.error('🔍 [Debug] AudioAnalyzer 재설정 실패:', error);
    return false;
  }
};
};

// 애니메이션 관련 상수
const ANIMATION_CONSTANTS = {
  FRAME_DURATION: 1000 / 30, // 30fps
  AUTO_TIMEOUT: 8000, // 8초 후 자동 종료
  BLINK_DELAY: 200,
  FACIAL_ANIMATION_DELAY: 500,
  NEUTRAL_FACIAL_DELAY: 300
};

// EYE TRACKING 관련 블렌드쉐입 패턴
const EYE_TRACKING_PATTERNS = [
  // 기본 eye tracking 패턴
  'eyeLookOutLeft', 'eyeLookOutRight',
  'eyeLookInLeft', 'eyeLookInRight',
  'eyeLookUp', 'eyeLookDown',
  'eyeLook', 'eyeTracking', 'eyeGaze',
  'lookLeft', 'lookRight', 'lookUp', 'lookDown',
  'gazeLeft', 'gazeRight', 'gazeUp', 'gazeDown',
  
  // CC4 모델에서 사용되는 패턴
  'Eye_Look', 'Eye_Gaze', 'Eye_Tracking',
  'LeftEye', 'RightEye', 'Left_Eye', 'Right_Eye',
  'eye_look', 'eye_gaze', 'eye_tracking',
  'left_eye', 'right_eye', 'left_eye', 'right_eye',
  
  // 추가 안전 패턴
  'EyeDirection', 'EyeMovement', 'EyeRotation',
  'eye_direction', 'eye_movement', 'eye_rotation',
  'EyePos', 'EyePosX', 'EyePosY', 'EyePosZ',
  'eye_pos', 'eye_pos_x', 'eye_pos_y', 'eye_pos_z'
];

// ========================================
// ===== GLOBAL FUNCTIONS =====
// ========================================

// 애니메이션 데이터를 전달받는 함수들 (전역 함수로 유지)
// 애니메이션 데이터를 전달받는 함수
export const receiveAnimationData = (animationData) => {
  if (!window.animationData) {
    window.animationData = {};
  }
  window.animationData = animationData;
};

// 모션 데이터를 전달받는 함수
export const receiveMotionData = (motionData) => {
  if (!window.animationData) {
    window.animationData = {};
  }
  
  // 기존 애니메이션 데이터가 있다면 중단
  if (window.animationData.isPlaying) {
    console.log('기존 애니메이션 중단');
    window.animationData.isPlaying = false;
    
    // API 애니메이션 종료 이벤트 발생
    const endEvent = new CustomEvent('apiAnimationEnd', {
      detail: { 
        timestamp: Date.now(),
        reason: 'new_animation_started'
      }
    });
    window.dispatchEvent(endEvent);
  }
  
  // API 응답 데이터인지 확인
  if (motionData.result) {
    handleApiMotionData(motionData);
  } else {
    handleAnimationTypeData(motionData);
  }
};

// API 모션 데이터 처리
const handleApiMotionData = (motionData) => {
  // 이미 동일한 결과가 처리 중이면 무시
  if (window.animationData.result === motionData.result) {
    console.log('동일한 API 응답 무시');
    return;
  }
  
  console.log('새로운 API 모션 데이터 수신');
  
  // API 애니메이션 시작 이벤트 발생
  const startEvent = new CustomEvent('apiAnimationStart', {
    detail: { 
      timestamp: Date.now(),
      result: motionData.result
    }
  });
  window.dispatchEvent(startEvent);
  
  // API 응답 데이터 설정
  window.animationData = {
    result: motionData.result,
    isPlaying: true,
    timestamp: Date.now()
  };
  
  // API 애니메이션 자동 종료 타이머 설정
  setTimeout(() => {
    if (window.animationData && window.animationData.isPlaying) {
      console.log('⏰ [TalkingHead] API 애니메이션 자동 종료 타이머 실행');
      window.animationData.isPlaying = false;
      
      const endEvent = new CustomEvent('apiAnimationEnd', {
        detail: { 
          timestamp: Date.now(),
          reason: 'auto_timeout'
        }
      });
      window.dispatchEvent(endEvent);
    }
  }, ANIMATION_CONSTANTS.AUTO_TIMEOUT);
};

// 애니메이션 타입 데이터 처리
const handleAnimationTypeData = (motionData) => {
  if (motionData.animationType) {
    console.log('새로운 애니메이션 타입 전달:', motionData.animationType);
    const event = new CustomEvent('animationChange', {
      detail: { animationType: motionData.animationType }
    });
    window.dispatchEvent(event);
    
    // 표정 애니메이션 재생
    if (window.facialAnimationManager && window.morphTargetsRef && window.blendshapeValuesRef) {
      setTimeout(() => {
        window.facialAnimationManager.playAnimationBasedFacial(
          motionData.animationType, 
          window.morphTargetsRef, 
          window.blendshapeValuesRef
        );
      }, ANIMATION_CONSTANTS.FACIAL_ANIMATION_DELAY);
    }
  } else {
    // 애니메이션 타입이 없으면 Idle로 전환
    console.log('애니메이션 타입 없음, Idle로 전환');
    const event = new CustomEvent('animationChange', {
      detail: { animationType: 'Idle' }
    });
    window.dispatchEvent(event);
    
    // 중립 표정 애니메이션 재생
    if (window.facialAnimationManager && window.morphTargetsRef && window.blendshapeValuesRef) {
      setTimeout(() => {
        window.facialAnimationManager.playFacialAnimation(
          'neutral', 
          window.morphTargetsRef, 
          window.blendshapeValuesRef
        );
      }, ANIMATION_CONSTANTS.FACIAL_ANIMATION_DELAY);
    }
  }
};

// 기본 애니메이션 설정 함수
export const setDefaultAnimation = () => {
  if (!window.animationData) {
    window.animationData = {};
  }
  
  // 기본 Breathing Idle 애니메이션 설정
  window.animationData = {
    'Idle': {
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      isPlaying: true,
      timestamp: Date.now()
    },
    isPlaying: true,
    timestamp: Date.now()
  };
  
  console.log('✅ [TalkingHead] 기본 애니메이션 설정 완료: Idle (모든 본 포함)');
  
  // 애니메이션 데이터가 제대로 설정되었는지 확인
  if (window.animationData && Object.keys(window.animationData).length > 0) {
    console.log('✅ [TalkingHead] window.animationData 확인됨:', {
      keys: Object.keys(window.animationData),
      hasIdle: !!window.animationData['Idle'],
      hasBones: Object.keys(window.animationData).filter(key => key.includes('mixamorig'))
    });
  } else {
    console.warn('⚠️ [TalkingHead] window.animationData가 비어있음');
  }
};


// ========================================
// ===== MAIN COMPONENT =====
// ========================================

const TalkingHeadRefactored = forwardRef(({ 
  // 애니메이션 관련 props
  audioBase64, 
  blendshapeFrames, 
  morphTargetNames, 
  readyToPlay,
  
  // 모델 관련 props
  currentModel,
  isSkeletonVisible,
  
  // 효과 관련 props
  effectStates,
  onEffectToggle,
  
  // 조명 관련 props
  lightingSettings,
  
  // 배경 관련 props
  currentBackground,
  
  // 렌더링 관련 props
  renderingSettings,
  
  // 머티리얼 관련 props
  materialSettings,
  
  // 오디오 상태 관련 props
  onAudioStateChange,
  
  // 로딩 상태 관련 props
  onInitialLoadingChange,
  onFirstModelLoaded,
  
  // 프리로딩 관련 props
  onPreloadStart,
  onPreloadComplete
}, ref) => {
  // ========================================
  // ===== REFS & STATE =====
  // ========================================
  
  // Three.js 기본 refs
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  
  // 모델 관련 refs
  const modelRef = useRef(null);
  const skeletonHelperRef = useRef(null);
  const mixerRef = useRef(null);
  const morphTargetsRef = useRef({});
  const blendshapeValuesRef = useRef([]);
  const blendshapeMapRef = useRef(null);
  
  // 매니저 인스턴스 refs
  const animationManagerRef = useRef(new AnimationManager());
  const facialAnimationManagerRef = useRef(new FacialAnimationManager());
  const audioManagerRef = useRef(new AudioManager());
  const blinkingManagerRef = useRef(new BlinkingManager());
  const lipSyncManagerRef = useRef(new LipSyncManager());
  const handTrailManagerRef = useRef(new HandTrailManager());
  const particleTrailManagerRef = useRef(new ParticleTrailManager());
  const cameraManagerRef = useRef(new CameraManager());
  const preloadManagerRef = useRef(new PreloadManager());

  // AudioManager를 전역으로 등록 (디버그 시스템에서 접근하기 위함)
  useEffect(() => {
    if (audioManagerRef.current) {
      window.audioManagerRef = audioManagerRef;
      console.log('🔗 [TalkingHead] AudioManager를 window 객체에 등록 완료');
      
      // AudioManager 디버그 모드 활성화 (intensity 계산 과정 확인용)
      audioManagerRef.current.setDebugMode(true);
      console.log('🔊 [TalkingHead] AudioManager 디버그 모드 활성화됨');
    }
  }, []);

  // AudioAnalyzer 설정 함수를 useCallback으로 감싸기
  const setupAudioAnalyzer = useCallback(async () => {
    try {
      // 오디오 요소가 있는지 확인 (더 적극적으로 검색)
      let audioElement = document.querySelector('audio[data-audio-analysis]') || 
                        document.querySelector('audio') || 
                        document.querySelector('video');
      
      // 더 구체적인 선택자로 검색
      if (!audioElement) {
        audioElement = document.querySelector('audio[src]') || 
                      document.querySelector('video[src]') ||
                      document.querySelector('audio[data-src]') ||
                      document.querySelector('video[data-src]');
      }
      
      console.log('🔍 [AudioAnalyzer] 찾은 오디오 요소:', audioElement);
      
      if (audioElement && audioManagerRef.current) {
        // 오디오 요소의 상태 확인
        console.log('🔍 [AudioAnalyzer] 오디오 요소 상태:', {
          tagName: audioElement.tagName,
          src: audioElement.src || audioElement.currentSrc,
          readyState: audioElement.readyState,
          networkState: audioElement.networkState,
          paused: audioElement.paused,
          ended: audioElement.ended,
          duration: audioElement.duration,
          currentTime: audioElement.currentTime,
          hasDataAudioAnalysis: audioElement.hasAttribute('data-audio-analysis')
        });
        
        // 기존 AudioAnalyzer가 있다면 정리
        if (audioManagerRef.current.audioAnalyzer) {
          console.log('🔄 [AudioAnalyzer] 기존 AudioAnalyzer 정리 중...');
          audioManagerRef.current.setAudioAnalyzer(null);
        }
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const { createAudioAnalyzer } = await import('../utils/audioAnalysis');
        const audioAnalyzer = createAudioAnalyzer(audioContext, audioElement);
        
        if (audioAnalyzer) {
          audioManagerRef.current.setAudioAnalyzer(audioAnalyzer);
          console.log('🔊 [TalkingHead] AudioAnalyzer 설정 완료');
          
          // 연결 상태 확인
          setTimeout(() => {
            if (audioManagerRef.current.audioAnalyzer) {
              console.log('✅ [AudioAnalyzer] 연결 상태 확인됨');
            } else {
              console.warn('❌ [AudioAnalyzer] 연결 실패');
            }
          }, 500);
        } else {
          console.error('❌ [AudioAnalyzer] createAudioAnalyzer가 null을 반환함');
        }
      } else {
        console.warn('🔍 [AudioAnalyzer] 오디오 요소 또는 AudioManager를 찾을 수 없음');
        console.log('🔍 [AudioAnalyzer] 현재 DOM 상태:', {
          audioElements: document.querySelectorAll('audio').length,
          videoElements: document.querySelectorAll('video').length,
          dataAudioAnalysisElements: document.querySelectorAll('audio[data-audio-analysis]').length,
          audioManagerExists: !!audioManagerRef.current
        });
      }
    } catch (error) {
      console.warn('🔊 [TalkingHead] AudioAnalyzer 설정 실패:', error);
    }
  }, []);

  // AudioAnalyzer 설정 (실시간 오디오 분석용)
  useEffect(() => {

    // 컴포넌트 마운트 후 AudioAnalyzer 설정 (더 빠르게)
    const timer = setTimeout(setupAudioAnalyzer, 500);
    
    // DOM 변화 감지하여 오디오 요소가 추가될 때마다 AudioAnalyzer 연결 시도
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // audio[data-audio-analysis] 요소가 추가되었는지 확인
              if (node.matches && node.matches('audio[data-audio-analysis]')) {
                console.log('🎵 [AudioAnalyzer] 새로운 오디오 요소 감지됨:', node);
                // 즉시 AudioAnalyzer 연결 시도 (더 빠르게)
                setTimeout(() => {
                  setupAudioAnalyzer();
                }, 50);
              }
              // 자식 요소들도 확인
              const audioElements = node.querySelectorAll && node.querySelectorAll('audio[data-audio-analysis]');
              if (audioElements && audioElements.length > 0) {
                console.log('🎵 [AudioAnalyzer] 자식 요소에서 오디오 요소 감지됨:', audioElements);
                setTimeout(() => {
                  setupAudioAnalyzer();
                }, 50);
              }
            }
          });
        }
      });
    });

    // DOM 변화 감지 시작
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  // AudioAnalyzer 연결 상태 지속 모니터링 및 재연결 (더 적극적으로)
  const monitorAndReconnect = useCallback(async () => {
    // AudioAnalyzer가 연결되지 않았거나 연결이 끊어진 경우
    if (!audioManagerRef.current?.audioAnalyzer) {
      console.log('🔄 [AudioAnalyzer] 연결 시도 중...');
      
      try {
        // 오디오 요소 재검색 (더 적극적으로)
        let audioElement = document.querySelector('audio[data-audio-analysis]') || 
                          document.querySelector('audio') || 
                          document.querySelector('video');
        
        if (!audioElement) {
          audioElement = document.querySelector('audio[src]') || 
                        document.querySelector('video[src]') ||
                        document.querySelector('audio[data-src]') ||
                        document.querySelector('video[data-src]');
        }
        
        if (audioElement && audioManagerRef.current) {
          console.log('🔄 [AudioAnalyzer] 재연결 시도 - 오디오 요소:', audioElement);
          
          // 기존 AudioAnalyzer가 있다면 정리
          if (audioManagerRef.current.audioAnalyzer) {
            console.log('🔄 [AudioAnalyzer] 기존 AudioAnalyzer 정리 중...');
            audioManagerRef.current.setAudioAnalyzer(null);
          }
          
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const { createAudioAnalyzer } = await import('../utils/audioAnalysis');
          const audioAnalyzer = createAudioAnalyzer(audioContext, audioElement);
          
          if (audioAnalyzer) {
            audioManagerRef.current.setAudioAnalyzer(audioAnalyzer);
            console.log('🔄 [AudioAnalyzer] 재연결 완료');
            
            // 연결 상태 확인
            setTimeout(() => {
              if (audioManagerRef.current.audioAnalyzer) {
                console.log('✅ [AudioAnalyzer] 재연결 상태 확인됨');
              } else {
                console.warn('❌ [AudioAnalyzer] 재연결 실패');
              }
            }, 200);
          } else {
            console.error('❌ [AudioAnalyzer] 재연결 시도 중 createAudioAnalyzer 실패');
          }
        } else {
          console.log('🔍 [AudioAnalyzer] 재연결 시도: 오디오 요소 또는 AudioManager를 찾을 수 없음');
        }
      } catch (error) {
        console.warn('🔊 [AudioAnalyzer] 재연결 시도 실패:', error);
      }
    }
  }, []);

  useEffect(() => {
    // 1초마다 연결 상태 확인 및 필요시 재연결 (더 자주)
    const interval = setInterval(monitorAndReconnect, 1000);
    
    // 초기 실행
    monitorAndReconnect();
    
    return () => clearInterval(interval);
  }, [monitorAndReconnect]);



  // 디버그 시스템 초기화 (클라이언트 사이드에서만)
  useEffect(() => {
    initializeDebugSystem();
  }, []);

  // 씬 객체 refs
  const floorRef = useRef(null);
  const shadowFloorRef = useRef(null);
  
  // 조명 refs
  const lightsRef = useRef({
    hemisphereLight: null,
    ambientLight: null,
    mainLight: null,
    fillLight: null,
    rimLight: null,
    directionalLight: null,
    pointLight: null,
    spotLight: null
  });
  
  // 애니메이션 관련 refs
  const animationFrameRef = useRef(null);
  const fpsRef = useRef({ lastTime: 0, frames: 0, fps: 0 });
  
  // 상태
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isFirstModelLoad, setIsFirstModelLoad] = useState(true);
  
  // 블렌드셰이프 부드러운 전환을 위한 상태
  const blendshapeSmoothingRef = useRef(new Map()); // 각 블렌드셰이프별 스무딩 상태
  const targetValuesRef = useRef(new Map()); // 각 블렌드셰이프별 목표 값
  const currentValuesRef = useRef(new Map()); // 각 블렌드셰이프별 현재 값


  // ========================================
  // ===== SCENE INITIALIZATION =====
  // ========================================
  
  // 3D 씬 + 첫 번째 모델 통합 초기화
  const initSceneWithFirstModel = async (firstModelName = 'brunette') => {
    if (!containerRef.current) return;

    // Scene 설정 (외부 currentBackground props 사용)
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // BackgroundManager 필수 체크 (window에서 가져오기)
    if (typeof window === 'undefined' || !window.backgroundManager) {
      console.error('❌ [TalkingHead] BackgroundManager가 없습니다. 초기화를 확인하세요.');
      return;
    }
    
    try {
      window.backgroundManager.setSceneRef(sceneRef);
      window.backgroundManager.setFloorRefs(floorRef, shadowFloorRef);
      
      // 배경 설정 (BackgroundManager 사용)
      window.backgroundManager.setBackground(currentBackground || 'gradient');
      console.log('🌅 [TalkingHead] BackgroundManager 초기화 완료');
    } catch (error) {
      console.error('🌅 [TalkingHead] BackgroundManager 오류:', error);
      return;
    }

    // CameraManager 초기화 (렌더러 생성 후에 호출)
    const setupCamera = () => {
      const camera = cameraManagerRef.current.init(containerRef.current, renderer);
      cameraRef.current = camera;
      controlsRef.current = cameraManagerRef.current.getControls();
      
      // CameraManager를 window 객체에 등록 (ModelManager에서 접근하기 위함)
      if (typeof window !== 'undefined') {
        window.cameraManager = cameraManagerRef.current;
        console.log('🔗 [TalkingHead] CameraManager를 window 객체에 등록 완료');
      }
      
      // PreloadManager를 window 객체에 등록 (ModelManager에서 접근하기 위함)
      window.preloadManager = preloadManagerRef.current;
      console.log('🔗 [TalkingHead] PreloadManager를 window 객체에 등록 완료');
      
      // 🚀 PreloadManager 콜백 설정 (프리로딩 상태를 page.js에 전달)
      if (preloadManagerRef.current && (onPreloadStart || onPreloadComplete)) {
        preloadManagerRef.current.setCallbacks(
          () => {
            // 프리로딩 시작 콜백
            console.log('🚀 [TalkingHead] 프리로딩 시작됨');
            if (onPreloadStart) {
              onPreloadStart();
            }
          },
          (progress) => {
            // 프리로딩 진행률 콜백 (ModelManager에서 사용)
            console.log(`🚀 [TalkingHead] 프리로딩 진행률: ${progress.modelName} (${progress.current}/${progress.total})`);
          },
          (result) => {
            // 프리로딩 완료 콜백
            console.log(`🎉 [TalkingHead] 프리로딩 완료! ${result.totalPreloaded}개 모델:`, result.models);
            if (onPreloadComplete) {
              onPreloadComplete();
            }
          }
        );
      }
      
      // BlinkingManager에 새 카메라 참조 설정
      if (blinkingManagerRef.current) {
        blinkingManagerRef.current.setCameraRef(camera);
        console.log('📷 BlinkingManager에 카메라 참조 업데이트');
      }
      
      // 후처리 컴포저 생성 (RenderingManager 필수)
      const scene = sceneRef.current;
      let composer;
      
      try {
        composer = window.renderingManager.createPostProcessingComposer(renderer, scene, camera);
      rendererRef.current.composer = composer;
        // 🚀 강제 TAA 활성화 및 샘플 레벨 5 설정
        if (composer && composer.taaPass) {
          composer.taaPass.enabled = true;
          composer.taaPass.sampleLevel = 5;
          console.log('🕒 [TalkingHead] TAA 강제 ON, SampleLevel=5 적용');
        }
        console.log('✅ [TalkingHead] 후처리 컴포저 생성 완료');
      } catch (error) {
        console.error('❌ [TalkingHead] 후처리 컴포저 생성 실패:', error);
        return;
      }
      
      // RenderingManager에 TalkingHead 참조 등록 (직접 조작, 순환 참조 방지)
      window.renderingManager.setTalkingHeadRef({
          // 직접 composer 조작으로 순환 참조 방지
          setTAAEnabled: (enabled) => {
            if (composer && composer.taaPass) {
              composer.taaPass.enabled = enabled;
              console.log('🕒 [TalkingHead] TAA 직접 설정:', enabled);
            }
          },
          setTAASampleLevel: (level) => {
            if (composer && composer.taaPass) {
              composer.taaPass.sampleLevel = 5;
              console.log('🕒 [TalkingHead] TAA Sample Level 직접 설정:', level);
            }
          },
          setFXAAEnabled: (enabled) => {
            if (composer && composer.fxaaPass) {
              composer.fxaaPass.enabled = enabled;
              console.log('⚡ [TalkingHead] FXAA 직접 설정:', enabled);
            }
          },
          updatePostProcessingSettings: (settings) => {
            if (composer) {
              if (settings.taaEnabled !== undefined && composer.taaPass) {
                composer.taaPass.enabled = settings.taaEnabled;
              }
              if (settings.taaSampleLevel !== undefined && composer.taaPass) {
                composer.taaPass.sampleLevel = settings.taaSampleLevel;
              }
              if (settings.fxaaEnabled !== undefined && composer.fxaaPass) {
                composer.fxaaPass.enabled = settings.fxaaEnabled;
              }
              console.log('🎨 [TalkingHead] 후처리 설정 직접 적용:', settings);
            }
          },
          getPostProcessingStatus: () => {
            if (composer && composer.taaPass && composer.fxaaPass) {
              return {
                taaEnabled: composer.taaPass.enabled || false,
                taaSampleLevel: composer.taaPass.sampleLevel || 0,
                fxaaEnabled: composer.fxaaPass.enabled || false
              };
            }
            return { taaEnabled: false, taaSampleLevel: 0, fxaaEnabled: false };
          },
          // 렌더러 설정 제어 메서드 (직접 조작)
          setOutputColorSpace: (colorSpace) => {
            if (renderer) {
              renderer.outputColorSpace = colorSpace;
              console.log('🌈 [TalkingHead] 색상 공간 직접 설정:', colorSpace);
            }
          },
          setToneMapping: (toneMapping) => {
            if (renderer) {
              renderer.toneMapping = toneMapping;
              console.log('🎭 [TalkingHead] 톤 매핑 직접 설정:', toneMapping);
            }
          },
          setToneMappingExposure: (exposure) => {
            if (renderer) {
              renderer.toneMappingExposure = exposure;
              console.log('🌟 [TalkingHead] 톤 매핑 노출 직접 설정:', exposure);
            }
          }
      });
      console.log('🔗 [TalkingHead] RenderingManager에 후처리 제어 참조 등록 완료');
      
      console.log('📷 CameraManager 초기화 완료');
    };

    // RenderingManager 필수 체크
    if (typeof window === 'undefined' || !window.renderingManager) {
      console.error('❌ [TalkingHead] RenderingManager가 없습니다. 초기화를 확인하세요.');
      return;
    }

    // 렌더러 생성 (RenderingManager 필수) - WebGPU 테스트
    let renderer;
    try {
      renderer = await window.renderingManager.createRenderer(containerRef.current);
      rendererRef.current = renderer;
      console.log('✅ [TalkingHead] 렌더러 생성 완료');
    } catch (error) {
      console.error('❌ [TalkingHead] 렌더러 생성 실패:', error);
      return;
    }

    // LightingManager 필수 체크 및 조명 초기화
    if (!window.lightingManager) {
      console.error('❌ [TalkingHead] LightingManager가 없습니다. 초기화를 확인하세요.');
      return;
    }

    try {
      // 씬 설정
      window.lightingManager.setScene(sceneRef.current);
      
      // 조명 초기화 (설정이 있으면 사용, 없으면 기본값 사용)
      const settingsToUse = lightingSettings || window.lightingManager.getCurrentSettings();
      window.lightingManager.initializeLights(settingsToUse);
      
      // 조명 객체 참조 업데이트
      lightsRef.current = window.lightingManager.getLights();
      console.log('✅ [TalkingHead] 조명 초기화 완료');
    } catch (error) {
      console.error('❌ [TalkingHead] 조명 초기화 실패:', error);
      return;
    }
    
    // CameraManager를 통한 카메라 및 컨트롤 설정
    setupCamera();
    
    // ⭐ 모델 로드 전에 모든 매니저 설정을 미리 준비 (깜빡임 방지)
    console.log('🎨 [TalkingHead] 모델 로드 전 매니저 설정 준비 시작:', firstModelName);
    await prepareAllSettingsForModel(firstModelName);
    
    // 모든 설정이 준비된 상태에서 모델 로드 (ModelManager로 위임)
    console.log('🚀 [TalkingHead] 매니저 준비 완료, ModelManager로 첫 번째 모델 로드 위임:', firstModelName);
    if (typeof window !== 'undefined' && window.modelManager) {
      // ModelManager가 모든 설정을 처리하므로 단순 호출만
      await window.modelManager.loadFirstModel(firstModelName, sceneRef);
                } else {
      console.error('❌ [TalkingHead] ModelManager를 찾을 수 없습니다.');
      console.log('💡 [TalkingHead] app/page.js에서 ModelManager 초기화를 확인하세요.');
    }
    
    console.log('✅ [TalkingHead] 씬 + 첫 모델 통합 초기화 완료');
  };

  // setupLoadedModel은 ModelManager에서 콜백으로 호출 (중복 제거)

  // 모든 설정을 백그라운드에서 완전히 준비하는 함수 (첫 모델 로드 + 모델 교체용)
  const prepareAllSettingsForModel = async (modelName) => {
    console.log(`🔧 [TalkingHead] ${modelName} 모델을 위한 모든 설정 백그라운드 준비 시작...`);

    const preparedSettings = {
      rendering: null,
      material: null,
      animation: null
    };

    try {
      console.log('🔧 [TalkingHead] 순차적으로 모든 설정 완료까지 대기...');

      // 1. 렌더링 설정 즉시 적용
      if (window.renderingManager && rendererRef.current) {
        console.log('🖥️ [TalkingHead] 1단계: 렌더링 설정 즉시 적용 중...');
        const renderingSettings = await window.renderingManager.loadPresetForModel(modelName);
        
        // 렌더링 설정 즉시 적용
        window.renderingManager.applySettings(renderingSettings);
        preparedSettings.rendering = renderingSettings;
        console.log('✅ [TalkingHead] 렌더링 설정 즉시 적용 완료');
      }

      // 2. 메터리얼 설정 즉시 적용
      if (window.materialManager) {
        console.log('🎨 [TalkingHead] 2단계: 메터리얼 설정 즉시 적용 중...');
        const materialSettings = await window.materialManager.loadPresetForModel?.(modelName);
        
        // 메터리얼 설정 즉시 적용
        if (window.materialManager.applySettings) {
          window.materialManager.applySettings(materialSettings);
        }
        preparedSettings.material = materialSettings;
        console.log('✅ [TalkingHead] 메터리얼 설정 즉시 적용 완료');
      }

      // 3. 조명 설정 즉시 적용
      if (window.lightingManager) {
        console.log('💡 [TalkingHead] 3단계: 조명 설정 즉시 적용 중...');
        
        // JSON 기반 모델별 조명 설정 로드
        const lightingSettings = await window.lightingManager.loadPresetForModel?.(modelName);
        
        // 조명 설정은 이미 loadPresetForModel에서 자동 적용됨
        preparedSettings.lighting = lightingSettings;
        console.log('✅ [TalkingHead] 조명 설정 즉시 적용 완료');
      }

      // 4. FBX 애니메이션 설정 준비
      if (window.animationManager) {
        console.log('🎭 [TalkingHead] 4단계: FBX 애니메이션 설정 준비 중...');
        const animationSettings = await window.animationManager.prepareAnimationForModel?.(modelName);
        preparedSettings.animation = animationSettings;
        console.log('✅ [TalkingHead] FBX 애니메이션 설정 준비 완료');
      }

      console.log(`🎉 [TalkingHead] ${modelName} 모델을 위한 모든 설정 즉시 적용 완료!`, preparedSettings);
      return preparedSettings;

    } catch (error) {
      console.error('❌ [TalkingHead] 설정 즉시 적용 실패:', error);
      return preparedSettings; // 부분 성공이라도 반환
    }
  };

  // ========================================
  // ===== MODEL LOADING =====
  // ========================================
  
  // 통합 모델 로드 함수 (ModelManager로 단순 위임)
  const loadModel = async (modelName) => {
    console.log('🎯 [TalkingHead] loadModel 호출 -> ModelManager 위임:', modelName);
    
    // 🔒 중복 호출 방지
    if (loadModel.isLoading) {
      console.log('🚫 [TalkingHead] 이미 모델 로드 중, 중복 호출 차단:', modelName);
      return;
    }
    
    // 🔒 빠른 연속 호출 방지 (최소 200ms 간격)
    const now = Date.now();
    if (loadModel.lastCallTime && (now - loadModel.lastCallTime) < 200) {
      console.log('🚫 [TalkingHead] 너무 빠른 연속 호출, 차단:', modelName, `(${now - loadModel.lastCallTime}ms)`);
      return;
    }
    
    // 🚀 모델 변경 시 캐시 정리 (THREE.Cache.enabled = true로 인한 문제 방지)
    if (currentModel !== modelName) {
      console.log(`🚀 [TalkingHead] 모델 변경 감지: ${currentModel} → ${modelName}`);
      manageThreeJSCache('clearModel');
    }
    
    loadModel.isLoading = true;
    loadModel.lastCallTime = now;
    
    try {
      if (typeof window === 'undefined' || !window.modelManager) {
        console.error('❌ [TalkingHead] ModelManager를 찾을 수 없습니다.');
        return;
      }

      // ModelManager가 모든 것을 처리 - 단순 위임
      await window.modelManager.loadModel(modelName, sceneRef);
      
      // 🚀 모델 로드 완료 후 캐시 상태 확인
      setTimeout(() => {
        manageThreeJSCache('check');
      }, 1000);
      
    } finally {
      // 로딩 상태 해제
      loadModel.isLoading = false;
    }
  };
  
  // 🔒 loadModel 함수에 정적 속성 추가
  loadModel.isLoading = false;
  loadModel.lastCallTime = null;

  // 5초 주기 FPS 로그
  const lastFpsLogTimeRef = useRef(0);

  // ========================================
  // ===== ANIMATION LOOP =====
  // ========================================
  
  // 애니메이션 루프
  const animate = () => {
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    // FPS 측정
    const now = performance.now();
    fpsRef.current.frames++;
    if (now - fpsRef.current.lastTime >= 1000) {
      fpsRef.current.fps = Math.round((fpsRef.current.frames * 1000) / (now - fpsRef.current.lastTime));
      fpsRef.current.frames = 0;
      fpsRef.current.lastTime = now;
    }
    // 5초에 한 번 FPS 로그
    if (now - (lastFpsLogTimeRef.current || 0) >= 5000) {
      console.log(`🎯 [FPS] ${fpsRef.current.fps}`);
      lastFpsLogTimeRef.current = now;
    }
    
    
    if (mixerRef.current) {
      mixerRef.current.update(clockRef.current.getDelta());
    }
    
    // CameraManager 업데이트
    if (cameraManagerRef.current) {
      cameraManagerRef.current.update();
    }
    
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      // Release 모드에서 캐릭터 근접 시 렌더링 중단
      if (cameraManagerRef.current && cameraManagerRef.current.shouldStopRendering()) {
        // 렌더링 중단 - 화면을 검은색으로
        rendererRef.current.setClearColor(0x000000, 1);
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        return;
      }
      
      
      // 후처리 안티앨리어싱 렌더링 (composer 사용)
      if (rendererRef.current.composer) {
        rendererRef.current.composer.render();
      } else {
        // 폴백: 기본 렌더링
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
    }
  };

  // ========================================
  // ===== USER INTERACTION =====
  // ========================================
  
  // 스켈레톤 표시 토글
  const toggleSkeleton = () => {
    const newSkeletonVisible = !isSkeletonVisible;
    console.log(`[TalkingHead] 스켈레톤 토글: ${isSkeletonVisible} → ${newSkeletonVisible}`);
    
    if (skeletonHelperRef.current) {
      skeletonHelperRef.current.visible = newSkeletonVisible;
      console.log(`[TalkingHead] 스켈레톤 헬퍼: ${newSkeletonVisible ? 'ON' : 'OFF'}`);
    }
  };

  // 배경 설정 함수
  const setSceneBackground = (backgroundType = 'gradient') => {
    if (typeof window !== 'undefined' && window.backgroundManager) {
      window.backgroundManager.setBackground(backgroundType);
    } else {
      console.warn('[TalkingHead] BackgroundManager를 찾을 수 없습니다.');
    }
  };

  // 손 궤적 토글
  const toggleHandTrail = () => {
    console.log('[TalkingHead] 손 궤적 토글 시도');
    
    if (handTrailManagerRef.current) {
      const newState = handTrailManagerRef.current.toggle();
      console.log('[TalkingHead] 손 궤적 새 상태:', newState);
      
      // 외부 콜백으로 상태 변경 알림
      if (onEffectToggle) {
        onEffectToggle('handTrail');
      }
    } else {
      console.log('[TalkingHead] 손 궤적 매니저가 없습니다');
    }
  };

  // 모델 상태 확인 함수
  const checkModelStatus = () => {
    console.log('[TalkingHead] 모델 상태 확인:', {
      modelRef: !!modelRef.current,
      isModelLoaded,
      currentModel
    });
    
    if (modelRef.current) {
      let meshCount = 0;
      let materialCount = 0;
      modelRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          meshCount++;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materialCount += materials.length;
        }
      });
      console.log(`[TalkingHead] 총 메시: ${meshCount}개, 총 머티리얼: ${materialCount}개`);
    }
  };

  // ========================================
  // ===== IMPERATIVE HANDLE =====
  // ========================================
  
  // 외부에서 사용할 수 있는 함수들을 노출
  useImperativeHandle(ref, () => ({
    // 모델 관련
    loadModel,
    getCurrentModel: () => currentModel,
    isModelLoaded: () => isModelLoaded,
    
    // 스켈레톤 관련
    toggleSkeleton,
    isSkeletonVisible: () => isSkeletonVisible,
    
    // 배경 관련
    setSceneBackground,
    
    // 렌더링 관련
    setPixelRatio: (ratio) => {
      if (rendererRef.current) {
        const actualRatio = Math.min(ratio, 4);
        rendererRef.current.setPixelRatio(actualRatio);
        console.log('[TalkingHead] 픽셀 비율 설정:', actualRatio);
      }
    },
    setShadowMapSize: (size) => {
      if (rendererRef.current && rendererRef.current.shadowMap) {
        console.log('[TalkingHead] 그림자 맵 크기 설정 요청:', size);
        console.log('[TalkingHead] Three.js shadowMap은 크기를 직접 설정할 수 없습니다');
      }
    },
    setRenderingMode: (mode) => {
      console.log('[TalkingHead] 렌더링 모드 설정:', mode);
    },
    getRenderingSettings: () => renderingSettings,
    
    // 머티리얼 관련
    getModel: () => modelRef.current,
    
    // 디버깅 관련
    checkModelStatus,
    
    // 캐시 관리 관련
    manageCache: manageThreeJSCache,
    clearCache: () => manageThreeJSCache('clear'),
    clearModelCache: () => manageThreeJSCache('clearModel'),
    checkCache: () => manageThreeJSCache('check'),
    
    // 프리로딩 관련
    startPreloading: () => preloadManagerRef.current?.startPreloading(),
    stopPreloading: () => preloadManagerRef.current?.stopPreloading(),
    getPreloadStatus: () => preloadManagerRef.current?.getPreloadStatus(),
    isModelPreloaded: (modelName) => preloadManagerRef.current?.isModelPreloaded(modelName),
    
    // 효과 관련
    toggleHandTrail,
    toggleParticle: () => toggleParticle(),
    getEffectStates: () => ({
      handTrail: handTrailManagerRef.current?.getStatus()?.isEnabled || false,
      particle: particleTrailManagerRef.current?.getStatus()?.isEnabled || false,
      floor: true // 바닥은 항상 표시
    }),
    
    // 조명 관련 - LightingManager에서 제공하는 조명 반환
    getLights: () => {
      if (typeof window !== 'undefined' && window.lightingManager) {
        return window.lightingManager.getLights();
      }
      return lightsRef.current;
    },
    
    // 조명 설정 강제 적용
    setLightingSettings: (settings) => {
      console.log('[TalkingHead] 외부에서 조명 설정 강제 적용:', settings);
      if (settings && typeof window !== 'undefined' && window.lightingManager) {
        try {
          // 새로운 조명 시스템에서는 applySettings 대신 직접 설정 적용
          window.lightingManager.currentSettings = { ...window.lightingManager.currentSettings, ...settings };
          window.lightingManager.applyCurrentSettings();
          lightsRef.current = window.lightingManager.getLights();
          console.log('[TalkingHead] 조명 설정 강제 적용 완료');
        } catch (error) {
          console.error('[TalkingHead] 조명 설정 강제 적용 실패:', error);
        }
      }
    },
    
    // 표정 애니메이션 관련
    playFacialAnimation,
    
    // 눈동자 추적 관련
    toggleEyeTracking: () => blinkingManagerRef.current?.toggleEyeTracking(),
    isEyeTrackingEnabled: () => blinkingManagerRef.current?.isEyeTrackingEnabled() || false,
    
    // 카메라 관련
    getCameraManager: () => cameraManagerRef.current,
    getCamera: () => cameraRef.current,
    getCameraSettings: () => cameraManagerRef.current?.getSettings(),
    updateCameraSettings: (settings) => cameraManagerRef.current?.updateSettings(settings),
    applyCameraPreset: (presetName) => cameraManagerRef.current?.applyPreset(presetName),
    resetCamera: () => cameraManagerRef.current?.forceReset(),
    
    // 후처리 안티앨리어싱 제어
    setTAAEnabled: (enabled) => {
      if (rendererRef.current?.composer && rendererRef.current.composer.taaPass) {
        rendererRef.current.composer.taaPass.enabled = enabled;
        console.log('[TalkingHead] TAA 상태 설정:', enabled);
      }
    },
    
    setTAASampleLevel: (level) => {
      if (rendererRef.current?.composer && rendererRef.current.composer.taaPass) {
        rendererRef.current.composer.taaPass.sampleLevel = level;
        console.log('[TalkingHead] TAA Sample Level 설정:', level);
      }
    },
    
    setFXAAEnabled: (enabled) => {
      if (rendererRef.current?.composer && rendererRef.current.composer.fxaaPass) {
        rendererRef.current.composer.fxaaPass.enabled = enabled;
        console.log('[TalkingHead] FXAA 상태 설정:', enabled);
      }
    },
    
    // 안티앨리어싱 설정 일괄 업데이트
    updatePostProcessingSettings: (settings) => {
      if (rendererRef.current?.composer) {
        const composer = rendererRef.current.composer;
        if (settings.taaEnabled !== undefined && composer.taaPass) {
          composer.taaPass.enabled = settings.taaEnabled;
        }
        if (settings.taaSampleLevel !== undefined && composer.taaPass) {
          composer.taaPass.sampleLevel = settings.taaSampleLevel;
        }
        if (settings.fxaaEnabled !== undefined && composer.fxaaPass) {
          composer.fxaaPass.enabled = settings.fxaaEnabled;
        }
        console.log('[TalkingHead] 후처리 설정 적용:', settings);
      }
    },
    
    // 렌더러 고급 설정 제어
    setOutputColorSpace: (colorSpace) => {
      if (rendererRef.current) {
        rendererRef.current.outputColorSpace = colorSpace;
        console.log('[TalkingHead] 색상 공간 설정:', colorSpace);
      }
    },
    
    setToneMapping: (toneMapping) => {
      if (rendererRef.current) {
        rendererRef.current.toneMapping = toneMapping;
        console.log('[TalkingHead] 톤 매핑 설정:', toneMapping);
      }
    },
    
    setToneMappingExposure: (exposure) => {
      if (rendererRef.current) {
        rendererRef.current.toneMappingExposure = exposure;
        console.log('[TalkingHead] 톤 매핑 노출 설정:', exposure);
      }
    },
    
    getPostProcessingStatus: () => {
      if (rendererRef.current?.composer && rendererRef.current.composer.taaPass && rendererRef.current.composer.fxaaPass) {
        return {
          taaEnabled: rendererRef.current.composer.taaPass.enabled || false,
          taaSampleLevel: rendererRef.current.composer.taaPass.sampleLevel || 0,
          fxaaEnabled: rendererRef.current.composer.fxaaPass.enabled || false
        };
      }
      return { taaEnabled: false, taaSampleLevel: 0, fxaaEnabled: false };
    },
    
    // 성능 모니터링 제어
    startPerformanceMonitoring: () => {
      performanceMonitorRef.current.startMonitoring();
      console.log('[TalkingHead] 성능 모니터링 시작됨');
    },
    
    stopPerformanceMonitoring: () => {
      performanceMonitorRef.current.stopMonitoring();
      console.log('[TalkingHead] 성능 모니터링 중단됨');
    },
    
    setPerformanceBaseline: () => {
      performanceMonitorRef.current.setBaseline();
      console.log('[TalkingHead] 성능 기준점 설정됨');
    },
    
    getPerformanceData: () => {
      return performanceMonitorRef.current.data;
    }
  }), [
    currentModel, 
    isModelLoaded, 
    isSkeletonVisible,
    renderingSettings,
    lightingSettings,
    effectStates
  ]);

  // 파티클 토글
  const toggleParticle = () => {
    console.log('[TalkingHead] 파티클 토글 시도');
    
    if (particleTrailManagerRef.current) {
      const newState = particleTrailManagerRef.current.toggle();
      console.log('[TalkingHead] 파티클 새 상태:', newState);
      
      // 파티클이 활성화되면 손 궤적도 자동으로 활성화
      if (newState && !effectStates?.handTrail) {
        console.log('[TalkingHead] 파티클 활성화로 인한 손 궤적 자동 활성화');
        if (handTrailManagerRef.current && onEffectToggle) {
          handTrailManagerRef.current.toggle();
          onEffectToggle('handTrail');
        }
      }
      
      // 외부 콜백으로 상태 변경 알림
      if (onEffectToggle) {
        onEffectToggle('particle');
      }
    } else {
      console.log('[TalkingHead] 파티클 매니저가 없습니다');
    }
  };

  // 표정 애니메이션 재생
  const playFacialAnimation = (animationName) => {
    if (morphTargetsRef.current.head) {
      facialAnimationManagerRef.current.playFacialAnimation(
        animationName, 
        morphTargetsRef, 
        blendshapeValuesRef
      );
    }
  };


  // ========================================
  // ===== BLENDSHAPE FUNCTIONS =====
  // ========================================
  
  // 블렌드셰이프 초기화 처리
  const resetBlendshapes = () => {
    console.log('[TalkingHead] 블렌드셰이프 초기화 (새로운 대화 시작)');
      
    // API 애니메이션 종료로 간주하여 눈 깜빡임 재개
    if (blinkingManagerRef.current) {
      blinkingManagerRef.current.control('start');
    }
      
    // neutral 표정으로 복원 (모델이 로드된 경우에만)
    if (facialAnimationManagerRef.current && morphTargetsRef.current?.head) {
      console.log('[TalkingHead] 새로운 대화 시작, neutral 표정으로 복원');
      setTimeout(() => {
        if (facialAnimationManagerRef.current.defaultFacialState) {
          facialAnimationManagerRef.current.resetToDefaultFacialState(morphTargetsRef, blendshapeValuesRef);
        } else {
          facialAnimationManagerRef.current.playFacialAnimation('neutral', morphTargetsRef, blendshapeValuesRef);
        }
      }, ANIMATION_CONSTANTS.BLINK_DELAY);
    }
      
    // 모든 블렌드셰이프를 0으로 초기화 (EYE TRACKING 제외)
    if (modelRef.current && morphTargetsRef.current.head) {
      const { head } = morphTargetsRef.current;
      if (head.mesh.morphTargetDictionary) {
        Object.keys(head.mesh.morphTargetDictionary).forEach(morphName => {
          // EYE TRACKING 관련 블렌드쉐입은 절대 건드리지 않음
          if (isEyeTrackingBlendshape(morphName)) {
            return; // 건너뛰기
          }
          
          const morphIndex = head.mesh.morphTargetDictionary[morphName];
          applyBlendshapeValue(morphTargetsRef.current, morphIndex, 0);
        });
        console.log('[TalkingHead] 전체 메시 블렌드셰이프 초기화 완료 (EYE TRACKING 제외)');
      }
    }
  };

  // EYE TRACKING 관련 블렌드쉐입인지 확인하는 함수
  const isEyeTrackingBlendshape = (blendshapeName) => {
    const lowerName = blendshapeName.toLowerCase();
    
    // 패턴 매칭으로 확인
    const isEyeTracking = EYE_TRACKING_PATTERNS.some(pattern => 
      blendshapeName.includes(pattern) || 
      lowerName.includes(pattern.toLowerCase())
    );
    
    // 추가 안전장치: 'eye' + 'look' 조합도 확인
    if (!isEyeTracking && lowerName.includes('eye') && lowerName.includes('look')) {
      return true;
    }
    
    // 추가 안전장치: 'eye' + 'gaze' 조합도 확인
    if (!isEyeTracking && lowerName.includes('eye') && lowerName.includes('gaze')) {
      return true;
    }
    
    // 추가 안전장치: 'eye' + 'tracking' 조합도 확인
    if (!isEyeTracking && lowerName.includes('eye') && lowerName.includes('tracking')) {
      return true;
    }
    
    return isEyeTracking;
  };

  // 부드러운 전환을 위한 보간 함수 (더 부드럽게)
  const smoothBlendshapeValue = (blendshapeName, targetValue, smoothingFactor = 0.08) => {
    const currentValue = currentValuesRef.current.get(blendshapeName) || 0;
    
    // 목표 값과 현재 값의 차이가 너무 작으면 스무딩 적용하지 않음
    const difference = Math.abs(targetValue - currentValue);
    if (difference < 0.01) {
      return targetValue;
    }
    
    // 부드러운 보간 적용
    const smoothedValue = currentValue + (targetValue - currentValue) * smoothingFactor;
    
    // 현재 값과 목표 값 업데이트
    currentValuesRef.current.set(blendshapeName, smoothedValue);
    targetValuesRef.current.set(blendshapeName, targetValue);
    
    return smoothedValue;
  };

  // 최적화된 입모양 제어 함수 (viseme 적용 전/후 blendshape 값 로그 출력)
  const optimizeMouthShape = (blendshapeName, value, currentModel, realTimeVisemeData = null) => {
    const ENABLE_OPTIMIZATION = true;

    // jawopen 블렌드쉐이프만 로그 출력 (스팸 방지)
    const isJawOpen = blendshapeName && blendshapeName.toLowerCase().includes('jawopen');
    if (isJawOpen) {
      console.log(`[optimizeMouthShape] 적용 전: blendshape='${blendshapeName}', value=${value}, model=${currentModel}`);
    }

    if (!ENABLE_OPTIMIZATION) {
      // 최적화 비활성화 시 그대로 반환
      return value;
    }

    let optimizedValue = value;
    let weight = 1.0;

    // 모델별 가중치 설정
    if (currentModel === 'brunette') {
      weight = 1.0;
    } else if (currentModel === 'woman'||currentModel === 'man') {
      // audioBase64를 AudioManager의 extractViseme 메서드를 활용하여 viseme(음소) 추출
      // viseme에 따라 해당 블렌드셰입에만 가중치를 적용

      // viseme와 blendshape 매핑 - 주변 표정들도 함께 움직이도록 확장
      const visemeBlendshapeMap = {
        'aa': [
          'jawopen', 'mouthstretch', 'mouthlowerdown', // 주요 블렌드쉐이프
          'mouthrolllower', 'mouthdimple', 'cheekpuff' // 주변 표정
        ], // '아'
        'E': [
          'mouthstretch', 'mouthsmile', 'mouthleft', 'mouthright', // 주요 블렌드쉐이프
          'mouthupperup', 'mouthdimple', 'mouthrollupper' // 주변 표정
        ], // '에'
        'I': [
          'mouthsmile', 'mouthupperup', // 주요 블렌드쉐이프
          'mouthdimple', 'mouthstretch', 'cheeksquint' // 주변 표정
        ], // '이'
        'O': [
          'mouthfunnel', 'mouthpucker', 'jawforward', // 주요 블렌드쉐이프
          'cheekpuff', 'mouthrollupper', 'mouthrolllower' // 주변 표정
        ], // '오'
        'U': [
          'mouthpucker', 'mouthfunnel', // 주요 블렌드쉐이프
          'cheekpuff', 'mouthrollupper', 'mouthrolllower' // 주변 표정
        ], // '우'
        'SS': [
          'mouthshrugupper', 'mouthshruglower', // 주요 블렌드쉐이프
          'mouthstretch', 'mouthrollupper' // 주변 표정
        ], // 치찰음 계열
        'sil': [] // 무음
      };

      // viseme별 가중치 - 주변 표정들도 함께 움직이도록 확장
      const visemeWeights = {
        'aa': {
          primary: 1.5,
          secondary: {
            'jawopen': 1.3,
            'mouthstretch': 1.2,
            'mouthlowerdown': 1.1,
            'mouthrolllower': 0.8,
            'mouthdimple': 0.6,
            'cheekpuff': 0.4
          }
        },
        'E': {
          primary: 1.0,
          secondary: {
            'mouthstretch': 1.2,
            'mouthsmile': 1.1,
            'mouthleft': 0.9,
            'mouthright': 0.9,
            'mouthupperup': 0.8,
            'mouthdimple': 0.7,
            'mouthrollupper': 0.6
          }
        },
        'I': {
          primary: 1.5,
          secondary: {
            'mouthsmile': 1.3,
            'mouthupperup': 1.2,
            'mouthdimple': 0.9,
            'mouthstretch': 0.8,
            'cheeksquint': 0.6
          }
        },
        'O': {
          primary: 1.5,
          secondary: {
            'mouthfunnel': 1.3,
            'mouthpucker': 1.2,
            'jawforward': 1.1,
            'cheekpuff': 0.8,
            'mouthrollupper': 0.7,
            'mouthrolllower': 0.6
          }
        },
        'U': {
          primary: 1.5,
          secondary: {
            'mouthpucker': 1.3,
            'mouthfunnel': 1.2,
            'cheekpuff': 0.8,
            'mouthrollupper': 0.7,
            'mouthrolllower': 0.6
          }
        },
        'SS': {
          primary: 1.0,
          secondary: {
            'mouthshrugupper': 1.2,
            'mouthshruglower': 1.1,
            'mouthstretch': 0.8,
            'mouthrollupper': 0.6
          }
        },
        'sil': {
          primary: 1.0,
          secondary: {}
        }
      };

      // 기타 블렌드셰입 기본 가중치
      const defaultBlendshapeWeights = {
        'mouthdimple': 1.0,
        'mouthpress': 1.0,
        'mouthshrugupper': 1.0,
        'mouthshruglower': 1.0,
        'mouthrollupper': 1.0,
        'mouthrolllower': 1.0,
        'mouthfrown': 1.0,
        'mouthclose': 1.0,
        'jawleft': 1.0,
        'jawright': 1.0
      };

      // 실시간 viseme 데이터 우선 사용, 없으면 audioBase64에서 추출
      let currentViseme = 'aa'; // 기본값
      let visemeIntensity = 0;
      
      if (realTimeVisemeData && realTimeVisemeData.viseme) {
        // 실시간 viseme 데이터 사용
        currentViseme = realTimeVisemeData.viseme;
        visemeIntensity = 0.5; // 실시간 데이터는 기본 강도 사용
        
        if (isJawOpen) {
          console.log(`🎤 [RealTime Viseme] 실시간 데이터 사용:`, {
            viseme: currentViseme,
            blendshape: blendshapeName
          });
        }
      } else {
        // 기존 방식: AudioManager를 통해 audioBase64에서 viseme 추출
        try {
          if (
            audioBase64 &&
            audioManagerRef &&
            audioManagerRef.current &&
            typeof audioManagerRef.current.extractViseme === 'function'
          ) {
            // extractViseme는 { viseme, intensity } 반환
            const visemeResult = audioManagerRef.current.extractViseme({ volume: audioBase64 });
            if (visemeResult && visemeResult.viseme) {
              currentViseme = visemeResult.viseme;
              // intensity가 숫자인지 확인하고 안전하게 설정
              const intensity = visemeResult.intensity;
              visemeIntensity = typeof intensity === 'number' && !isNaN(intensity) ? intensity : 0;
              
              // viseme 처리 과정 로깅 (스팸 방지)
              if (typeof window !== 'undefined' && 
                  window.__DEBUG_VISEME_PROCESS__ && 
                  window.__DEBUG_VISEME_PROCESS__.shouldLog()) {
                console.log(`🎤 [Viseme] 처리 결과:`, {
                  viseme: currentViseme,
                  intensity: typeof visemeIntensity === 'number' ? visemeIntensity.toFixed(3) : visemeIntensity,
                  audioLength: audioBase64.length,
                  visemeResult: visemeResult  // 전체 결과도 로깅
                });
              }
            }
          } else if (window.__DEBUG_VISEME__) {
            currentViseme = window.__DEBUG_VISEME__;
          }
        } catch (e) {
          currentViseme = 'aa';
          visemeIntensity = 0; // 에러 발생 시 기본값으로 설정
          console.warn('🎤 [Viseme] 처리 중 오류:', e);
        }
      }

      let foundWeight = 1.0;
      if (blendshapeName) {
        const lowerBlendshape = blendshapeName.toLowerCase();

        // jawopen 블렌드쉐이프에 대한 상세 디버깅
        if (isJawOpen) {
          console.log(`🔍 [JawOpen Debug] 가중치 계산 과정:`, {
            blendshapeName,
            currentViseme,
            visemeBlendshapeMap: visemeBlendshapeMap[currentViseme],
            visemeWeights: visemeWeights[currentViseme],
            audioBase64Exists: !!audioBase64,
            audioBase64Length: audioBase64?.length
          });
        }

        // viseme에 따른 가중치 적용 - 새로운 구조 지원
        if (visemeBlendshapeMap[currentViseme]) {
          const visemeBlendshapes = visemeBlendshapeMap[currentViseme];
          const isVisemeBlendshape = visemeBlendshapes.some(name => 
            lowerBlendshape.includes(name.toLowerCase())
          );
          
          if (isVisemeBlendshape) {
            // 새로운 가중치 구조 확인
            if (typeof visemeWeights[currentViseme] === 'object' && visemeWeights[currentViseme].primary) {
              // 새로운 구조: primary + secondary
              const visemeWeight = visemeWeights[currentViseme];
              
              // 주요 블렌드쉐이프인지 확인 (앞 3개)
              const isPrimary = visemeBlendshapes.slice(0, 3).some(name => 
                lowerBlendshape.includes(name.toLowerCase())
              );
              
              if (isPrimary) {
                foundWeight = visemeWeight.primary;
              } else {
                // secondary 블렌드쉐이프인지 확인
                const secondaryKey = Object.keys(visemeWeight.secondary).find(key => 
                  lowerBlendshape.includes(key.toLowerCase())
                );
                if (secondaryKey) {
                  foundWeight = visemeWeight.secondary[secondaryKey];
                } else {
                  foundWeight = visemeWeight.primary * 0.8; // 기본 secondary 가중치
                }
              }
            } else {
              // 기존 구조: 단순 숫자
              foundWeight = visemeWeights[currentViseme] || 1.0;
            }
          }
        }

        // 1. 현재 viseme에 해당하는 블렌드셰입이면, 해당 viseme 가중치 적용 (새로운 시스템에서 이미 처리됨)
        // 새로운 가중치 시스템이 위에서 처리하므로 이 부분은 제거
        // 기존 로직은 새로운 시스템과 중복되므로 제거
        
        // 새로운 가중치 시스템 디버깅 로그
        if (isJawOpen && foundWeight !== 1.0) {
          console.log(`✅ [JawOpen] 새로운 가중치 시스템 적용:`, {
            viseme: currentViseme,
            weight: foundWeight,
            originalValue: value,
            calculatedValue: value * foundWeight,
            blendshapeName: blendshapeName
          });
        }

        // 2. viseme 매칭이 없으면 기타 블렌드셰입 기본 가중치 적용
        if (foundWeight === 1.0) {
          for (const key in defaultBlendshapeWeights) {
            if (lowerBlendshape.includes(key)) {
              foundWeight = defaultBlendshapeWeights[key];
              break;
            }
          }
        }
      }
      weight = foundWeight;
    }

    // 최종 가중치 적용 및 범위 제한
    optimizedValue = Math.min(optimizedValue * weight, 1.0);

    // 부드러운 전환 적용 (입 관련 블렌드셰이프에만)
    const isMouthRelated = blendshapeName.toLowerCase().includes('mouth') || 
                           blendshapeName.toLowerCase().includes('jaw') ||
                           blendshapeName.toLowerCase().includes('lip') ||
                           blendshapeName.toLowerCase().includes('cheek') ||
                           blendshapeName.toLowerCase().includes('viseme') ||
                           blendshapeName.toLowerCase().includes('tongue');
    
    if (isMouthRelated) {
      // 입 관련 블렌드셰이프는 부드러운 전환 적용
      optimizedValue = smoothBlendshapeValue(blendshapeName, optimizedValue, 0.2); // 더 부드럽게
    } else {
      // 기타 블렌드셰이프는 즉시 적용
      optimizedValue = smoothBlendshapeValue(blendshapeName, optimizedValue, 0.25);
    }

    // jawopen 블렌드쉐이프만 로그 출력 (스팸 방지)
    if (isJawOpen) {
      console.log(`[optimizeMouthShape] 적용 후: blendshape='${blendshapeName}', value=${optimizedValue}, model=${currentModel}`);
    }

    return optimizedValue;
  };

  // Three.js 캐시 관리 함수
  const manageThreeJSCache = (action = 'check') => {
    if (!THREE.Cache.enabled) {
      console.log('🚀 [TalkingHead] Three.js 캐시가 비활성화됨');
      return;
    }

    try {
      const cacheKeys = Object.keys(THREE.Cache.files);
      
      switch (action) {
        case 'check':
          console.log(`🚀 [TalkingHead] 캐시 상태: ${cacheKeys.length}개 리소스`);
          break;
          
        case 'clear':
          const clearedCount = cacheKeys.length;
          Object.keys(THREE.Cache.files).forEach(key => {
            delete THREE.Cache.files[key];
          });
          console.log(`🧹 [TalkingHead] 캐시 정리 완료: ${clearedCount}개 리소스 제거`);
          break;
          
        case 'clearModel':
          const modelCacheKeys = cacheKeys.filter(key => 
            key.includes(currentModel) || key.includes('model') || key.includes('texture')
          );
          modelCacheKeys.forEach(key => {
            delete THREE.Cache.files[key];
          });
          console.log(`🧹 [TalkingHead] 모델 캐시 정리 완료: ${modelCacheKeys.length}개 리소스 제거`);
          break;
          
        default:
          console.log('🚀 [TalkingHead] 알 수 없는 캐시 관리 액션:', action);
      }
    } catch (error) {
      console.warn('🚀 [TalkingHead] 캐시 관리 중 오류:', error);
    }
  };

  // 실시간 오디오 데이터로부터 viseme 결정 (개선된 버전)
  const determineVisemeFromRealTimeData = (realTimeData) => {
    const { energy, frequency, spectralCentroid, energyVariance } = realTimeData;
    const { low, mid, high, ultraHigh } = frequency;
    
    // 에너지가 너무 낮으면 무음
    if (energy < 0.03) {
      return 'sil';
    }
    
    // 주파수 대역별 분석으로 정교한 viseme 결정
    if (low > 0.4 && low > mid && low > high) {
      // 모음 (저주파 강함) - 입을 크게 벌림
      if (low > 0.7) {
        return 'aa';  // 아 소리 (가장 큰 입)
      } else if (low > 0.5) {
        return 'O';   // 오 소리 (큰 입)
      } else {
        return 'E';   // 에 소리 (중간 입)
      }
    } else if (mid > 0.4 && mid > low && mid > high) {
      // 자음 (중주파 강함) - 입을 중간으로
      if (mid > 0.6) {
        return 'E';   // 에 소리
      } else {
        return 'SS';  // 스, 즈 소리
      }
    } else if (high > 0.4 && high > low && high > mid) {
      // 치찰음 (고주파 강함) - 입을 작게
      if (ultraHigh > 0.5) {
        return 'SS';  // 강한 치찰음 (시, 치)
      } else {
        return 'SS';  // 일반 치찰음 (스, 즈)
      }
    } else if (energy > 0.3) {
      // 균형잡힌 에너지 - 스펙트럼 특성으로 결정
      if (spectralCentroid < 0.3) {
        // 저주파 중심 - 모음
        return low > mid ? 'aa' : 'O';
      } else if (spectralCentroid < 0.6) {
        // 중주파 중심 - 자음
        return mid > high ? 'E' : 'SS';
      } else {
        // 고주파 중심 - 치찰음
        return 'SS';
      }
    } else if (energyVariance > 0.2) {
      // 에너지 변화가 큰 경우 - 활발한 발음
      if (low > 0.3) {
        return 'aa';
      } else if (mid > 0.3) {
        return 'E';
      } else {
        return 'SS';
      }
    } else {
      // 명확하지 않은 경우 - 에너지 기반으로 결정
      if (energy > 0.2) {
        return low > mid ? 'E' : 'SS';
      } else {
        return 'sil';
      }
    }
  };

  // 블렌드셰이프 애니메이션 실행
  const executeBlendshapeAnimation = () => {
    console.log('[TalkingHead] 블렌드셰이프 애니메이션 시작:', {
      readyToPlay,
      audioBase64Length: audioBase64?.length,
      blendshapeFramesLength: blendshapeFrames.length,
      morphTargetNamesLength: morphTargetNames.length,
      modelName: currentModel,
      amplificationEnabled: currentModel === 'man' || currentModel === 'woman' ? '입만 1.3x' : 'none'
    });

    // audioBase64 상태 상세 로깅
    if (audioBase64) {
      console.log('🔊 [AudioBase64] 상태 확인:', {
        exists: true,
        length: audioBase64.length,
        type: typeof audioBase64,
        preview: audioBase64.substring(0, 50) + '...'
      });
    } else {
      console.warn('⚠️ [AudioBase64] audioBase64가 없습니다!');
    }

    // 오디오 재생 상태를 부모에게 알림
    if (onAudioStateChange) {
      onAudioStateChange(true);
    }

    // API 블렌드셰이프 애니메이션 시작 시 눈 깜빡임 일시정지
    if (blinkingManagerRef.current) {
      blinkingManagerRef.current.control('stop');
    }
    
    let stopped = false;
    const { head } = morphTargetsRef.current;
    let startTime = null;
    
    // 블렌드셰이프 부드러운 전환을 위한 초기 상태 설정
    morphTargetNames.forEach((morphName) => {
      const morphIndex = head.mesh.morphTargetDictionary[morphName];
      if (morphIndex !== undefined) {
        const currentValue = head.mesh.morphTargetInfluences[morphIndex] || 0;
        currentValuesRef.current.set(morphName, currentValue);
        targetValuesRef.current.set(morphName, currentValue);
      }
    });
    
    // 블렌드셰이프 애니메이션 루프
    const animateBlendshape = (now) => {
      if (stopped) return;
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const frame = Math.floor(elapsed / ANIMATION_CONSTANTS.FRAME_DURATION);
      
      // 매 프레임마다 실시간 오디오 분석 수행
      let realTimeViseme = null;
      if (audioManagerRef.current && audioManagerRef.current.audioAnalyzer) {
        try {
          const realTimeData = audioManagerRef.current.analyzeRealTimeAudio();
          if (realTimeData) {
            // 실시간 분석 결과로 viseme 결정
            realTimeViseme = determineVisemeFromRealTimeData(realTimeData);
            
            // 디버그 로그 (스팸 방지)
            if (frame % 30 === 0) { // 30프레임마다 로그
              console.log(`🎤 [RealTime] 프레임 ${frame}:`, {
                energy: realTimeData.energy.toFixed(3),
                viseme: realTimeViseme,
                lowFreq: realTimeData.frequency.low.toFixed(3),
                midFreq: realTimeData.frequency.mid.toFixed(3),
                highFreq: realTimeData.frequency.high.toFixed(3),
                ultraHighFreq: realTimeData.frequency.ultraHigh.toFixed(3),
                spectralCentroid: realTimeData.spectralCentroid.toFixed(3),
                energyVariance: realTimeData.energyVariance.toFixed(3)
              });
            }
          } else {
            // 실시간 분석이 실패한 경우 로그
            if (frame % 60 === 0) { // 60프레임마다 로그
              console.warn(`⚠️ [RealTime] 프레임 ${frame}: 실시간 분석 데이터 없음`);
            }
          }
        } catch (error) {
          // 실시간 분석 실패 시 로그
          if (frame % 60 === 0) { // 60프레임마다 로그
            console.error(`❌ [RealTime] 프레임 ${frame}: 분석 오류:`, error);
          }
        }
      } else {
        // AudioAnalyzer가 연결되지 않은 경우 로그
        if (frame % 60 === 0) { // 60프레임마다 로그
          console.warn(`⚠️ [RealTime] 프레임 ${frame}: AudioAnalyzer 미연결`);
        }
      }
      
      if (frame < blendshapeFrames.length) {
        const frameArr = blendshapeFrames[frame];
        morphTargetNames.forEach((morphName, j) => {
          let value = frameArr[j] ?? 0;
          
          // EYE TRACKING 관련 블렌드쉐입은 절대 건드리지 않음
          if (isEyeTrackingBlendshape(morphName)) {
            return; // 건너뛰기
          }
          
          // 최적화된 입모양 제어 적용 (실시간 viseme 반영)
          const isMouthRelated = morphName.toLowerCase().includes('mouth') || 
                                 morphName.toLowerCase().includes('jaw') ||
                                 morphName.toLowerCase().includes('lip') ||
                                 morphName.toLowerCase().includes('cheek') ||
                                 morphName.toLowerCase().includes('viseme') ||
                                 morphName.toLowerCase().includes('tongue');
          
          if (isMouthRelated) {
            // 실시간 viseme이 있으면 전달
            const visemeData = realTimeViseme ? { viseme: realTimeViseme } : null;
            value = optimizeMouthShape(morphName, value, currentModel, visemeData);
          } else {
            // 입과 관련없는 블렌드셰이프도 부드러운 전환 적용
            value = smoothBlendshapeValue(morphName, value, 0.3);
          }
          
          // 자연스러운 표정을 위해 mouth smile 자동 증가
          if (morphName === 'mouthSmile' || morphName === 'mouthSmile_L' || morphName === 'mouthSmile_R') {
            value = Math.min(value + 0.0, 1.0);
          }
          
          const morphIndex = head.mesh.morphTargetDictionary[morphName];
          if (morphIndex !== undefined) {
            applyBlendshapeValue(morphTargetsRef.current, morphIndex, value);
          }
        });
        
        requestAnimationFrame(animateBlendshape);
      } else {
        // 애니메이션 완료 시 처리
        console.log('[TalkingHead] 블렌드셰이프 애니메이션 완료, neutral 표정으로 복원 시작');
        
        // 오디오 재생 상태를 부모에게 알림
        if (onAudioStateChange) {
          onAudioStateChange(false);
        }
        
        // 눈 깜빡임 재개
        if (blinkingManagerRef.current) {
          blinkingManagerRef.current.control('start');
        }
        
        // 중립 표정으로 복원
        if (facialAnimationManagerRef.current) {
          setTimeout(() => {
            if (facialAnimationManagerRef.current.defaultFacialState) {
              facialAnimationManagerRef.current.resetToDefaultFacialState(morphTargetsRef, blendshapeValuesRef);
            } else {
              facialAnimationManagerRef.current.playFacialAnimation('neutral', morphTargetsRef, blendshapeValuesRef);
            }
          }, ANIMATION_CONSTANTS.NEUTRAL_FACIAL_DELAY);
        }
        
        stopped = true;
      }
    };
    
    requestAnimationFrame(animateBlendshape);
    
    return () => { 
      console.log('[TalkingHead] 블렌드셰이프 애니메이션 중단');
      if (blinkingManagerRef.current) {
        blinkingManagerRef.current.control('start');
      }
      stopped = true; 
    };
  };

  
  // ========================================
  // ===== REACT EFFECTS =====
  // ========================================
  
  // 상태 전달 관련 useEffect 통합
  useEffect(() => {
    // 초기 로딩 상태를 부모에게 전달
    if (onInitialLoadingChange) {
      onInitialLoadingChange(!isModelLoaded);
    }
    
    // 첫 모델 로드 완료 상태를 부모에게 전달
    if (onFirstModelLoaded && isModelLoaded && !isFirstModelLoad) {
      onFirstModelLoaded(true);
    }
  }, [isModelLoaded, isFirstModelLoad, onInitialLoadingChange, onFirstModelLoaded]);

  useEffect(() => {
    if (skeletonHelperRef.current && isSkeletonVisible !== undefined) {
      skeletonHelperRef.current.visible = isSkeletonVisible;
      console.log(`[TalkingHead] 스켈레톤 표시: ${isSkeletonVisible}`);
    }
  }, [isSkeletonVisible]);

  // 효과 상태 변경 처리 (외부 props 기반)
  useEffect(() => {
    if (effectStates) {
      // Hand Trail 상태 동기화
      if (effectStates.handTrail !== undefined && handTrailManagerRef.current) {
        const currentStatus = handTrailManagerRef.current.getStatus();
        if (effectStates.handTrail !== currentStatus.isEnabled) {
          handTrailManagerRef.current.toggle();
        }
      }
      
      // Particle 상태 동기화
      if (effectStates.particle !== undefined && particleTrailManagerRef.current) {
        const currentStatus = particleTrailManagerRef.current.getStatus();
        if (effectStates.particle !== currentStatus.isEnabled) {
          particleTrailManagerRef.current.toggle();
        }
      }
      
      // Floor는 항상 표시되므로 동기화 불필요
    }
  }, [effectStates]);

  // 조명 및 배경 설정 처리 통합
  useEffect(() => {
    // 조명 설정 변경 시 실제 씬의 조명 객체 업데이트
    if (lightingSettings && typeof window !== 'undefined' && window.lightingManager) {
      console.log('[TalkingHead] 조명 설정 상태 동기화');
      
      try {
        // 새로운 조명 시스템에서는 설정이 이미 LightingManager에 적용되어 있음
        // 단순히 조명 객체 참조만 업데이트
        lightsRef.current = window.lightingManager.getLights();
        console.log('[TalkingHead] 조명 설정 처리 완료');
      } catch (error) {
        console.error('[TalkingHead] 조명 설정 적용 실패:', error);
      }
    }
    
    // 배경 변경 처리
    if (currentBackground && sceneRef.current && typeof window !== 'undefined' && window.backgroundManager) {
      console.log(`[TalkingHead] 배경 변경: ${currentBackground}`);
      window.backgroundManager.setBackground(currentBackground);
    }
  }, [lightingSettings, currentBackground]);


  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    // 매니저들이 설정될 때까지 잠시 대기
    const initTimeout = setTimeout(() => {
      console.log('[TalkingHead] 초기화 시작...', {
        modelManager: !!window.modelManager,
        materialManager: !!window.materialManager,
        lightingManager: !!window.lightingManager,
        backgroundManager: !!window.backgroundManager
      });
      
      // ModelManager에 TalkingHead 설정 함수들 등록
      if (window.modelManager) {
        window.modelManager.setTalkingHeadCallbacks({
          prepareAllSettingsForModel,
          setupModelAnimations,
          setupModelManagers,
          initializeEffectSystems,
          startAnimationSystems,
          startBlinkingAfterModelLoad,
          // 참조들
          refs: {
            modelRef,
            skeletonHelperRef,
            mixerRef,
            morphTargetsRef,
            blendshapeValuesRef
          },
          // 상태 설정 함수들
          setters: {
            setCurrentModel: () => {}, // currentModel은 props로 관리됨
            setIsModelLoaded,
            setIsFirstModelLoad
          },
          // 설정값들
          getters: {
            getIsSkeletonVisible: () => isSkeletonVisible,
            getCurrentModel: () => currentModel,
            getIsFirstModelLoad: () => isFirstModelLoad
          }
        });
      }
      
      // 씬과 첫 모델을 함께 초기화
      initSceneWithFirstModel('woman');
      audioManagerRef.current.initAudioAnalysis();
      animate();
    }, 100); // 100ms 지연
    
    return () => clearTimeout(initTimeout);
  }, []);

  // 렌더링 및 메터리얼 설정 처리 통합
  useEffect(() => {
    // 렌더링 설정 처리
    if (renderingSettings && rendererRef.current) {
      console.log(`[TalkingHead] 렌더링 설정 변경 적용:`, renderingSettings);
      
      // 픽셀 비율 적용
      if (renderingSettings.pixelRatio) {
        const actualRatio = Math.min(renderingSettings.pixelRatio, 4);
        rendererRef.current.setPixelRatio(actualRatio);
      }
      
      // 그림자 맵 크기 설정 (Three.js에서는 직접 설정 불가)
      if (renderingSettings.shadowMapSize) {
        console.log('[TalkingHead] 그림자 맵 크기 설정 요청:', renderingSettings.shadowMapSize);
        console.log('[TalkingHead] Three.js shadowMap은 크기를 직접 설정할 수 없습니다');
      }
      
      // 색상 공간 및 톤 매핑 적용
      if (renderingSettings.outputColorSpace) {
        rendererRef.current.outputColorSpace = renderingSettings.outputColorSpace;
      }
      if (renderingSettings.toneMapping !== undefined) {
        rendererRef.current.toneMapping = renderingSettings.toneMapping;
      }
      if (renderingSettings.toneMappingExposure !== undefined) {
        rendererRef.current.toneMappingExposure = renderingSettings.toneMappingExposure;
      }
      
      // 후처리 설정 적용
      if (rendererRef.current.composer) {
        const composer = rendererRef.current.composer;
        if (renderingSettings.taaEnabled !== undefined && composer.taaPass) {
          composer.taaPass.enabled = renderingSettings.taaEnabled;
        }
        if (renderingSettings.taaSampleLevel !== undefined && composer.taaPass) {
          composer.taaPass.sampleLevel = renderingSettings.taaSampleLevel;
        }
        if (renderingSettings.fxaaEnabled !== undefined && composer.fxaaPass) {
          composer.fxaaPass.enabled = renderingSettings.fxaaEnabled;
        }
      }
    }
    
    // 메터리얼 설정 변경 감지 및 적용
    if (materialSettings && typeof window !== 'undefined' && window.materialManager) {
      console.log('[TalkingHead] 메터리얼 설정 변경 감지:', {
        settingsKeys: Object.keys(materialSettings),
        hasModel: !!modelRef.current
      });

      try {
        // MaterialManager에 현재 설정 적용 (실제 메터리얼 객체 업데이트)
        window.materialManager.applySettings(materialSettings);
        
        // 모델 참조도 업데이트
        if (modelRef.current) {
          window.materialManager.setCurrentModel(modelRef.current);
        }

        console.log('[TalkingHead] 메터리얼 설정 적용 완료');
      } catch (error) {
        console.error('[TalkingHead] 메터리얼 설정 적용 실패:', error);
      }
    }
  }, [renderingSettings, materialSettings]);

  // 블렌드셰이프 기반 얼굴 애니메이션 처리
  useEffect(() => {
    if (!audioBase64) {
      resetBlendshapes();
      return;
    }
    
    if (!readyToPlay || !audioBase64 || !blendshapeFrames.length || !morphTargetNames.length || !modelRef.current || !morphTargetsRef.current.head) {
      console.log('[TalkingHead] 블렌드셰이프 애니메이션 조건 미충족');
      return;
    }
    
    return executeBlendshapeAnimation();
  }, [readyToPlay, audioBase64, blendshapeFrames, morphTargetNames, isModelLoaded]);


    // 오디오 데이터 처리
    //useEffect(() => {
    //  if (audioBase64 && morphTargetsRef.current.head) {
    //    const visemeData = audioManagerRef.current.extractViseme(audioBase64);
    //    lipSyncManagerRef.current.updateLipSync(
    //      audioBase64, 
    //      visemeData, 
    //      morphTargetsRef, 
    //      blendshapeValuesRef
    //    );
    //  }
    //}, [audioBase64]);

    
  // 모션 데이터 처리
  //useEffect(() => {
  //  if (motionData) {
  //    receiveMotionData(motionData);
  //  }
  //}, [motionData]);

  // ========================================
  // ===== HELPER FUNCTIONS =====
  // ========================================
  
  // 매니저 설정 및 초기화
  const setupModelManagers = (newModel, newSkeletonHelper, modelData, modelName) => {
    console.log('🎬 [TalkingHead] 모델 매니저들 설정 시작');
    
    // AnimationManager 설정
    animationManagerRef.current.setBoneMapping(modelData.boneMapping);
    animationManagerRef.current.setCurrentModel(modelName);
    animationManagerRef.current.applyCurrentAnimationToNewModel(newModel, newSkeletonHelper);
    
    // 다른 매니저들 설정
    facialAnimationManagerRef.current.setBlendshapeMap(modelData.blendshapeMap, modelName);
    blinkingManagerRef.current.setBlendshapeMap(modelData.blendshapeMap, modelName);
    lipSyncManagerRef.current.setBlendshapeMap(modelData.blendshapeMap);
    lipSyncManagerRef.current.setCurrentModel(modelName);
    
    // 블랜드셰이프 매핑 및 전역 참조 설정
    blendshapeMapRef.current = modelData.blendshapeMap;
    window.morphTargetsRef = morphTargetsRef;
    window.blendshapeValuesRef = blendshapeValuesRef;
    window.facialAnimationManager = facialAnimationManagerRef.current;
    
    console.log('✅ [TalkingHead] 모델 매니저들 설정 완료');
  };

  // 효과 시스템 초기화
  const initializeEffectSystems = () => {
    handTrailManagerRef.current.init(sceneRef.current, modelRef.current);
    particleTrailManagerRef.current.init(sceneRef.current);
    particleTrailManagerRef.current.syncWithHandTrailManager(handTrailManagerRef.current);
    
    // 효과 시스템 상태는 외부 effectStates props로 관리됨
  };

  // 애니메이션 및 표정 시스템 시작
  const startAnimationSystems = () => {
    // 애니메이션 루프 시작
    animationManagerRef.current.startAnimationLoop(modelRef.current, skeletonHelperRef.current);
    
    // 기본 애니메이션 설정 (T-pose 방지)
    setDefaultAnimation();
    
    // 씬 모니터링 시작 (AnimationManager에서 자동으로 시작됨)
    console.log('✅ [TalkingHead] 애니메이션 시스템 시작 완료 (씬 모니터링 활성화, 기존 blink 유지, FBX 애니메이션은 ModelManager에서 처리)');
  };

  // 모델 로드 완료 후 blink 애니메이션 시작
  const startBlinkingAfterModelLoad = () => {
    if (!morphTargetsRef.current.head || !modelRef.current) {
      setTimeout(() => startBlinkingAfterModelLoad(), 200);
      return;
    }

    try {
      // BlinkingManager를 window 객체에 등록
      if (typeof window !== 'undefined') {
        window.blinkingManager = blinkingManagerRef.current;
      }
      
      // 카메라와 모델 참조 설정
      if (cameraRef.current) {
        blinkingManagerRef.current.setCameraRef(cameraRef.current);
      }
      
      if (modelRef.current) {
        blinkingManagerRef.current.setModelRef(modelRef.current);
      }
      
      // 눈 깜빡임 시작
      blinkingManagerRef.current.initBlinking(morphTargetsRef, blendshapeValuesRef);
      
      // BLINK 시작
      blinkingManagerRef.current.control('start');
      
      console.log('✅ [TalkingHead] blink 애니메이션 시작 완료');
    } catch (error) {
      console.error('❌ [TalkingHead] blink 애니메이션 시작 실패:', error);
    }
  };

  // 모델에 애니메이션 설정 적용 (백그라운드용)
  const setupModelAnimations = async (model, skeletonHelper, modelData, modelName) => {
    console.log('🎭 [TalkingHead] 모델 애니메이션 설정 시작...', modelName);

    try {
      // 1. 애니메이션 매니저 설정
      if (animationManagerRef.current && modelData.boneMapping) {
        console.log('🎭 [TalkingHead] 애니메이션 매니저 설정...');
        animationManagerRef.current.setBoneMapping(modelData.boneMapping);
        animationManagerRef.current.setCurrentModel(modelName);
        animationManagerRef.current.applyCurrentAnimationToNewModel(model, skeletonHelper);
      }

      // 2. 페이셜 애니메이션 설정
      if (facialAnimationManagerRef.current && modelData.blendshapeMap) {
        console.log('😊 [TalkingHead] 페이셜 애니메이션 설정...');
        facialAnimationManagerRef.current.setBlendshapeMap(modelData.blendshapeMap, modelName);
      }

      // 3. 깜빡임 매니저 설정
      if (blinkingManagerRef.current && modelData.blendshapeMap) {
        console.log('😉 [TalkingHead] 깜빡임 매니저 설정...');
        blinkingManagerRef.current.setBlendshapeMap(modelData.blendshapeMap, modelName);
      }

      // 4. 립싱크 매니저 설정
      if (lipSyncManagerRef.current && modelData.blendshapeMap) {
        console.log('💋 [TalkingHead] 립싱크 매니저 설정...');
        lipSyncManagerRef.current.setBlendshapeMap(modelData.blendshapeMap);
        lipSyncManagerRef.current.setCurrentModel(modelName);
      }

      console.log('✅ [TalkingHead] 모델 애니메이션 설정 완료');
    } catch (error) {
      console.error('❌ [TalkingHead] 모델 애니메이션 설정 실패:', error);
    }
  };


  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
});

export default TalkingHeadRefactored; 


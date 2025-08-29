
// React imports
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

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

  // 최적화된 입모양 제어 함수
  const optimizeMouthShape = (blendshapeName, value, currentModel) => {
    const ENABLE_OPTIMIZATION = true;
    
    if (!ENABLE_OPTIMIZATION) {
      return value;
    }
    
    let optimizedValue = value;
    let weight = 1.0;
    
    // 모델별 가중치 설정
    if (currentModel === 'brunette') {
      weight = 1.0;
    } else if (currentModel === 'man') {
      if (blendshapeName && blendshapeName.toLowerCase().includes('mouthsmile')) {
        weight = 1.4; // 입 미소 표현 강화
      } else {
        weight = 1.0;
      }
    } else if (currentModel === 'woman') {
      // ARKIT52 블렌드셰이프(입 관련) + viseme만 남김 (좌우 구분 없이 합침)
      const mouthBlendshapeWeights = [
        { names: ['mouthsmile'], weight: 1.0 },
        { names: ['mouthdimple'], weight: 1.0 },
        { names: ['mouthpress'], weight: 1.0 },
        { names: ['mouthshrugupper'], weight: 1.0 },
        { names: ['mouthshruglower'], weight: 1.0 },
        { names: ['mouthfunnel'], weight: 1.0 },
        { names: ['mouthpucker'], weight: 1.0 },
        { names: ['mouthleft'], weight: 1.0 },
        { names: ['mouthright'], weight: 1.0 },
        { names: ['mouthrollupper'], weight: 1.0 },
        { names: ['mouthrolllower'], weight: 1.0 },
        { names: ['mouthfrown'], weight: 1.0 },
        { names: ['mouthupperup'], weight: 1.0 },
        { names: ['mouthlowerdown'], weight: 1.0 },
        { names: ['mouthstretch'], weight: 1.0 },
        { names: ['jawopen'], weight: 1.0 },
        { names: ['jawforward'], weight: 1.0 },
        { names: ['jawleft'], weight: 1.0 },
        { names: ['jawright'], weight: 1.0 },
        { names: ['mouthclose'], weight: 1.0 },
        // viseme_sil: 입을 다문 상태 -> mouthClose 또는 jawOpen이 0에 가까움
        // ARKIT 52 블렌드셰이프를 viseme로 매핑 (즉, ARKIT 블렌드셰이프가 viseme 값을 참조)
        // 아래 매핑은 viseme가 활성화(감지)되었을 때 해당 blendshape 값이 viseme 값에 의해 추가로 증폭(조정)될 수 있도록 설계되어야 함.
        // 예시: AudioManager에서 viseme 값이 추출되면, 해당 viseme가 활성화된 프레임에서 아래 매핑된 blendshape들의 값이 viseme 값에 따라 더 커지도록 처리 필요.
        // (실제 증폭/조정 로직은 optimizeMouthShape 외부에서 viseme 활성화 시점에 적용해야 함)
        { names: ['mouthClose', 'jawOpen'], weight: 1.0, substitute: ['viseme_sil'] }, // sil: 입을 다문 상태
        { names: ['mouthPucker', 'mouthClose'], weight: 1.0, substitute: ['viseme_pp'] }, // pp: 입술을 다물고 내밈
        { names: ['mouthFunnel', 'mouthPucker'], weight: 1.0, substitute: ['viseme_ff'] }, // ff: 윗니가 아랫입술에 닿음
        { names: ['jawOpen', 'mouthFunnel', 'mouthPucker'], weight: 1.0, substitute: ['viseme_th'] }, // th: 혀가 이 사이
        { names: ['jawOpen', 'mouthFunnel'], weight: 1.0, substitute: ['viseme_dd'] }, // dd: 혀가 윗잇몸
        { names: ['jawOpen'], weight: 1.0, substitute: ['viseme_kk'] }, // kk: 입을 벌리고 혀가 뒤로
        { names: ['jawOpen', 'mouthFunnel'], weight: 1.0, substitute: ['viseme_ch'] }, // ch: 입을 벌리고 입술 앞으로
        { names: ['mouthStretchLeft', 'mouthStretchRight'], weight: 1.0, substitute: ['viseme_ss'] }, // ss: 입을 옆으로 벌림
        { names: ['jawOpen', 'mouthFunnel'], weight: 1.0, substitute: ['viseme_nn'] }, // nn: 입을 약간 벌리고 혀가 윗잇몸
        { names: ['mouthFunnel', 'mouthPucker'], weight: 1.0, substitute: ['viseme_rr'] }, // rr: 입을 둥글게, 혀가 말림
        { names: ['jawOpen'], weight: 1.0, substitute: ['viseme_aa'] }, // aa: 입을 크게 벌림
        { names: ['mouthSmileLeft', 'mouthSmileRight', 'jawOpen'], weight: 1.0, substitute: ['viseme_e'] }, // e: 입꼬리 양쪽으로 벌림
        { names: ['mouthSmileLeft', 'mouthSmileRight', 'jawOpen'], weight: 1.0, substitute: ['viseme_i'] }, // i: 입꼬리 양쪽으로 크게 벌림
        { names: ['mouthPucker', 'jawOpen'], weight: 1.0, substitute: ['viseme_o'] }, // o: 입을 둥글게 오므림
        { names: ['mouthPucker', 'jawOpen'], weight: 1.0, substitute: ['viseme_u'] } // u: 입을 앞으로 내밀고 오므림
      ];

      let foundWeight = 1.0;
      if (blendshapeName) {
        const lowerBlendshape = blendshapeName.toLowerCase();
        for (const item of mouthBlendshapeWeights) {
          if (item.names.some(name => lowerBlendshape.includes(name))) {
            foundWeight = item.weight;
            break;
          }
        }
      }
      weight = foundWeight;
    }
    
    // 최종 가중치 적용 및 범위 제한
    optimizedValue = Math.min(optimizedValue * weight, 1.0);
    
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
    
    // 블렌드셰이프 애니메이션 루프
    const animateBlendshape = (now) => {
      if (stopped) return;
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const frame = Math.floor(elapsed / ANIMATION_CONSTANTS.FRAME_DURATION);
      
      if (frame < blendshapeFrames.length) {
        const frameArr = blendshapeFrames[frame];
        morphTargetNames.forEach((morphName, j) => {
          let value = frameArr[j] ?? 0;
          
          // EYE TRACKING 관련 블렌드쉐입은 절대 건드리지 않음
          if (isEyeTrackingBlendshape(morphName)) {
            return; // 건너뛰기
          }
          
          // 최적화된 입모양 제어 적용
          const isMouthRelated = morphName.toLowerCase().includes('mouth') || 
                                 morphName.toLowerCase().includes('jaw') ||
                                 morphName.toLowerCase().includes('lip') ||
                                 morphName.toLowerCase().includes('cheek') ||
                                 morphName.toLowerCase().includes('viseme') ||
                                 morphName.toLowerCase().includes('tongue');
          
          if (isMouthRelated) {
            value = optimizeMouthShape(morphName, value, currentModel);
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


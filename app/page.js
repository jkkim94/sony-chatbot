"use client";

// React hooks
import { useState, useRef, useEffect } from 'react';

// Context
import { useAudio } from '../contexts/AudioContext';

// Components
import ChatMessage from '../components/layout/ChatMessage';
import TalkingHead from '../components/TalkingHead';
import AnimatedFBX from '../components/AnimatedFBX';
import Toast from '../components/Toast';

// UI Components
import ModelSelector from '../components/ui/ModelSelector';
import ViewerCharacterSelector from '../components/ui/ViewerCharacterSelector';

// Panel Components
import FacialAnimationPanel from '../components/panels/FacialAnimationPanel';
import EffectPanel from '../components/panels/EffectPanel';
import FBXAnimationPanel from '../components/panels/FBXAnimationPanel';
import LightingPanel from '../components/panels/LightingPanel';
import RenderingPanel from '../components/panels/RenderingPanel';
import MaterialPanel from '../components/panels/MaterialPanel';


// Managers
import { renderingManager } from '../managers/RenderingManager';
import { lightingManager } from '../managers/LightingManager';
import { materialManager } from '../managers/MaterialManager';
import { backgroundManager } from '../managers/BackgroundManager';
import { modelManager } from '../managers/ModelManager';
import { audioStateManager } from '../managers/AudioStateManager';
import { uiManager } from '../managers/UIManager';

// Utils
import { playAudio, playAudioWithElement, playAudioWithAnalysis } from '../utils/audioUtils';
import { splitIntoSentences, mergeSentences } from '../utils/textUtils';
import { getVisemeFromAudio } from '../utils/audioAnalysis';

// Constants
const MODEL_CHANGE_DEBOUNCE_MS = 500;
const AUDIO_DISABLE_DURATION_MS = 3000;
const FACIAL_ANIMATION_DURATION_MS = 3000;
const PRELOAD_CHECK_INTERVAL_MS = 1000;
const TALKING_HEAD_CHECK_INTERVAL_MS = 100;
const TALKING_HEAD_TIMEOUT_MS = 5000;
const AUDIO_INIT_DELAY_MS = 300;
const FOCUS_DELAY_MS = 100;
const SYNC_DELAY_MS = 500;
const AUDIO_STATE_RESET_DELAY_MS = 1000;

const MODELS = [
  { key: 'woman', label: 'Anna', emoji: '👩' },
  { key: 'brunette', label: 'Airi', emoji: '👩‍🦰' },
  { key: 'brunette1', label: 'Airi 1', emoji: '👩‍🦰' },
  { key: 'brunette2', label: 'Airi 2', emoji: '👩‍🦰' },
  { key: 'man', label: 'Eren', emoji: '👨' }
];

const TABS = [
  { id: 'lighting', label: '조명', emoji: '💡' },
  { id: 'rendering', label: '렌더링', emoji: '🖥️' },
  { id: 'material', label: '메터리얼', emoji: '🎨' },
  
  { id: 'fbx', label: 'FBX', emoji: '🎬' }
];

const SIMPLE_ANIMATION_TYPES = [
  'Simple_Blinking',
  'Simple_EyeTracking', 
  'Simple_EyeAnimation',
  'Idle'
];

export default function Home() {
  // ===== REFS =====
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const talkingHeadRef = useRef(null);
  const lastModelChangeTime = useRef(null);

  // ===== CONTEXT =====
  const { setIsPlaying } = useAudio();

  // ===== CHAT STATE =====
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ===== MODEL STATE =====
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isFirstModelLoaded, setIsFirstModelLoaded] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // ===== ANIMATION STATE =====
  const [isAnimationRunning, setIsAnimationRunning] = useState(false);
  const [apiAnimationState, setApiAnimationState] = useState({
    isActive: false,
    startTime: null,
    blinkingWeights: null,
    trackingWeights: null
  });

  // ===== PRELOAD STATE =====
  const [preloadState, setPreloadState] = useState({
    isPreloading: true,
    progress: 0,
    totalModels: 0
  });

  // ===== AUDIO STATE =====
  const [audioPlayingState, setAudioPlayingState] = useState({
    isPlaying: false,
    isDisabled: false
  });

  // ===== MANAGER STATES =====
  const [renderingSettings, setRenderingSettings] = useState(() => renderingManager.getCurrentSettings());
  const [materialSettings, setMaterialSettings] = useState(() => ({
    individualMaterial: {}
  }));
  const [lightingSettings, setLightingSettings] = useState(() => lightingManager.getCurrentSettings());
  const [modelState, setModelState] = useState(() => modelManager.getCurrentState());
  const [audioState, setAudioState] = useState(() => audioStateManager.getCurrentState());
  const [uiState, setUIState] = useState(() => uiManager.getCurrentState());

  // ===== EFFECTS =====
  // audioState 상태 변화 모니터링
  useEffect(() => {
    console.log('[Page] audioState 상태 변화 감지:', audioState);
  }, [audioState]);

  // 🚀 프리로딩 상태 실시간 모니터링 (완료 시 즉시 중단)
  useEffect(() => {
    // TalkingHead가 마운트되지 않았으면 스킵
    if (!talkingHeadRef.current) {
      return;
    }

    let intervalId = null;
    let isPreloadCompleted = false;

    const checkPreloadStatus = () => {
      // 이미 완료되었다면 더 이상 체크하지 않음
      if (isPreloadCompleted) {
        return;
      }

      if (talkingHeadRef.current) {
        const status = talkingHeadRef.current.getPreloadStatus();
        if (status) {
          // ✅ 프리로딩 완료 시 interval 즉시 중단
          if (status.progress >= status.totalModels) {
            console.log('✅ [Page] 프리로딩 완료 - 모니터링 중단');
            isPreloadCompleted = true;
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            return;
          }
          
          // 진행률 업데이트
          setPreloadState(status);
        }
      }
    };

    // 즉시 한 번 체크
    checkPreloadStatus();
    
    // 1초마다 체크 (완료 시 자동 중단)
    intervalId = setInterval(checkPreloadStatus, 1000);

    // 🧹 클린업: 컴포넌트 언마운트 시 interval 정리
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [talkingHeadRef.current]);

  // 🔍 프리로딩 상태 디버깅 (🚀 최적화: 완료 시 로그 중단)
  useEffect(() => {
    // 🚀 프리로딩이 진행 중일 때만 로그 출력
    if (preloadState.isPreloading || preloadState.progress < preloadState.totalModels) {
      console.log('🔍 [Page] preloadState 변화 감지:', preloadState);
    }
  }, [preloadState]);

  // 환경 설정 제거 - 프리로딩 모니터링 시작
  useEffect(() => {
    console.log('🔧 [Page] 프리로딩 모니터링 시작');
  }, []); // 빈 의존성 배열로 한 번만 실행

  // ===== HANDLERS =====
  const handleAudioStateChange = (isPlaying) => {
    if (isPlaying) {
      setAudioPlayingState({
        isPlaying: true,
        isDisabled: true
      });
    } else {
      setAudioPlayingState(prev => ({
        ...prev,
        isPlaying: false,
        isDisabled: true
      }));
      
      setTimeout(() => {
        setAudioPlayingState(prev => ({
          ...prev,
          isDisabled: false
        }));
      }, AUDIO_DISABLE_DURATION_MS);
    }
  };

  const handleAPIAnimationStart = () => {
    console.log('🎭 [Page] API 애니메이션 시작 감지 - 타이밍 관리 시작');
    
    setIsAnimationRunning(true);
    console.log('🔒 [Page] isAnimationRunning = true 설정됨');
    
    if (window.blinkingManager) {
      const currentWeights = window.blinkingManager.getAllEyeWeights();
      
      setApiAnimationState({
        isActive: true,
        startTime: Date.now(),
        blinkingWeights: currentWeights.blink,
        trackingWeights: currentWeights.tracking
      });
      
      window.blinkingManager.control('stop');
      
      console.log('💾 [Page] API 애니메이션 시작 시 weight 저장 완료:', {
        blink: currentWeights.blink,
        tracking: currentWeights.tracking
      });
    } else {
      console.warn('⚠️ [Page] BlinkingManager를 찾을 수 없음');
    }
  };

  const handleAPIAnimationEnd = () => {
    console.log('🎭 [Page] API 애니메이션 종료 감지 - 타이밍 관리 종료');
    
    setIsAnimationRunning(false);
    console.log('🔒 [Page] isAnimationRunning = false 설정됨');
    
    setApiAnimationState({
      isActive: false,
      startTime: null,
      blinkingWeights: null,
      trackingWeights: null
    });
    
    if (window.blinkingManager) {
      window.blinkingManager.control('start');
    }
  };

  const handleMotionData = (data) => {
    audioStateManager.setMotionData(data);
  };

  const handleModelChange = async (modelName) => {
    if (modelState.currentModel === modelName && modelState.currentModel !== null && !isModelLoading) {
      return;
    }
    
    if (isModelLoading) {
      return;
    }
    
    if (isAnimationRunning) {
      const currentAnimationType = getCurrentAnimationType();
      
      if (isSimpleEyeAnimation(currentAnimationType)) {
        // 허용
      } else {
        uiManager.showToast(`🚫 ${currentAnimationType} 애니메이션 실행 중입니다. 완료 후 모델을 전환해주세요.`);
        return;
      }
    }
    
    const now = Date.now();
    if (lastModelChangeTime.current && (now - lastModelChangeTime.current) < MODEL_CHANGE_DEBOUNCE_MS) {
      return;
    }
    lastModelChangeTime.current = now;
    
    if (!talkingHeadRef.current || !talkingHeadRef.current.loadModel) {
      return;
    }
    
    try {
      setIsModelLoading(true);
      renderingManager.startModelLoadTimer(modelName);
      
      await talkingHeadRef.current.loadModel(modelName);
      
      renderingManager.completeModelLoadTimer(modelName);
      
      modelManager.setCurrentModel(modelName);
      setModelState(modelManager.getCurrentState());
    } catch (error) {
      console.error(`❌ [Page] 모델 로드 실패: ${modelName}`, error);
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleModelLoadComplete = async (modelName) => {
    console.log(`✅ [Page] 모델 로드 완료: ${modelName}`);
    
    if (!isFirstModelLoaded) {
      setIsFirstModelLoaded(true);
      console.log('🎯 [Page] 첫 모델 로드 완료 - isFirstModelLoaded = true');
    }
    
    try {
      console.log(` [Page] ${modelName} 모델 프리셋 즉시 적용 시작...`);
      
      const newMaterialSettings = await materialManager.loadPresetForModel(modelName);
      materialManager.applySettings(newMaterialSettings);
      setMaterialSettings(materialManager.getCurrentSettings());
      console.log(`✅ [Page] 메터리얼 프리셋 즉시 적용 완료: ${modelName}`);
      
      const newRenderingSettings = await renderingManager.loadPresetForModel(modelName);
      renderingManager.applySettings(newRenderingSettings);
      setRenderingSettings(renderingManager.getCurrentSettings());
      console.log(`✅ [Page] 렌더링 프리셋 즉시 적용 완료: ${modelName}`);
      
      // JSON 기반 모델별 조명 설정 로드
      const newLightingSettings = await lightingManager.loadPresetForModel(modelName);
      setLightingSettings(newLightingSettings);
      console.log(`✅ [Page] 조명 프리셋 즉시 적용 완료: ${modelName}`);
      
      console.log(` [Page] ${modelName} 모델 모든 프리셋 즉시 적용 완료!`);
      
    } catch (error) {
      console.error('프리셋 즉시 적용 오류:', error);
    }
  };

  const handleSkeletonToggle = () => {
    talkingHeadRef.current?.toggleSkeleton?.();
    modelManager.toggleSkeleton();
    setModelState(modelManager.getCurrentState());
  };

  const handleEffectToggle = (effectType) => {
    switch (effectType) {
      case 'handTrail':
        talkingHeadRef.current?.toggleHandTrail?.();
        break;
      case 'particle':
        talkingHeadRef.current?.toggleParticle?.();
        break;
      case 'floor':
        talkingHeadRef.current?.toggleFloor?.();
        break;
      case 'eyeTracking':
        talkingHeadRef.current?.toggleEyeTracking?.();
        break;
    }
    
    modelManager.toggleEffect(effectType);
    setModelState(modelManager.getCurrentState());
  };

  const toggleUIVisibility = () => {
    uiManager.toggleUIVisibility();
    setUIState(uiManager.getCurrentState());
  };

  const handleFacialAnimation = (animationType) => {
    setIsAnimationRunning(true);
    
    if (talkingHeadRef.current?.playFacialAnimation) {
      talkingHeadRef.current.playFacialAnimation(animationType);
    }
    
    setTimeout(() => {
      setIsAnimationRunning(false);
    }, FACIAL_ANIMATION_DURATION_MS);
  };

  const handleFBXAnimation = (animationName) => {
    setIsAnimationRunning(true);
    uiManager.setCurrentFBXAnimation(animationName);
  };

  const handleAnimationComplete = () => {
    setIsAnimationRunning(false);
  };

  const handleModelLoadingChange = (loading) => {
    setIsModelLoading(loading);
  };

  const handleMaterialChange = (property, value) => {
    console.log(`[Page] 개별 메터리얼 설정 변경: ${property} = ${value}`);
    
    // 개별 메터리얼 설정은 MaterialPanel에서 직접 처리
    // 여기서는 UI 동기화만 담당
    console.log(`[Page] 개별 메터리얼 설정 변경 감지: ${property} = ${value}`);
  };

  const handleLightingChange = (property, value) => {
    console.log(`🎨 [Page] 전체 조명 조정: ${property} = ${value}`);
    
    // LightingManager를 통해 전체 조정 적용
    lightingManager.updateOverall(property, value);
    
    // UI 상태 업데이트
    const newSettings = lightingManager.getCurrentSettings();
    setLightingSettings(newSettings);
    
    console.log(`✅ [Page] 전체 조명 조정 완료: ${property} = ${value}`);
  };

  const handleLightingPreset = async (presetName) => {
    try {
      const presetSettings = lightingManager.applyPreset(presetName);
      setLightingSettings(presetSettings);
    } catch (error) {
      console.error('❌ [Page] 조명 프리셋 적용 실패:', error);
    }
  };

  const handleAdvancedLightChange = (lightType, property, value) => {
    console.log(`🎛️ [Page] 개별 조명 조정: ${lightType}.${property} = ${value}`);
    
    // LightingManager를 통해 개별 조명 조정 적용
    lightingManager.updateLight(lightType, property, value);
    
    // UI 상태 업데이트
    const newSettings = lightingManager.getCurrentSettings();
    setLightingSettings(newSettings);
    
    console.log(`✅ [Page] 개별 조명 조정 완료: ${lightType}.${property} = ${value}`);
  };

  const handleRenderingChange = (property, value) => {
    renderingManager.updateSetting(property, value);
    setRenderingSettings(renderingManager.getCurrentSettings());
  };

  const showToast = (message) => {
    uiManager.showToast(message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          translateToJapanese: uiState.currentLanguage === 'japanese',
          translateToEnglish: uiState.currentLanguage === 'english'
        }),
      });

      if (!response.ok) throw new Error('채팅 요청 실패');

      const data = await response.json();
      const assistantContent = data.response || data.message || '응답을 받지 못했습니다.';
      
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);

      await handleTextToSpeech(assistantContent);
    } catch (error) {
      console.error('에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== UTILITY FUNCTIONS =====
  const getCurrentAnimationType = () => {
    if (apiAnimationState.isActive) {
      return 'API_Animation';
    }
    
    if (window.blinkingManager) {
      const blinkingState = window.blinkingManager.getStatus();
      if (blinkingState.isBlinking && !blinkingState.isEyeTracking) {
        return 'Simple_Blinking';
      }
      if (blinkingState.isEyeTracking && !blinkingState.isBlinking) {
        return 'Simple_EyeTracking';
      }
      if (blinkingState.isBlinking && blinkingState.isEyeTracking) {
        return 'Simple_EyeAnimation';
      }
    }
    
    if (window.facialAnimationManager) {
      const facialState = window.facialAnimationManager.getCurrentState();
      if (facialState.isPlaying && facialState.currentAnimation) {
        return `Facial_${facialState.currentAnimation}`;
      }
    }
    
    if (uiState.currentFBXAnimation && uiState.currentFBXAnimation !== 'Idle') {
      return `FBX_${uiState.currentFBXAnimation}`;
    }
    
    return 'Idle';
  };

  const isSimpleEyeAnimation = (animationType) => {
    return SIMPLE_ANIMATION_TYPES.includes(animationType);
  };

  const handleTextToSpeech = async (text) => {
    try {
      const rawSentences = splitIntoSentences(text);
      const mergedSentences = mergeSentences(rawSentences);
      
      for (const sentence of mergedSentences) {
        if (!sentence.trim()) continue;
        
        // 1. 텍스트를 음성으로 변환
        const ttsResponse = await fetch('/api/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: sentence,
            isJapaneseMode: uiState.currentLanguage === 'japanese',
            isEnglishMode: uiState.currentLanguage === 'english',
            currentModel: modelState.currentModel
          }),
        });
        
        if (!ttsResponse.ok) {
          throw new Error('음성 합성 요청 실패');
        }
        
        const ttsData = await ttsResponse.json();
        
        if (!ttsData.audio) {
          throw new Error('오디오 데이터가 없습니다');
        }
        
        // 2. AudioStateManager에 오디오 base64 전달
        audioStateManager.setAudioBase64(ttsData.audio);
        
        // 3. inference API로 블렌드셰이프 데이터 요청
        try {
          const inferenceResponse = await fetch('/api/inference', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ audio_base64: ttsData.audio }),
          });
          
          if (!inferenceResponse.ok) {
            const errorText = await inferenceResponse.text();
            throw new Error(`inference API 요청 실패: ${inferenceResponse.status} - ${errorText}`);
          }
          
          const inferenceData = await inferenceResponse.json();
          
          // 4. 블렌드셰이프 데이터를 AudioStateManager에 전달
          if (inferenceData.morph_targets && inferenceData.data) {
            audioStateManager.setBlendshapeData(inferenceData.data, inferenceData.morph_targets);
            audioStateManager.setReadyToPlay(true);
          } else {
            throw new Error('블렌드셰이프 데이터 형식이 올바르지 않습니다');
          }
        } catch (inferenceError) {
          console.error('inference API 오류:', inferenceError);
        }
        
        setIsPlaying(true);
        
        // 5. 오디오 재생
        try {
          let audioUrl;
          if (ttsData.audio.startsWith('data:audio')) {
            audioUrl = ttsData.audio;
          } else {
            const audioBlob = new Blob([Uint8Array.from(atob(ttsData.audio), c => c.charCodeAt(0))], {
              type: 'audio/mpeg'
            });
            audioUrl = URL.createObjectURL(audioBlob);
          }
          
          const audio = new Audio();
          audio.src = audioUrl;
          
          await new Promise((resolve, reject) => {
            audio.addEventListener('ended', () => {
              if (!ttsData.audio.startsWith('data:audio')) {
                URL.revokeObjectURL(audioUrl);
              }
              resolve();
            });
            
            audio.addEventListener('error', reject);
            audio.play().catch(reject);
          });
          
        } catch (audioError) {
          console.error('오디오 재생 오류:', audioError);
        }
      }
      
    } catch (error) {
      console.error('텍스트 음성 변환 오류:', error);
    } finally {
      setIsPlaying(false);
      // 모든 문장 완료 후 상태 초기화
      setTimeout(() => {
        audioStateManager.resetAudioState();
      }, AUDIO_STATE_RESET_DELAY_MS);
    }
  };

  // API 애니메이션 상태 모니터링
  useEffect(() => {
    if (apiAnimationState.isActive) {
      console.log('📊 [Page] API 애니메이션 진행 중:', {
        duration: Date.now() - apiAnimationState.startTime,
        blinkingWeights: apiAnimationState.blinkingWeights,
        trackingWeights: apiAnimationState.trackingWeights
      });
    }
  }, [apiAnimationState]);

  // 🔒 실시간 애니메이션 상태 모니터링 및 디버깅
  useEffect(() => {
    console.log('📊 [Page] 애니메이션 상태 변화 감지:', {
      isAnimationRunning,
      apiAnimationState,
      timestamp: Date.now()
    });
  }, [isAnimationRunning, apiAnimationState]);

  // API 애니메이션 이벤트 리스너 등록
  useEffect(() => {
    // API 애니메이션 시작 이벤트 리스너
    const handleAPIAnimationStartEvent = (event) => {
      console.log('🎭 [Page] API 애니메이션 시작 이벤트 수신:', event.detail);
      handleAPIAnimationStart();
    };

    // API 애니메이션 종료 이벤트 리스너
    const handleAPIAnimationEndEvent = (event) => {
      console.log('🎭 [Page] API 애니메이션 종료 이벤트 수신:', event.detail);
      handleAPIAnimationEnd();
    };

    // 이벤트 리스너 등록
    window.addEventListener('apiAnimationStart', handleAPIAnimationStartEvent);
    window.addEventListener('apiAnimationEnd', handleAPIAnimationEndEvent);

    // 클린업 함수
    return () => {
      window.removeEventListener('apiAnimationStart', handleAPIAnimationStartEvent);
      window.removeEventListener('apiAnimationEnd', handleAPIAnimationEndEvent);
    };
  }, []);

  // 매니저 초기화 및 콜백 설정
  useEffect(() => {
    // 전역 매니저 등록 (TalkingHead에서 접근하기 위함)
    window.materialManager = materialManager;
    window.lightingManager = lightingManager;
    window.renderingManager = renderingManager;
    window.modelManager = modelManager;
    
    // TalkingHead 참조 확인을 위한 타이머 설정
    const checkTalkingHeadRef = () => {
      if (talkingHeadRef.current) {
        // console.log('🔗 [Page] TalkingHead 참조 확인됨, 매니저 콜백 설정 시작');
        setupManagerCallbacks();
        return true;
      }
      return false;
    };

    // JSON 머티리얼 UI 동기화를 위한 이벤트 리스너 등록
    const handleMaterialUpdate = (event) => {
      try {
        const { settings, source } = event.detail || {};
        if (source === 'json' && settings) {
          console.log('🔄 [Page] JSON에서 머티리얼 설정 업데이트 감지:', event.detail.modelName);
          // 새로운 구조에 맞게 설정 업데이트
          setMaterialSettings(prev => ({
            individualMaterial: settings.individualMaterial || prev.individualMaterial
          }));
        }
      } catch (error) {
        console.error('❌ [Page] 메터리얼 설정 업데이트 처리 실패:', error);
      }
    };
    window.addEventListener('materialSettingsUpdated', handleMaterialUpdate);

    // TalkingHead와의 연결을 위한 콜백 설정 함수
    const setupManagerCallbacks = () => {
        // 렌더링 매니저 콜백 설정 (안티앨리어싱은 항상 ON으로 고정)
        renderingManager.setCallbacks({
          onPixelRatioChange: (value) => talkingHeadRef.current?.setPixelRatio?.(value),
          onShadowMapSizeChange: (value) => talkingHeadRef.current?.setShadowMapSize?.(value),
          onRenderingModeChange: (value) => talkingHeadRef.current?.setRenderingMode?.(value),
          // 후처리 안티앨리어싱 콜백들
          onTAAEnabledChange: (value) => {
            // console.log('🕒 [Page] TAA 콜백 호출:', value);
            talkingHeadRef.current?.setTAAEnabled?.(value);
            setRenderingSettings(renderingManager.getCurrentSettings());
          },
          onTAASampleLevelChange: (value) => {
            // console.log('🕒 [Page] TAA Sample Level 콜백 호출:', value);
            talkingHeadRef.current?.setTAASampleLevel?.(value);
            setRenderingSettings(renderingManager.getCurrentSettings());
          },
          onFXAAEnabledChange: (value) => {
            // console.log('⚡ [Page] FXAA 콜백 호출:', value);
            talkingHeadRef.current?.setFXAAEnabled?.(value);
            setRenderingSettings(renderingManager.getCurrentSettings());
          },
          // 성능 모드 변경 알림
          onPerformanceModeChange: (mode, modelName) => {
            console.log(`🚀 [Page] 성능 모드 자동 변경: ${mode} (${modelName})`);
            // 사용자에게 토스트 메시지로 알림
            uiManager.showToast(`🚀 ${modelName} 모델 로딩이 느려서 자동으로 ${mode === 'low' ? '저사양' : '고성능'} 모드로 전환되었습니다.`);
          }
        });

        // 조명 매니저에 TalkingHead 참조 설정 (기존 호환성)
        if (lightingManager.setTalkingHeadRef) {
          lightingManager.setTalkingHeadRef(talkingHeadRef);
        }
        
        // 머티리얼 매니저 콜백 설정 제거 (무한 루프 방지)
        materialManager.setCallbacks({});

        // 모델 매니저 콜백 설정 (TalkingHead 직접 호출하지 않음)
        modelManager.setCallbacks({
          onSkeletonToggle: (visible) => {
            // 무한 루프 방지: TalkingHead는 handleSkeletonToggle에서 직접 호출
            // console.log(`[ModelManager] 스켈레톤 상태 변경: ${visible}`);
          },

          onCameraFOVChange: (fov) => talkingHeadRef.current?.setFOV?.(fov),
          onEffectToggle: (effectType, enabled) => {
            // 무한 루프 방지: TalkingHead는 handleEffectToggle에서 직접 호출
            // console.log(`[ModelManager] 효과 상태 변경: ${effectType} = ${enabled}`);
          }
        });

        // 오디오 상태 매니저 콜백 설정
        // console.log('[Page] AudioStateManager 콜백 설정 시작');
        audioStateManager.setCallbacks({
          onAudioStateChange: (state) => {
            // console.log('[Page] AudioStateManager 콜백 호출됨:', state);
            setAudioState(state);
            // console.log('[Page] audioState 업데이트 완료');
          }
        });
        // console.log('[Page] AudioStateManager 콜백 설정 완료');

        // UI 매니저 콜백 설정
        uiManager.setCallbacks({
          onUIStateChange: (state) => setUIState(state)
        });

     
        // console.log('🏗️ [Page] 구조 개선: 매니저 간 직접 연결 제거, 상위에서 타이밍 관리');
        
        setModelState(modelManager.getCurrentState());
        setMaterialSettings(materialManager.getCurrentSettings());
        setLightingSettings(lightingManager.getCurrentSettings());
        setRenderingSettings(renderingManager.getCurrentSettings());
        
        // 🎯 TalkingHead에서 이미 woman을 기본으로 로드하므로 중복 로드 제거
        // console.log('🎮 [Page] TalkingHead에서 woman 모델을 기본으로 로드함');
      };

    // TalkingHead 참조를 주기적으로 확인하되, 한 번만 실행되도록 보장
    let hasInitialized = false;
    const interval = setInterval(() => {
      if (!hasInitialized && checkTalkingHeadRef()) {
        hasInitialized = true;
        clearInterval(interval);
        // console.log('🎯 [Page] TalkingHead 초기화 완료, 중복 체크 방지됨');
      }
    }, 100);

    // 5초 후에도 로드되지 않으면 타이머 정리
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 5000);

    return () => {
      window.removeEventListener('materialSettingsUpdated', handleMaterialUpdate);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []); // 의존성 배열을 비워서 한 번만 실행되도록 수정

  // 🎯 JSON 라이팅 UI 동기화 이벤트 리스너 정리
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('lightingSettingsUpdated', handleLightingUpdate);
      }
    };
  }, []);

  // 🎯 JSON 라이팅 UI 동기화를 위한 이벤트 리스너 함수 (전역으로 이동)
  const handleLightingUpdate = (event) => {
    if (event.detail.source === 'json') {
      // console.log('🔄 [Page] JSON에서 조명 설정 업데이트 감지:', event.detail.modelName);
      const updatedSettings = lightingManager.getCurrentSettings();
      setLightingSettings(updatedSettings);
      // console.log('✅ [Page] 조명 설정 UI 동기화 완료:', updatedSettings);
    }
  };

  // 매니저들 즉시 초기화 및 환경별 설정 적용
  useEffect(() => {
    // console.log('🔧 [Page] 매니저들 즉시 초기화 시작');
    
    // 매니저들을 전역에 설정 (TalkingHead보다 먼저)
    window.materialManager = materialManager;
    window.lightingManager = lightingManager;
    window.renderingManager = renderingManager;
    window.backgroundManager = backgroundManager;
    window.modelManager = modelManager;
    window.cameraManager = null; // TalkingHead에서 초기화 후 설정됨
    
    // 🎯 JSON 라이팅 UI 동기화를 위한 이벤트 리스너 추가
    window.addEventListener('lightingSettingsUpdated', handleLightingUpdate);
    
    console.log('🔧 [Page] 모든 기능 활성화 완료');
  }, []); // 최초 한 번만 실행




  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    const initialFocusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    
    return () => clearTimeout(initialFocusTimer);
  }, []);
  
  useEffect(() => {
    if (!isLoading) {
      const loadingFocusTimer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
      return () => clearTimeout(loadingFocusTimer);
    }
  }, [isLoading]);
  
  // 오디오 초기화
  useEffect(() => {
    const initAudio = () => {
      const dummyAudio = new Audio();
      dummyAudio.play().catch(e => {
        console.log('초기 오디오 재생 필요');
      });
    };
    
    const handleInitAudio = () => initAudio();
    document.addEventListener('click', handleInitAudio, { once: true });
    
    return () => document.removeEventListener('click', handleInitAudio);
  }, []);

  // TalkingHead 동기화
  useEffect(() => {
    if (talkingHeadRef.current && renderingSettings && materialSettings) {
      const timer = setTimeout(() => {
        try {
          if (talkingHeadRef.current.setPixelRatio) {
            talkingHeadRef.current.setPixelRatio(renderingSettings.pixelRatio);
          }
          if (talkingHeadRef.current.setMaterialSettings) {
            talkingHeadRef.current.setMaterialSettings(materialSettings);
          }
          // 새로운 조명 시스템과의 호환성을 위한 설정
          if (talkingHeadRef.current.setLightingSettings) {
            talkingHeadRef.current.setLightingSettings(lightingSettings);
          }
          
          console.log('🎨 [App] 조명 설정 동기화');
        } catch (error) {
          console.error('TalkingHead 동기화 오류:', error);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [renderingSettings, materialSettings, lightingSettings]);

  return (
    <main className="flex min-h-screen bg-gray-900" suppressHydrationWarning={true}>
      {/* UI 토글 버튼 */}
      {(
        <button
          onClick={toggleUIVisibility}
          disabled={isAnimationRunning}
          className={`fixed top-4 left-4 z-50 w-12 h-12 rounded-full border-2 border-gray-600 text-white font-bold transition-all duration-300 shadow-lg ${
            isAnimationRunning
              ? 'bg-gray-500 cursor-not-allowed opacity-50'
              : uiState.isUIVisible 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
          }`}
          title={isAnimationRunning ? '애니메이션 실행 중' : (uiState.isUIVisible ? 'UI 숨기기' : 'UI 보이기')}
        >
          {uiState.isUIVisible ? '✕' : '☰'}
        </button>
      )}

      {/* 왼쪽 사이드바 - UI 패널들 */}
      {(

        <div className={`w-96 h-screen bg-gray-800 border-r border-gray-700 flex flex-col transition-transform duration-300 relative ${
          uiState.isUIVisible ? 'translate-x-0' : '-translate-x-full'
        }`}>
          {/* 🔒 애니메이션 중 UI 오버레이 */}
          {isAnimationRunning && (
            <div className="absolute inset-0 bg-purple-900/20 border-2 border-purple-400/30 rounded-lg z-10 flex items-center justify-center">
              <div className="text-center text-purple-400">
                <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <div className="text-sm font-medium">🎭 애니메이션 실행 중</div>
                <div className="text-xs opacity-75">모든 UI 조작이 비활성화됩니다</div>
              </div>
            </div>
          )}
          
          {/* 스크롤 가능한 패널 컨테이너 */}
          <div className="flex-1 overflow-y-auto">
            {/* 모델 선택 패널 */}
            <div className="mb-6">
              <ModelSelector
                currentModel={modelState.currentModel}
                onModelChange={handleModelChange}
                models={MODELS}
                isLoading={isInitialLoading || isModelLoading || preloadState.isPreloading || !isFirstModelLoaded}
                isInitialLoading={isInitialLoading}
                key={`model-selector-${isModelLoading}-${preloadState.isPreloading}-${isInitialLoading}-${isFirstModelLoaded}`}
                isAnimationRunning={isAnimationRunning}
                isChatLoading={isLoading}
                isSkeletonVisible={modelState.isSkeletonVisible}
                onToggleSkeleton={handleSkeletonToggle}
              />
            </div>

            {/* 효과 패널 */}
            <div className="p-4 border-b border-gray-600">
              <EffectPanel
                effectStates={modelState.effectStates}
                onEffectToggle={handleEffectToggle}
                disabled={isModelLoading || isAnimationRunning}
              />
            </div>

            {/* 표정 애니메이션 패널 */}
            <div className="p-4 border-b border-gray-600">
              <FacialAnimationPanel
                onPlayAnimation={handleFacialAnimation}
                disabled={isModelLoading || isAnimationRunning}
              />
            </div>

            {/* 탭 기반 고급 패널 */}
            <div className="flex flex-col">
            {/* 탭 헤더 */}
            <div className="flex border-b border-gray-600 bg-gray-800">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => !isAnimationRunning && uiManager.setActiveTab(tab.id)}
                  disabled={isAnimationRunning}
                  className={`flex-1 px-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                    isAnimationRunning
                      ? 'text-gray-500 cursor-not-allowed opacity-50'
                      : uiState.activeTab === tab.id
                        ? 'text-blue-400 border-blue-400 bg-gray-700/50'
                        : 'text-gray-400 border-transparent hover:text-gray-300 hover:bg-gray-700/30'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{tab.emoji}</span>
                    <span>{tab.label}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* 탭 내용 */}
            <div className="p-4">
              {uiState.activeTab === 'lighting' && (
                <LightingPanel
                  lightingSettings={lightingSettings}
                  onLightingPreset={handleLightingPreset}
                  onLightChange={handleLightingChange}
                  onAdvancedLightChange={handleAdvancedLightChange}
                  disabled={isModelLoading || isAnimationRunning}
                />
              )}


              {uiState.activeTab === 'rendering' && (
                <RenderingPanel
                  pixelRatio={renderingSettings.pixelRatio}
                  onPixelRatioChange={(value) => renderingManager.setPixelRatio(value)}
                  shadowMapSize={renderingSettings.shadowMapSize}
                  onShadowMapSizeChange={(value) => renderingManager.setShadowMapSize(value)}
                  antialias={renderingSettings.antialias}
                  onAntialiasChange={(value) => renderingManager.setAntialias(value)}
                  renderingMode={renderingSettings.renderingMode}
                  onRenderingModeChange={(value) => renderingManager.setRenderingMode(value)}
                  isVisible={uiState.panelVisibility?.rendering !== false}
                  taaEnabled={renderingSettings.taaEnabled}
                  onTAAEnabledChange={(enabled) => renderingManager.setTAAEnabled(enabled)}
                  taaSampleLevel={renderingSettings.taaSampleLevel}
                  onTAASampleLevelChange={(level) => renderingManager.setTAASampleLevel(level)}
                  fxaaEnabled={renderingSettings.fxaaEnabled}
                  onFXAAEnabledChange={(enabled) => renderingManager.setFXAAEnabled(enabled)}

                  preferWebGPU={renderingSettings.preferWebGPU}
                  onPreferWebGPUChange={(value) => renderingManager.setPreferWebGPU(value)}
                  rendererType={renderingManager.getRendererType()}
                  disabled={isModelLoading || isAnimationRunning}
                />
              )}

              {uiState.activeTab === 'material' && (
                <MaterialPanel
                  materialManager={materialManager}
                  talkingHeadRef={talkingHeadRef}
                  currentModel={modelState.currentModel}
                  disabled={isModelLoading || isAnimationRunning}
                />
              )}

              {uiState.activeTab === 'fbx' && (
                <FBXAnimationPanel
                  currentAnimation={uiState.currentFBXAnimation}
                  onAnimationSelect={(name) => uiManager.setCurrentFBXAnimation(name)}
                  isLoading={uiState.isFBXLoading}
                  disabled={isModelLoading || isAnimationRunning}
                />
              )}
            </div>
            </div>
          </div>
        </div>

      )}

      {/* 중앙 메인 영역 - GLB 뷰어 (릴리즈 모드에서는 전체 화면) */}
      <div className={`absolute h-screen transition-all duration-300 ${
        uiState.isUIVisible 
          ? 'left-96 right-[48rem]' // UI 패널 있음 (w-96 = 24rem)
          : 'left-0 right-[48rem]' // UI 패널 없음
      }`}>
        <div className="w-full h-full relative">
          {/* 캐릭터 선택 패널 */}
          {!isInitialLoading && !preloadState.isPreloading && isFirstModelLoaded && (
            <ViewerCharacterSelector 
              currentModel={modelState.currentModel}
              onModelChange={handleModelChange}
              isLoading={isModelLoading}
              isAnimationRunning={isAnimationRunning}
              isChatLoading={isLoading}
              isPreloading={preloadState.isPreloading}
              isAudioPlaying={audioPlayingState.isDisabled}
              currentLanguage={uiState.currentLanguage}
              isVisible={true}
            />
          )}
          
          <TalkingHead 
            ref={talkingHeadRef}
            audioBase64={audioState.audioBase64}
            blendshapeFrames={audioState.blendshapeFrames} 
            morphTargetNames={audioState.morphTargetNames}
            readyToPlay={audioState.readyToPlay}
            motionData={audioState.motionData} 

            currentModel={modelState.currentModel}
            isSkeletonVisible={modelState.isSkeletonVisible}
            onModelChange={handleModelChange}
            onModelLoadComplete={handleModelLoadComplete}
            onSkeletonToggle={handleSkeletonToggle}
            onModelLoadingChange={handleModelLoadingChange}
            effectStates={modelState.effectStates}
            onEffectToggle={handleEffectToggle}
            lightingSettings={lightingSettings}
            onLightingChange={handleLightingChange}
            onLightingPresetChange={handleLightingPreset}
            renderingSettings={renderingSettings}
            onRenderingChange={handleRenderingChange}
            materialSettings={materialSettings}
            onFacialAnimation={handleFacialAnimation}
            onAudioStateChange={handleAudioStateChange}
            onInitialLoadingChange={setIsInitialLoading}
            onFirstModelLoaded={setIsFirstModelLoaded}
            onPreloadStart={() => setPreloadState(prev => ({ ...prev, isPreloading: true }))}
            onPreloadComplete={() => setPreloadState(prev => ({ ...prev, isPreloading: false }))}
            enableMaterialChanges={true}
            enableLightingChanges={true}
            enableRenderingChanges={true}
            enableCameraChanges={true}
            enableEffectChanges={true}
          />
        </div>

        {/* FBX 애니메이션 로직 */}
        <div style={{ display: 'none' }}>
          <AnimatedFBX 
            currentAnimation={uiState.currentFBXAnimation}
            currentModel={modelState.currentModel}
            onAnimationChange={(name) => uiManager.setCurrentFBXAnimation(name)}
            onLoadingChange={(loading) => uiManager.setIsFBXLoading(loading)}
            isModelLoading={isModelLoading}
          />
        </div>


      </div>

      {/* 우측 채팅 영역 */}
      <div className="absolute right-0 top-0 w-[48rem] h-screen flex flex-col z-20" style={{ backgroundColor: '#F5F8F9' }}>
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {messages.map((message, index) => (
            <ChatMessage 
              key={index} 
              message={message} 
              onPlayAudio={handleTextToSpeech}
              onMotionRequest={handleMotionData}
              currentLanguage={uiState.currentLanguage}
              isChatInputActive={isLoading}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Toast 메시지 */}
        {uiState.toastMessage && (
          <Toast
            message={uiState.toastMessage}
            onClose={() => uiManager.showToast(null)}
          />
        )}
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6" style={{ backgroundColor: '#F5F8F9' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-800 font-medium text-2xl">
              {uiState.currentLanguage === 'japanese' ? '💬 チャット (言語: 日本語)' :
               uiState.currentLanguage === 'english' ? '💬 Chat (Language: English)' :
               '💬 채팅 (언어: 한국어)'}
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  uiManager.setLanguage('korean');
                }}
                className={`px-4 py-2 rounded text-lg font-medium transition-all duration-200 border ${
                  uiState.currentLanguage === 'korean' 
                    ? 'bg-blue-500 text-white border-blue-400' 
                    : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                }`}
                title="한국어"
              >
                🇰🇷 한국어
              </button>
              <button
                type="button"
                onClick={() => {
                  uiManager.setLanguage('japanese');
                }}
                className={`px-4 py-2 rounded text-lg font-medium transition-all duration-200 border ${
                  uiState.currentLanguage === 'japanese' 
                    ? 'bg-blue-500 text-white border-blue-400' 
                    : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                }`}
                title={uiState.currentLanguage === 'japanese' ? '日本語翻訳モードが有効化されました' : uiState.currentLanguage === 'english' ? 'Activate Japanese translation mode' : '일본어 번역 모드 활성화'}
              >
                🇯🇵 {uiState.currentLanguage === 'japanese' ? '日本語 ON' : '일본어'}
              </button>
              <button
                type="button"
                onClick={() => {
                  uiManager.setLanguage('english');
                }}
                className={`px-4 py-2 rounded text-lg font-medium transition-all duration-200 border ${
                  uiState.currentLanguage === 'english' 
                    ? 'bg-blue-500 text-white border-blue-400' 
                    : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                }`}
                title={uiState.currentLanguage === 'english' ? 'English translation mode is activated' : 'Activate English translation mode'}
              >
                🇺🇸 {uiState.currentLanguage === 'english' ? 'English ON' : 'English'}
              </button>
            </div>
          </div>
          
          {/* 언어 모드 상태 표시 */}
          {uiState.currentLanguage !== 'korean' && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-4 text-blue-600 text-xl">
                <span>🌐</span>
                <span>
                              {uiState.currentLanguage === 'japanese' && '🌐 日本語翻訳モードが有効化されました'}
            {uiState.currentLanguage === 'english' && '🌐 English translation mode is activated'}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex gap-4">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                uiState.currentLanguage === 'japanese' ? "メッセージを入力してください..." :
                uiState.currentLanguage === 'english' ? "Type your message..." :
                "메시지를 입력하세요..."
              }
              className="flex-1 px-6 py-4 bg-white text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-xl"
              disabled={isLoading || isAnimationRunning || !isFirstModelLoaded || preloadState.isPreloading}
            />
            <button
              type="submit"
              disabled={isLoading || isAnimationRunning || !isFirstModelLoaded || preloadState.isPreloading}
              className={`px-6 py-4 rounded-lg text-xl font-medium transition-all duration-200 ${
                isLoading || isAnimationRunning || !isFirstModelLoaded || preloadState.isPreloading
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isLoading || isAnimationRunning
                ? (uiState.currentLanguage === 'japanese' ? '送信中...' : 
                   uiState.currentLanguage === 'english' ? 'Sending...' : '전송 중...') 
                : !isFirstModelLoaded || preloadState.isPreloading
                ? (uiState.currentLanguage === 'japanese' ? '🚀 서비스를 시작중입니다...' : 
                   uiState.currentLanguage === 'english' ? '🚀 Starting service...' : '🚀 서비스를 시작중입니다...')
                : (uiState.currentLanguage === 'japanese' ? '送信' : 
                   uiState.currentLanguage === 'english' ? 'Send' : '전송')
              }
            </button>
          </div>
        </form>
      </div>
      
      {/* 커스텀 슬라이더 스타일 */}
      <style jsx global>{`
        .lighting-slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffd700;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(255, 215, 0, 0.4);
        }
        
        .lighting-slider::-webkit-slider-thumb:hover {
          background: #ffed4a;
          transform: scale(1.1);
        }
        
        .lighting-slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffd700;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(255, 215, 0, 0.4);
        }
        
        .rendering-slider::-webkit-slider-thumb {
          appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.4);
        }
        
        .rendering-slider::-webkit-slider-thumb:hover {
          background: #dc2626;
          transform: scale(1.1);
        }
        
        .rendering-slider::-moz-range-thumb {
          height: 14px;
          width: 14px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.4);
        }
        
        /* 스크롤바 스타일링 */
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </main>
  );
}

/**
 * RenderingManager.js
 * 렌더링 관련 설정과 프리셋을 관리하는 매니저
 */

// Three.js core import
import * as THREE from 'three';

// WebGPU 렌더러 import 제거 (SSR 호환성 문제로 인해)
// import { WebGPURenderer } from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js';

// 후처리 안티앨리어싱 imports
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { TAARenderPass } from 'three/examples/jsm/postprocessing/TAARenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export class RenderingManager {
  constructor() {
    // 성능 감지 및 최적화 설정
    this.performanceMode = this.detectPerformanceMode();
    this.isLowEndDevice = this.performanceMode === 'low';
    
    console.log(`🚀 [RenderingManager] 성능 감지 결과: ${this.performanceMode} (저사양: ${this.isLowEndDevice})`);
    
    // 모델 로딩 시간 추적
    this.modelLoadTimes = {};
    this.performanceThreshold = 20000; // 5초 이상 로딩 시 저사양 모드
    
    // JSON 설정 파일에서 기본 설정 로드
    this.renderingConfig = null;
    this.defaultSettings = {};
    this.currentSettings = {};
    
    // 콜백 설정
    this.callbacks = {
      onPixelRatioChange: null,
      onShadowMapSizeChange: null,
      onRenderingModeChange: null,
      onTAAEnabledChange: null,
      onTAASampleLevelChange: null,
      onFXAAEnabledChange: null,
      onOutputColorSpaceChange: null,
      onToneMappingChange: null,
      onToneMappingExposureChange: null,
      onPerformanceModeChange: null,
      onPreferWebGPUChange: null
    };
    
    this.talkingHeadRef = null;
    
    // 초기화 (비동기)
    this.initialize();
  }

  // 초기화 메서드 (JSON 설정 로드)
  async initialize() {
    try {
      await this.loadRenderingConfig();
      this.applyPerformanceBasedSettings();
      
      // 로컬 스토리지에서 설정 복원
      const savedSettings = this.loadSettingsFromStorage();
      this.currentSettings = { ...this.defaultSettings, ...savedSettings };
      
      console.log('✅ [RenderingManager] 초기화 완료:', this.currentSettings);
    } catch (error) {
      console.error('❌ [RenderingManager] 초기화 실패:', error);
      // 폴백: 기본 설정 사용
      this.setFallbackSettings();
    }
  }



  // JSON 설정 파일 로드
  async loadRenderingConfig() {
    try {
      // rendering-default.json만 사용
      const response = await fetch('/presets/rendering-default.json');
      
      if (!response.ok) {
        throw new Error(`설정 파일 로드 실패: ${response.status}`);
      }
      
      this.renderingConfig = await response.json();
      console.log(`📁 [RenderingManager] rendering-default.json 로드 완료:`, this.renderingConfig.name);
      
      // 기본 설정 추출
      this.defaultSettings = { ...this.renderingConfig.settings };
      
    } catch (error) {
      console.warn('⚠️ [RenderingManager] JSON 설정 로드 실패, 폴백 설정 사용:', error);
      this.setFallbackSettings();
    }
  }

  // 폴백 설정 (JSON 로드 실패 시)
  setFallbackSettings() {
    this.defaultSettings = {
      pixelRatio: this.isLowEndDevice ? 0.8 : 1.0,
      shadowMapSize: 1024, // 고정
      antialias: true,
      renderingMode: 'standard',
      taaEnabled: !this.isLowEndDevice,
      taaSampleLevel: this.isLowEndDevice ? 2 : 3,
      fxaaEnabled: true,
      alpha: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
      premultipliedAlpha: false,
      outputColorSpace: 'srgb',
      toneMapping: 'aces',
      toneMappingExposure: 1.0,
      preferWebGPU: true,
      webGPUBackend: 'webgpu',
      fallbackToWebGL: true
    };
  }

  // 성능 기반 설정 적용
  applyPerformanceBasedSettings() {
    if (!this.renderingConfig || !this.renderingConfig.performance) return;
    
    const performanceSettings = this.renderingConfig.performance;
    
    if (this.isLowEndDevice && performanceSettings.lowEnd) {
      // 저사양 디바이스 설정 적용
      Object.assign(this.defaultSettings, performanceSettings.lowEnd);
      console.log('🔧 [RenderingManager] 저사양 디바이스 설정 적용');
    } else if (!this.isLowEndDevice && performanceSettings.highEnd) {
      // 고사양 디바이스 설정 적용
      Object.assign(this.defaultSettings, performanceSettings.highEnd);
      console.log('🔧 [RenderingManager] 고사양 디바이스 설정 적용');
    }
  }

  // 모델 로딩 시작 시간 기록
  startModelLoadTimer(modelName) {
    this.modelLoadTimes[modelName] = {
      startTime: Date.now(),
      isCompleted: false
    };
    console.log(`⏱️ [RenderingManager] ${modelName} 모델 로딩 시작 시간 기록`);
  }

  // 모델 로딩 완료 시간 기록 및 성능 분석
  completeModelLoadTimer(modelName) {
    if (this.modelLoadTimes[modelName]) {
      const loadTime = Date.now() - this.modelLoadTimes[modelName].startTime;
      this.modelLoadTimes[modelName].isCompleted = true;
      this.modelLoadTimes[modelName].loadTime = loadTime;
      
      console.log(`⏱️ [RenderingManager] ${modelName} 모델 로딩 완료: ${loadTime}ms`);
      
      // 로딩 시간이 길면 저사양 모드로 자동 전환
      if (loadTime > this.performanceThreshold) {
        console.log(`🐌 [RenderingManager] ${modelName} 로딩 시간이 ${this.performanceThreshold}ms 초과 - 저사양 모드 자동 전환`);
        this.autoSwitchToLowPerformance(modelName);
      }
    }
  }

  // 자동 저사양 모드 전환
  async autoSwitchToLowPerformance(modelName) {
    try {
      // 저사양 JSON 프리셋 로드
      const lowPreset = await this.loadLowPerformancePreset(modelName);
      if (lowPreset) {
        this.applySettings(lowPreset);
        console.log(`🚀 [RenderingManager] ${modelName} 저사양 프리셋 자동 적용 완료`);
        
        // 사용자에게 알림 (선택사항)
        if (this.callbacks.onPerformanceModeChange) {
          this.callbacks.onPerformanceModeChange('low', modelName);
        }
      }
    } catch (error) {
      console.warn(`⚠️ [RenderingManager] ${modelName} 저사양 프리셋 자동 적용 실패:`, error);
    }
  }

  // 저사양 JSON 프리셋 로드
  async loadLowPerformancePreset(modelName) {
    try {
      const response = await fetch(`/presets/${modelName}-rendering-low.json`);
      if (response.ok) {
        const lowPreset = await response.json();
        console.log(`📁 [RenderingManager] ${modelName} 저사양 프리셋 로드 성공`);
        return lowPreset;
      }
    } catch (error) {
      console.warn(`⚠️ [RenderingManager] ${modelName} 저사양 프리셋 로드 실패:`, error);
    }
    return null;
  }

  // 고성능 JSON 프리셋 로드
  async loadHighPerformancePreset(modelName) {
    try {
      const response = await fetch(`/presets/${modelName}-rendering-high.json`);
      if (response.ok) {
        const highPreset = await response.json();
        console.log(`📁 [RenderingManager] ${modelName} 고성능 프리셋 로드 성공`);
        return highPreset;
      }
    } catch (error) {
      console.warn(`⚠️ [RenderingManager] ${modelName} 고성능 프리셋 로드 실패:`, error);
    }
    return null;
  }

  // 성능 모드 감지
  detectPerformanceMode() {
    if (typeof window === 'undefined') return 'medium';
    
    try {
      // GPU 정보 확인
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) return 'low';
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        
        // 저사양 GPU 감지
        if (renderer.includes('Intel') || renderer.includes('UHD') || renderer.includes('HD Graphics')) {
          return 'low';
        }
        if (renderer.includes('AMD') && (renderer.includes('R3') || renderer.includes('R5') || renderer.includes('Vega'))) {
          return 'low';
        }
        if (renderer.includes('NVIDIA') && (renderer.includes('MX') || renderer.includes('GTX 1050') || renderer.includes('GTX 1060'))) {
          return 'medium';
        }
      }
      
      // 메모리 정보 확인
      if (navigator.deviceMemory) {
        if (navigator.deviceMemory < 4) return 'low';
        if (navigator.deviceMemory < 8) return 'medium';
        return 'high';
      }
      
      // CPU 코어 수 확인
      if (navigator.hardwareConcurrency) {
        if (navigator.hardwareConcurrency < 4) return 'low';
        if (navigator.hardwareConcurrency < 8) return 'medium';
        return 'high';
      }
      
      return 'medium';
    } catch (error) {
      console.warn('성능 감지 실패, 기본값 사용:', error);
      return 'medium';
    }
  }

  // WebGPU 지원 여부 확인
  isWebGPUSupported() {
    return typeof navigator !== 'undefined' && 
           typeof navigator.gpu !== 'undefined' && 
           this.currentSettings.preferWebGPU;
  }

  // 🚀 WebGPU 렌더러 생성 (실험적)
  async createWebGPURenderer(container) {
    try {
      console.log('🚀 [RenderingManager] WebGPU 렌더러 생성 시도...');
      
      if (!this.isWebGPUSupported()) {
        throw new Error('WebGPU not supported');
      }

      // WebGPURenderer import 제거로 인해 비활성화
      throw new Error('WebGPURenderer not available');
      
      // WebGPU 초기화
      await renderer.init();
      
      // 기본 설정 적용
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(this.currentSettings.pixelRatio);
      renderer.outputColorSpace = this.currentSettings.outputColorSpace;
      renderer.toneMapping = this.currentSettings.toneMapping;
      renderer.toneMappingExposure = this.currentSettings.toneMappingExposure;
      
      // 컨테이너에 추가
      container.appendChild(renderer.domElement);
      
      console.log('✅ [RenderingManager] WebGPU 렌더러 생성 성공!');
      return renderer;
      
    } catch (error) {
      console.warn('⚠️ [RenderingManager] WebGPU 렌더러 생성 실패, WebGL로 폴백:', error);
      return null;
    }
  }

  // 현재 렌더러 타입 반환
  getRendererType() {
    if (this.talkingHeadRef?.rendererRef?.current) {
      const renderer = this.talkingHeadRef.rendererRef.current;
      
      // WebGPU 렌더러 체크
      if (renderer.isWebGPURenderer && typeof renderer.isWebGPURenderer === 'function') {
        return 'WebGPU';
      } else if (renderer.type && renderer.type.includes('WebGPU')) {
        return 'WebGPU';
      }
      
      // WebGL 렌더러 체크
      if (renderer.isWebGLRenderer && typeof renderer.isWebGLRenderer === 'function') {
        return 'WebGL';
      } else if (renderer.type && renderer.type.includes('WebGL')) {
        return 'WebGL';
      }
    }
    return 'WebGL'; // 기본값
  }

  // 현재 성능 모드 반환
  getPerformanceMode() {
    return this.performanceMode;
  }

  // 저사양 디바이스 여부 확인
  isLowEndDevice() {
    return this.isLowEndDevice;
  }

  // 모델 로딩 시간 통계 반환
  getModelLoadStats() {
    return this.modelLoadTimes;
  }

  // 성능 임계값 설정
  setPerformanceThreshold(threshold) {
    this.performanceThreshold = threshold;
    console.log(`⚙️ [RenderingManager] 성능 임계값 설정: ${threshold}ms`);
  }

  // 렌더링 모드 프리셋 적용 (JSON 기반)
  applyRenderingModePreset(modeName) {
    if (!this.renderingConfig || !this.renderingConfig.renderingModes) {
      console.warn('⚠️ [RenderingManager] 렌더링 모드 설정이 없습니다');
      return;
    }
    
    const mode = this.renderingConfig.renderingModes[modeName];
    if (mode) {
      // 렌더링 모드 설정만 추출하여 적용
      const { name, emoji, description, ...modeSettings } = mode;
      this.applySettings(modeSettings);
      console.log(`🎨 [RenderingManager] ${mode.name} 렌더링 모드 적용:`, modeSettings);
    } else {
      console.warn(`⚠️ [RenderingManager] ${modeName} 렌더링 모드를 찾을 수 없습니다`);
    }
  }

  // 후처리 프리셋 적용 (JSON 기반)
  applyPostProcessingPreset(presetName) {
    if (!this.renderingConfig || !this.renderingConfig.postProcessingPresets) {
      console.warn('⚠️ [RenderingManager] 후처리 프리셋 설정이 없습니다');
      return;
    }
    
    const preset = this.renderingConfig.postProcessingPresets[presetName];
    if (preset) {
      // 후처리 설정만 추출하여 적용
      const { name, emoji, description, ...presetSettings } = preset;
      this.applySettings(presetSettings);
      console.log(`🎭 [RenderingManager] ${preset.name} 후처리 프리셋 적용:`, presetSettings);
    } else {
      console.warn(`⚠️ [RenderingManager] ${presetName} 후처리 프리셋을 찾을 수 없습니다`);
    }
  }

  // JSON에서 렌더링 모드 목록 가져오기
  getRenderingModes() {
    if (!this.renderingConfig || !this.renderingConfig.renderingModes) {
      return [];
    }
    
    return Object.entries(this.renderingConfig.renderingModes).map(([id, mode]) => ({
      id,
      ...mode
    }));
  }



  // JSON에서 후처리 프리셋 목록 가져오기
  getPostProcessingPresets() {
    if (!this.renderingConfig || !this.renderingConfig.postProcessingPresets) {
      return [];
    }
    
    return Object.entries(this.renderingConfig.postProcessingPresets).map(([id, preset]) => ({
      id,
      ...preset
    }));
  }

  // 콜백 등록
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
  
  // TalkingHead 참조 설정 (안티앨리어싱 직접 제어용)
  setTalkingHeadRef(talkingHeadRef) {
    this.talkingHeadRef = talkingHeadRef;
    console.log('🔗 [RenderingManager] TalkingHead 참조 등록됨');
  }

  // 모델별 설정 로드 (단순화)
  async loadPresetForModel(modelName) {
    try {
      // 모델 로딩 시작 시간 기록
      this.startModelLoadTimer(modelName);
      
      // 기본 설정으로 시작
      let preset = { ...this.defaultSettings };
      
      // 모델별 특별 설정이 있는지 확인
      const modelSpecificPreset = await this.loadModelSpecificPreset(modelName);
      if (modelSpecificPreset) {
        preset = { ...preset, ...modelSpecificPreset };
        console.log(`📁 [RenderingManager] ${modelName} 모델별 설정 적용:`, {
          pixelRatio: modelSpecificPreset.pixelRatio,
          shadowMapSize: modelSpecificPreset.shadowMapSize,
          taaEnabled: modelSpecificPreset.taaEnabled
        });
      }
      
      // 모델 로딩 완료 시간 기록
      this.completeModelLoadTimer(modelName);
      
      // 최종 적용될 설정 로그
      console.log(`🎯 [RenderingManager] ${modelName} 최종 프리셋 설정:`, {
        pixelRatio: preset.pixelRatio,
        shadowMapSize: preset.shadowMapSize,
        taaEnabled: preset.taaEnabled,
        taaSampleLevel: preset.taaSampleLevel,
        fxaaEnabled: preset.fxaaEnabled,
        isLowEndDevice: this.isLowEndDevice
      });
      
      return preset;
    } catch (error) {
      console.error('렌더링 프리셋 로드 오류:', error);
      return this.defaultSettings;
    }
  }

  // 모델별 특별 설정 로드
  async loadModelSpecificPreset(modelName) {
    try {
      // 기존 모델별 프리셋 파일 시도
      const response = await fetch(`/presets/${modelName}-rendering-high.json`);
      if (response.ok) {
        const preset = await response.json();
        console.log(`📁 [RenderingManager] ${modelName} 고성능 프리셋 로드 성공`);
        return preset;
      }
    } catch (error) {
      console.warn(`⚠️ [RenderingManager] ${modelName} 모델별 프리셋 로드 실패:`, error);
    }
    return null;
  }

  // 설정 적용 (렌더링 설정만)
  applySettings(settings) {
    // materialSettings와 lightingSettings 제외하고 렌더링 설정만 추출
    const { materialSettings, lightingSettings, ...renderingSettings } = settings;
    
    // 내부 상태 업데이트
    this.currentSettings = { ...this.currentSettings, ...renderingSettings };
    
    // 실제 렌더러에 설정 적용
    if (this.talkingHeadRef?.rendererRef?.current) {
      const renderer = this.talkingHeadRef.rendererRef.current;
      
      // 픽셀 비율 적용
      if (renderingSettings.pixelRatio !== undefined) {
        this.applyPixelRatio(renderer);
      }
      
      // 그림자 설정 적용 (1024로 고정)
      this.applyShadowSettings(renderer);
      
      // 색상 공간 및 톤 매핑 설정 적용
      if (renderingSettings.outputColorSpace !== undefined || renderingSettings.toneMapping !== undefined) {
        this.applyColorAndToneMappingSettings(renderer);
      }
      
      console.log('🎨 [RenderingManager] 렌더러에 설정 즉시 적용됨:', renderingSettings);
    }
    
    // 콜백을 통해 TalkingHead에 적용
    if (this.callbacks.onPixelRatioChange && renderingSettings.pixelRatio !== undefined) {
      this.callbacks.onPixelRatioChange(renderingSettings.pixelRatio);
    }
    if (this.callbacks.onShadowMapSizeChange && renderingSettings.shadowMapSize !== undefined) {
      this.callbacks.onShadowMapSizeChange(renderingSettings.shadowMapSize);
    }
    if (this.callbacks.onRenderingModeChange && renderingSettings.renderingMode !== undefined) {
      this.callbacks.onRenderingModeChange(renderingSettings.renderingMode);
    }
    
    // 로컬 스토리지에 저장
    this.saveSettingsToStorage();
  }

  // 현재 설정 반환
  getCurrentSettings() {
    return { ...this.currentSettings };
  }

  // WebGPU 우선 설정 변경
  setPreferWebGPU(value) {
    this.currentSettings.preferWebGPU = value;
    console.log(`🚀 [RenderingManager] WebGPU 우선 설정 변경: ${value}`);
    
    // 설정 저장
    this.saveSettingsToStorage();
    
    // 콜백 호출
    if (this.callbacks.onPreferWebGPUChange) {
      this.callbacks.onPreferWebGPUChange(value);
    }
    
    return this.currentSettings;
  }

  // 설정 업데이트 (UI에서 호출)
  updateSetting(property, value) {
    this.applySettings({ [property]: value });
    return this.currentSettings;
  }





  // 개별 설정 메서드들
  setPixelRatio(value) {
    this.currentSettings.pixelRatio = value;
    if (this.callbacks.onPixelRatioChange) {
      this.callbacks.onPixelRatioChange(value);
    }
    console.log('🖥️ [RenderingManager] 픽셀 비율 변경:', value);
  }

  setShadowMapSize(value) {
    // 그림자 품질은 1024로 고정
    this.currentSettings.shadowMapSize = 1024;
    if (this.callbacks.onShadowMapSizeChange) {
      this.callbacks.onShadowMapSizeChange(1024);
    }
    console.log('🌫️ [RenderingManager] 그림자 품질은 1024로 고정되어 있습니다');
  }

  setAntialias(value) {
    this.currentSettings.antialias = value;
    // 안티앨리어싱은 항상 true로 고정되므로 실제로는 무시됨
    console.log('💫 [RenderingManager] 안티앨리어싱은 항상 활성화되어 있습니다:', value);
  }



  setRenderingMode(value) {
    this.currentSettings.renderingMode = value;
    if (this.callbacks.onRenderingModeChange) {
      this.callbacks.onRenderingModeChange(value);
    }
    console.log('🎨 [RenderingManager] 렌더링 모드 변경:', value);
  }

  // 후처리 안티앨리어싱 메서드들 (통합)
  setTAAEnabled(enabled) {
    this.currentSettings.taaEnabled = enabled;
    
    // TalkingHead에 직접 적용
    if (this.talkingHeadRef?.setTAAEnabled) {
      this.talkingHeadRef.setTAAEnabled(enabled);
    }
    
    // 콜백 호출
    if (this.callbacks.onTAAEnabledChange) {
      this.callbacks.onTAAEnabledChange(enabled);
    }
    
    console.log('🕒 [RenderingManager] TAA 설정:', enabled);
  }
  
  setTAASampleLevel(level) {
    this.currentSettings.taaSampleLevel = level;
    
    // TalkingHead에 직접 적용
    if (this.talkingHeadRef?.setTAASampleLevel) {
      this.talkingHeadRef.setTAASampleLevel(level);
    }
    
    // 콜백 호출
    if (this.callbacks.onTAASampleLevelChange) {
      this.callbacks.onTAASampleLevelChange(level);
    }
    
    console.log('🕒 [RenderingManager] TAA Sample Level 설정:', level);
  }
  
  setFXAAEnabled(enabled) {
    this.currentSettings.fxaaEnabled = enabled;
    
    // TalkingHead에 직접 적용
    if (this.talkingHeadRef?.setFXAAEnabled) {
      this.talkingHeadRef.setFXAAEnabled(enabled);
    }
    
    // 콜백 호출
    if (this.callbacks.onFXAAEnabledChange) {
      this.callbacks.onFXAAEnabledChange(enabled);
    }
    
    console.log('⚡ [RenderingManager] FXAA 설정:', enabled);
  }
  
  // 후처리 안티앨리어싱 상태 가져오기
  getPostProcessingStatus() {
    // TalkingHead에서 실제 상태 가져오기
    if (this.talkingHeadRef?.getPostProcessingStatus) {
      const actualStatus = this.talkingHeadRef.getPostProcessingStatus();
      
      // 내부 상태와 동기화
      this.currentSettings.taaEnabled = actualStatus.taaEnabled;
      this.currentSettings.taaSampleLevel = actualStatus.taaSampleLevel;
      this.currentSettings.fxaaEnabled = actualStatus.fxaaEnabled;
      
      return actualStatus;
    }
    
    // 폴백: 내부 상태 반환
    return {
      taaEnabled: this.currentSettings.taaEnabled,
      taaSampleLevel: this.currentSettings.taaSampleLevel,
      fxaaEnabled: this.currentSettings.fxaaEnabled
    };
  }
  
  // 후처리 안티앨리어싱 설정 일괄 업데이트
  updatePostProcessingSettings(settings) {
    if (settings.taaEnabled !== undefined) {
      this.setTAAEnabled(settings.taaEnabled);
    }
    if (settings.taaSampleLevel !== undefined) {
      this.setTAASampleLevel(settings.taaSampleLevel);
    }
    if (settings.fxaaEnabled !== undefined) {
      this.setFXAAEnabled(settings.fxaaEnabled);
    }
    
    console.log('�� [RenderingManager] 후처리 안티앨리어싱 일괄 업데이트:', settings);
  }
  
  // 색상 공간 제어
  setOutputColorSpace(colorSpace) {
    this.currentSettings.outputColorSpace = colorSpace;
    
    // TalkingHead에 직접 적용
    if (this.talkingHeadRef?.setOutputColorSpace) {
      this.talkingHeadRef.setOutputColorSpace(colorSpace);
    }
    
    // 콜백 호출
    if (this.callbacks.onOutputColorSpaceChange) {
      this.callbacks.onOutputColorSpaceChange(colorSpace);
    }
    
    console.log('🌈 [RenderingManager] 색상 공간 설정:', colorSpace);
  }
  
  // 톤 매핑 제어
  setToneMapping(toneMapping) {
    this.currentSettings.toneMapping = toneMapping;
    
    // TalkingHead에 직접 적용
    if (this.talkingHeadRef?.setToneMapping) {
      this.talkingHeadRef.setToneMapping(toneMapping);
    }
    
    // 콜백 호출
    if (this.callbacks.onToneMappingChange) {
      this.callbacks.onToneMappingChange(toneMapping);
    }
    
    console.log('🎭 [RenderingManager] 톤 매핑 설정:', toneMapping);
  }
  
  // 톤 매핑 노출 제어
  setToneMappingExposure(exposure) {
    this.currentSettings.toneMappingExposure = exposure;
    
    // TalkingHead에 직접 적용
    if (this.talkingHeadRef?.setToneMappingExposure) {
      this.talkingHeadRef.setToneMappingExposure(exposure);
    }
    
    // 콜백 호출
    if (this.callbacks.onToneMappingExposureChange) {
      this.callbacks.onToneMappingExposureChange(exposure);
    }
    
    console.log('🌟 [RenderingManager] 톤 매핑 노출 설정:', exposure);
  }
  
  // 렌더러 설정 가져오기 (TalkingHead 초기화용)
  getRendererSettings() {
    return {
      antialias: this.currentSettings.antialias,
      alpha: this.currentSettings.alpha,
      powerPreference: this.currentSettings.powerPreference,
      stencil: this.currentSettings.stencil,
      depth: this.currentSettings.depth,
      preserveDrawingBuffer: this.currentSettings.preserveDrawingBuffer,
      failIfMajorPerformanceCaveat: this.currentSettings.failIfMajorPerformanceCaveat,
      premultipliedAlpha: this.currentSettings.premultipliedAlpha,
      outputColorSpace: this.currentSettings.outputColorSpace,
      toneMapping: this.currentSettings.toneMapping,
      toneMappingExposure: this.currentSettings.toneMappingExposure
    };
  }

  // 렌더러 생성 및 초기화 (동기 버전 - TalkingHead.js에서 호출)
  createRendererSync(container) {
    console.log('🖥️ [RenderingManager] 렌더러 생성 시작 (동기)');
    
    // WebGL 렌더러만 사용 (WebGPU는 비동기이므로 제외)
    console.log('🖥️ [RenderingManager] WebGL 렌더러 생성...');
    const renderer = new THREE.WebGLRenderer({ 
      antialias: this.currentSettings.antialias,
      alpha: this.currentSettings.alpha,
      powerPreference: this.currentSettings.powerPreference,
      stencil: this.currentSettings.stencil,
      depth: this.currentSettings.depth,
      preserveDrawingBuffer: this.currentSettings.preserveDrawingBuffer,
      failIfMajorPerformanceCaveat: this.currentSettings.failIfMajorPerformanceCaveat,
      premultipliedAlpha: this.currentSettings.premultipliedAlpha
    });
    console.log('✅ [RenderingManager] WebGL 렌더러 생성 완료');
    
    console.log('🖥️ [RenderingManager] 렌더러 설정 적용:', this.currentSettings);
    
    // 픽셀 비율 설정
    this.applyPixelRatio(renderer);
    
    // 그림자 설정
    this.applyShadowSettings(renderer);
    
    // 색상 공간 및 톤 매핑 설정
    this.applyColorAndToneMappingSettings(renderer);
    
    // 렌더러 크기 설정
    if (container) {
      renderer.setSize(container.clientWidth, container.clientHeight);
      console.log(`🖥️ [RenderingManager] 렌더러 크기 설정: ${container.clientWidth}x${container.clientHeight}`);
    }
    
    // 렌더러를 컨테이너에 추가
    container.appendChild(renderer.domElement);
    
    console.log('✅ [RenderingManager] 렌더러 초기화 완료 (동기)');
    return renderer;
  }

  // 렌더러 생성 및 초기화 (비동기 버전 - WebGPU 지원)
  async createRenderer(container) {
    console.log('🖥️ [RenderingManager] 렌더러 생성 시작');
    
    let renderer = null;
    
    // WebGPU 우선 시도 (성능 향상을 위해 강력 권장)
    if (this.currentSettings.preferWebGPU && typeof navigator.gpu !== 'undefined') {
      try {
        console.log('🚀 [RenderingManager] WebGPU 렌더러 생성 시도 (성능 향상 권장)...');
        renderer = await this.createWebGPURenderer(container);
        
        if (renderer) {
          console.log('✅ [RenderingManager] WebGPU 렌더러 생성 성공! 성능이 크게 향상됩니다!');
          return renderer;
        }
      } catch (error) {
        console.warn('⚠️ [RenderingManager] WebGPU 렌더러 생성 실패, WebGL로 폴백:', error);
        renderer = null;
      }
    }
    
    // WebGPU 실패 시 WebGL 사용 (성능 저하)
    if (!renderer) {
      console.warn('⚠️ [RenderingManager] WebGPU 사용 불가 - WebGL로 폴백 (성능 저하)');
      renderer = new THREE.WebGLRenderer({ 
        antialias: this.currentSettings.antialias,
        alpha: this.currentSettings.alpha,
        powerPreference: this.currentSettings.powerPreference,
        stencil: this.currentSettings.stencil,
        depth: this.currentSettings.depth,
        preserveDrawingBuffer: this.currentSettings.preserveDrawingBuffer,
        failIfMajorPerformanceCaveat: this.currentSettings.failIfMajorPerformanceCaveat,
        premultipliedAlpha: this.currentSettings.premultipliedAlpha
      });
      console.log('✅ [RenderingManager] WebGL 렌더러 생성 완료 (WebGPU 사용 권장)');
    }
    
    console.log('🖥️ [RenderingManager] 렌더러 설정 적용:', this.currentSettings);
    
    // 픽셀 비율 설정
    this.applyPixelRatio(renderer);
    
    // 그림자 설정
    this.applyShadowSettings(renderer);
    
    // 색상 공간 및 톤 매핑 설정
    this.applyColorAndToneMappingSettings(renderer);
    
    // 렌더러 크기 설정
    if (container) {
      renderer.setSize(container.clientWidth, container.clientHeight);
      console.log(`🖥️ [RenderingManager] 렌더러 크기 설정: ${container.clientWidth}x${container.clientHeight}`);
    }
    
    // DOM에 추가
    if (container) {
      container.appendChild(renderer.domElement);
    }
    
    console.log('✅ [RenderingManager] 렌더러 생성 및 초기화 완료');
    return renderer;
  }

  // 픽셀 비율 적용
  applyPixelRatio(renderer) {
    const devicePixelRatio = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
    
    // JSON 설정을 우선하고, 없으면 디바이스 기본값 사용 (최소 2배 강제 제거)
    let pixelRatio = this.currentSettings.pixelRatio;
    
    if (pixelRatio === undefined || pixelRatio === null) {
      // JSON에 설정이 없으면 디바이스 기본값 사용
      pixelRatio = devicePixelRatio;
    }
    
    // 최대값 제한 (성능 보호)
    pixelRatio = Math.min(pixelRatio, 4);
    
    renderer.setPixelRatio(pixelRatio);
    console.log(`🖥️ [RenderingManager] 픽셀 비율 설정: ${pixelRatio} (JSON: ${this.currentSettings.pixelRatio}, 디바이스: ${devicePixelRatio})`);
  }

  // 그림자 설정 적용 (1024로 고정)
  applyShadowSettings(renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMapSize = 1024; // 그림자 품질 고정
    console.log('🖥️ [RenderingManager] 그림자 설정: 1024 품질로 고정');
  }

  // 색상 공간 및 톤 매핑 설정 적용
  applyColorAndToneMappingSettings(renderer) {
    // 색상 공간 설정
    if (this.currentSettings.outputColorSpace === 'srgb') {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if (this.currentSettings.outputColorSpace === 'linear') {
      renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    } else {
      renderer.outputColorSpace = THREE.SRGBColorSpace; // 기본값
    }
    
    // 톤 매핑 설정
    if (this.currentSettings.toneMapping === 'aces') {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
    } else if (this.currentSettings.toneMapping === 'reinhard') {
      renderer.toneMapping = THREE.ReinhardToneMapping;
    } else if (this.currentSettings.toneMapping === 'cineon') {
      renderer.toneMapping = THREE.CineonToneMapping;
    } else if (this.currentSettings.toneMapping === 'linear') {
      renderer.toneMapping = THREE.LinearToneMapping;
    } else {
      renderer.toneMapping = THREE.NoToneMapping; // 기본값
    }
    
    renderer.toneMappingExposure = this.currentSettings.toneMappingExposure || 1.0;
    
    console.log('🖥️ [RenderingManager] 색상/톤매핑 설정:', {
      outputColorSpace: this.currentSettings.outputColorSpace,
      toneMapping: this.currentSettings.toneMapping,
      toneMappingExposure: this.currentSettings.toneMappingExposure
    });
  }

  // 후처리 컴포저 생성 및 설정
  createPostProcessingComposer(renderer, scene, camera) {
    const composer = new EffectComposer(renderer);
    
    // 기본 렌더 패스
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // TAA (Temporal Anti-Aliasing) 패스
    const taaPass = new TAARenderPass(scene, camera);
    taaPass.enabled = this.currentSettings.taaEnabled;
    taaPass.sampleLevel = this.currentSettings.taaSampleLevel;
    composer.addPass(taaPass);

    // FXAA 패스
    const fxaaPass = new ShaderPass(FXAAShader);
    const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const height = typeof window !== 'undefined' ? window.innerHeight : 1080;
    fxaaPass.material.uniforms['resolution'].value.x = 1 / width;
    fxaaPass.material.uniforms['resolution'].value.y = 1 / height;
    fxaaPass.enabled = this.currentSettings.fxaaEnabled;
    composer.addPass(fxaaPass);

    // 최종 출력 패스
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    console.log('🎨 [RenderingManager] 후처리 컴포저 생성 완료:', {
      TAA: taaPass.enabled,
      FXAA: fxaaPass.enabled,
      sampleLevel: taaPass.sampleLevel,
      resolution: `${width}x${height}`
    });

    // 컴포저와 패스들을 저장해서 나중에 제어할 수 있도록 함
    composer.taaPass = taaPass;
    composer.fxaaPass = fxaaPass;

    return composer;
  }

  // 후처리 설정 업데이트 (기존 컴포저에 적용)
  updatePostProcessingSettings(composer, settings) {
    if (!composer || !settings) return;

    const { taaPass, fxaaPass } = composer;

    if (taaPass) {
      if (settings.taaEnabled !== undefined) taaPass.enabled = settings.taaEnabled;
      if (settings.taaSampleLevel !== undefined) taaPass.sampleLevel = settings.taaSampleLevel;
    }

    if (fxaaPass && settings.fxaaEnabled !== undefined) {
      fxaaPass.enabled = settings.fxaaEnabled;
    }

    console.log('🎨 [RenderingManager] 후처리 설정 업데이트:', settings);
  }

  // 후처리 해상도 업데이트 (리사이즈 시 호출)
  updatePostProcessingResolution(composer, width, height) {
    if (!composer) return;

    composer.setSize(width, height);

    // FXAA 해상도 업데이트
    const { fxaaPass } = composer;
    if (fxaaPass && fxaaPass.material && fxaaPass.material.uniforms && fxaaPass.material.uniforms.resolution) {
      fxaaPass.material.uniforms['resolution'].value.x = 1 / width;
      fxaaPass.material.uniforms['resolution'].value.y = 1 / height;
    }

    console.log(`🔄 [RenderingManager] 후처리 해상도 업데이트: ${width}x${height}`);
  }

  // 설정 저장 (다운로드)
  downloadSettings(currentSettings, modelName = 'custom') {
    const data = {
      rendering: currentSettings,
      timestamp: new Date().toISOString(),
      model: modelName
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${modelName}-rendering-settings.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 설정을 로컬 스토리지에 저장
  saveSettingsToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('renderingSettings', JSON.stringify(this.currentSettings));
        console.log('💾 [RenderingManager] 설정 저장됨');
      }
    } catch (error) {
      console.warn('💾 [RenderingManager] 설정 저장 실패:', error);
    }
  }

  // 로컬 스토리지에서 설정 복원
  loadSettingsFromStorage() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return {};
      }
      const saved = localStorage.getItem('renderingSettings');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn('💾 [RenderingManager] 설정 복원 실패:', error);
      return {};
    }
  }
}

// 싱글톤 인스턴스
export const renderingManager = new RenderingManager();

/**
 * ModelManager.js
 * 모델 관련 상태와 설정을 관리하는 매니저
 * - 모델 로드 로직과 타이밍 제어 포함
 */

import { ModelLoader } from './ModelLoader.js';
import * as THREE from 'three';

export class ModelManager {
  constructor() {
    this.currentModel = 'woman'; // 🎯 초기 모델을 woman으로 설정
    this.isSkeletonVisible = false;
    this.qualityMode = 'standard';
    this.currentBackground = 'gradient';
    this.cameraFOV = 60;
    this.isLoading = false;
    this.isFirstModelLoad = true;
    
    // 🔒 모델 로드 중복 호출 방지를 위한 타임스탬프
    this.lastLoadTime = null;
    
    // ModelLoader 인스턴스
    this.modelLoader = new ModelLoader();
    
    this.effectStates = {
      handTrail: false,
      particle: false,
      floor: true,
      eyeTracking: true  // 기본적으로 활성화
    };

    this.callbacks = {
      onModelChange: null,
      onSkeletonToggle: null,
      onQualityChange: null,

      onEffectToggle: null,
      onCameraFOVChange: null,
      onModelLoadingChange: null,
      onModelLoadComplete: null
    };

    // TalkingHead 콜백들 (모델 설정용)
    this.talkingHeadCallbacks = null;
    
    // 🗄️ 이전 설정 캐싱 (모델 변경 시 복원용)
    this.cachedSettings = {
      rendering: null,
      material: null,
      animation: null
    };
    
    // 🎯 대기 중인 메터리얼 설정 (모델 로드 후 적용용)
    this.pendingMaterialSettings = null;
  }

  // 콜백 등록
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // TalkingHead 콜백 등록
  setTalkingHeadCallbacks(callbacks) {
    this.talkingHeadCallbacks = callbacks;
    console.log('🔗 [ModelManager] TalkingHead 콜백 등록 완료');
  }

  // 모델 변경
  setCurrentModel(modelName) {
    // 🚀 모델 변경 시 캐시 정리 (THREE.Cache.enabled = true로 인한 문제 방지)
    if (this.currentModel !== modelName) {
      this.clearModelCache();
    }
    
    this.currentModel = modelName;
    if (this.callbacks.onModelChange) {
      this.callbacks.onModelChange(modelName);
    }
    return this.currentModel;
  }

  // 🚀 모델 캐시 정리 함수
  clearModelCache() {
    try {
      // Three.js 캐시에서 현재 모델 관련 리소스 정리
      if (THREE.Cache.enabled) {
        console.log('🧹 [ModelManager] 모델 변경으로 인한 캐시 정리 시작');
        
        // 캐시된 리소스들 확인 및 정리
        const cacheKeys = Object.keys(THREE.Cache.files);
        let clearedCount = 0;
        
        cacheKeys.forEach(key => {
          // 현재 모델과 관련된 리소스만 정리
          if (key.includes(this.currentModel) || key.includes('model') || key.includes('texture')) {
            delete THREE.Cache.files[key];
            clearedCount++;
          }
        });
        
        console.log(`🧹 [ModelManager] 캐시 정리 완료: ${clearedCount}개 리소스 제거`);
        
        // 가비지 컬렉션 유도
        if (window.gc) {
          window.gc();
        }
      }
    } catch (error) {
      console.warn('🧹 [ModelManager] 캐시 정리 중 오류:', error);
    }
  }

  // 스켈레톤 토글
  toggleSkeleton() {
    this.isSkeletonVisible = !this.isSkeletonVisible;
    if (this.callbacks.onSkeletonToggle) {
      this.callbacks.onSkeletonToggle(this.isSkeletonVisible);
    }
    return this.isSkeletonVisible;
  }

  // 품질 모드 변경
  setQualityMode(mode) {
    this.qualityMode = mode;
    if (this.callbacks.onQualityChange) {
      this.callbacks.onQualityChange(mode);
    }
    return this.qualityMode;
  }




  // 효과 토글
  toggleEffect(effectType) {
    this.effectStates[effectType] = !this.effectStates[effectType];
    if (this.callbacks.onEffectToggle) {
      this.callbacks.onEffectToggle(effectType, this.effectStates[effectType]);
    }
    return this.effectStates;
  }



  // ===== 모델 로드 로직 =====
  
  // 통합 모델 로드 함수 (TalkingHead에서 호출)
  async loadModel(modelName, sceneRef) {
    console.log('🎯 [ModelManager] loadModel 호출:', {
      modelName,
      currentModel: this.currentModel,
      isFirstLoad: this.isFirstModelLoad,
      isLoading: this.isLoading
    });
    
    // 🔒 이미 같은 모델이 로드되어 있으면 스킵
    if (this.currentModel === modelName && this.currentModel !== null && !this.isLoading) {
      console.log('✅ [ModelManager] 같은 모델이 이미 로드됨, 스킵:', modelName);
      return;
    }
    
    // 🔒 첫 번째 모델 로드 중복 방지
    if (this.isFirstModelLoad && this.currentModel === modelName) {
      console.log('⚠️ [ModelManager] 첫 번째 모델이 이미 로드 중이거나 완료됨, 스킵:', modelName);
      return;
    }
    
    // 🔒 로딩 중 중복 호출 방지 (추가 보호)
    if (this.isLoading) {
      console.log('🚫 [ModelManager] 이미 모델 로딩 중, 중복 호출 차단:', modelName);
      return;
    }
    
    // 🔒 빠른 연속 호출 방지 (최소 300ms 간격)
    const now = Date.now();
    if (this.lastLoadTime && (now - this.lastLoadTime) < 300) {
      console.log('🚫 [ModelManager] 너무 빠른 연속 호출, 차단:', modelName, `(${now - this.lastLoadTime}ms)`);
      return;
    }
    this.lastLoadTime = now;
    
    // 로딩 상태 시작
    this.setLoadingState(true);
    
    try {
      if (this.isFirstModelLoad || this.currentModel === null) {
        await this.loadFirstModel(modelName, sceneRef);
      } else {
        await this.switchModel(modelName, sceneRef);
      }
    } catch (error) {
      console.error('❌ [ModelManager] 모델 로드 실패:', error);
      this.setLoadingState(false);
      throw error;
    }
  }

  // 첫 번째 모델 로드 (완전 처리)
  async loadFirstModel(modelName, sceneRef) {
    console.log('🎯 [ModelManager] 첫 번째 모델 로드 시작:', modelName);
    
    try {
      // sceneRef 안전성 체크
      if (!sceneRef || !sceneRef.current) {
        console.error('❌ [ModelManager] sceneRef가 초기화되지 않았습니다.');
        throw new Error('Scene not initialized');
      }

      // 🔧 1단계: 모든 설정 완료까지 대기 (첫 모델도 동일하게)
      console.log('🔧 [ModelManager] 첫 모델 로드: 1단계 - 모든 설정 완료까지 대기...');
                     // 🎯 첫 모델 로드 후에도 JSON 라이팅 및 메터리얼 설정 적용 (switchModel과 동일하게)
      if (window.lightingManager) {
        console.log(`💡 [ModelManager] 첫 모델 ${modelName} 로드 완료, JSON 라이팅 설정 시작`);
      
        try {
          // JSON 기반 모델별 조명 설정 로드 (자동 적용됨)
          const lightingSettings = await window.lightingManager.loadPresetForModel(modelName);
          console.log(`✅ [ModelManager] 첫 모델 ${modelName} JSON 라이팅 설정 완료`);
      
          // 🎯 UI 동기화를 위한 이벤트 발생
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            const event = new CustomEvent('lightingSettingsUpdated', {
              detail: {
                settings: lightingSettings,
                source: 'json',
                modelName: modelName
              }
            });
            window.dispatchEvent(event);
            console.log(`🔄 [ModelManager] 첫 모델 UI 동기화 이벤트 발생: ${modelName}`);
          }
        } catch (error) {
          console.error(`❌ [ModelManager] 첫 모델 ${modelName} JSON 라이팅 설정 실패:`, error);
        }
      }

      // 🎯 첫 모델 로드 후에도 JSON 메터리얼 설정 적용 (모델 로드 완료 후)
      if (window.materialManager) {
        console.log(`🎨 [ModelManager] 첫 모델 ${modelName} 로드 완료, JSON 메터리얼 설정 시작`);
      
        try {
          const materialSettings = await window.materialManager.loadPresetForModel(modelName);
          console.log(`✅ [ModelManager] 첫 모델 ${modelName} JSON 메터리얼 설정 로드 완료`);
          
          // 메터리얼 설정은 모델이 로드된 후에 적용 (아래에서 처리)
          this.pendingMaterialSettings = materialSettings;
          
        } catch (error) {
          console.error(`❌ [ModelManager] 첫 모델 ${modelName} JSON 메터리얼 설정 실패:`, error);
        }
      }
      
      // 🎯 카메라 위치 자동 조정 (모델별)
      if (window.cameraManager) {
        console.log(`📷 [ModelManager] 첫 모델 ${modelName} 로드 완료, 카메라 위치 자동 조정 시작`);
        try {
          window.cameraManager.setModel(modelName);
          console.log(`✅ [ModelManager] 첫 모델 ${modelName} 카메라 위치 자동 조정 완료`);
        } catch (error) {
          console.error(`❌ [ModelManager] 첫 모델 ${modelName} 카메라 위치 조정 실패:`, error);
        }
      }
        
      // 1단계: 모든 설정을 완전히 준비
      let preparedSettings = null;
      if (this.talkingHeadCallbacks) {
        preparedSettings = await this.talkingHeadCallbacks.prepareAllSettingsForModel(modelName);
        console.log('✅ [ModelManager] 첫 모델용 모든 설정 준비 완료:', preparedSettings);
      }
      
      // 2단계: 설정이 완료된 후에만 모델 로드 시작
      console.log('🚀 [ModelManager] 첫 모델 로드: 2단계 - 설정 완료됨, 모델 로드 시작...');
      
      const tempGroup = new THREE.Group();
      tempGroup.visible = false;
      sceneRef.current.add(tempGroup);
      
      // 모델 로드
      const modelData = await this.modelLoader.loadModel(modelName, tempGroup);
      console.log('✅ [ModelManager] 첫 모델 로드 완료 - 모든 설정이 이미 적용된 상태');
      
      // 첫 번째 모델을 씬에 직접 추가 (이름과 userData 설정)
      tempGroup.remove(modelData.model);
      modelData.model.name = modelName; // 이름 설정
      modelData.model.userData.modelName = modelName; // userData에 모델명 저장
      sceneRef.current.add(modelData.model);
      modelData.model.visible = true;
      
      // 🎯 모델 로드 완료 후 메터리얼 설정 적용
      if (window.materialManager && this.pendingMaterialSettings) {
        try {
          // MaterialManager에 모델 설정
          window.materialManager.setCurrentModel(modelData.model);
          console.log(`✅ [ModelManager] MaterialManager에 모델 설정 완료: ${modelName}`);
          
          // 메터리얼 설정 적용
          window.materialManager.applySettings(this.pendingMaterialSettings);
          console.log(`✅ [ModelManager] 첫 모델 ${modelName} JSON 메터리얼 설정 완료`);
          
          // UI 동기화를 위한 이벤트 발생 및 localStorage 저장
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            let individual = {};
            try {
              individual = this.pendingMaterialSettings.individualMaterial || {};
              console.log(`🎨 [ModelManager] 첫 모델 ${modelName} 개별 메터리얼 설정:`, individual);
              // per model localStorage 저장 (개별 패널 복원용)
              localStorage.setItem(`individualMaterial_${modelName}`, JSON.stringify(individual));
              console.log(`💾 [ModelManager] 첫 모델 ${modelName} 개별 메터리얼 설정 localStorage 저장 완료`);
            } catch (e) {
              console.error(`❌ [ModelManager] 첫 모델 ${modelName} localStorage 저장 실패:`, e);
            }
            const event = new CustomEvent('materialSettingsUpdated', {
              detail: {
                settings: this.pendingMaterialSettings,
                individualMaterial: individual,
                source: 'json',
                modelName: modelName
              }
            });
            window.dispatchEvent(event);
            console.log(`🔄 [ModelManager] 첫 모델 머티리얼 UI 동기화 이벤트 발생: ${modelName}`);
          }
          
          // pendingMaterialSettings 정리
          this.pendingMaterialSettings = null;
        } catch (error) {
          console.error(`❌ [ModelManager] 첫 모델 ${modelName} 메터리얼 설정 적용 실패:`, error);
        }
      }
      
      if (modelData.skeletonHelper) {
        tempGroup.remove(modelData.skeletonHelper);
        sceneRef.current.add(modelData.skeletonHelper);
      }
      
      // tempGroup 정리
      sceneRef.current.remove(tempGroup);
      
      // TalkingHead 설정 직접 호출 (이미 모든 설정이 적용된 상태)
      if (this.talkingHeadCallbacks) {
        await this.setupTalkingHeadModel(modelData, modelName, true); // skipPreparedSettings = true
      }
      
      // 상태 업데이트
      this.currentModel = modelName;
      this.isFirstModelLoad = false;
      
      console.log('✅ [ModelManager] 첫 번째 모델 로드 + 설정 완료:', modelName);
      
      // 콜백 호출
      if (this.callbacks.onModelChange) {
        this.callbacks.onModelChange(modelName);
      }
      if (this.callbacks.onModelLoadComplete) {
        this.callbacks.onModelLoadComplete(modelName);
      }
      
      return modelData;
      
    } finally {
      this.setLoadingState(false);
    }
  }

  // 모델 교체 (완전 처리)
  async switchModel(modelName, sceneRef) {
    console.log('🔄 [ModelManager] 모델 교체 시작:', {
      from: this.currentModel,
      to: modelName
    });
    
    try {
      // sceneRef 안전성 체크
      if (!sceneRef || !sceneRef.current) {
        console.error('❌ [ModelManager] sceneRef가 초기화되지 않았습니다.');
        throw new Error('Scene not initialized');
      }
      

      
      const tempGroup = new THREE.Group();
      tempGroup.visible = false;
      sceneRef.current.add(tempGroup);
      
      // 🔧 1단계: 모든 설정을 완전히 준비
      console.log('🔧 [ModelManager] 1단계: 모든 설정 완료까지 대기...');
      
      // 1단계: 모든 설정을 완전히 준비
      let preparedSettings = null;
      if (this.talkingHeadCallbacks) {
        preparedSettings = await this.talkingHeadCallbacks.prepareAllSettingsForModel(modelName);
        console.log('✅ [ModelManager] 모든 설정 준비 완료:', preparedSettings);
      }
      
      // 2단계: 설정이 완료된 후에만 모델 로드 시작
      console.log('🚀 [ModelManager] 2단계: 설정 완료됨, 모델 로드 시작...');
      const modelData = await this.modelLoader.loadModel(modelName, tempGroup);
      console.log('✅ [ModelManager] 모델 로드 완료 - 모든 설정이 이미 적용된 상태');
      console.log('✅ [ModelManager] 모델 로드 완료 - 모든 설정이 이미 적용된 상태');
      // 이전 모델 찾아서 제거 (더 정확한 검색)
      let previousModel = null;
      
      // 1. 이름으로 검색
      previousModel = sceneRef.current.getObjectByName(this.currentModel);
      
      // 2. 이름으로 못 찾으면 현재 모델 참조로 검색
      if (!previousModel && this.currentModel) {
        sceneRef.current.traverse((child) => {
          if (child.userData && child.userData.modelName === this.currentModel) {
            previousModel = child;
          }
        });
      }
      
      // 3. 여전히 못 찾으면 첫 번째 모델로 가정 (scene의 첫 번째 자식)
      if (!previousModel && sceneRef.current.children.length > 0) {
        const firstChild = sceneRef.current.children[0];
        if (firstChild.type === 'Group' && firstChild !== tempGroup) {
          previousModel = firstChild;
        }
      }
      
      // 🎯 새 모델을 tempGroup에서 준비 (아직 씬에 추가하지 않음)
      tempGroup.remove(modelData.model);
      modelData.model.name = modelName; // 이름 설정
      modelData.model.userData.modelName = modelName; // userData에 모델명 저장
      
            // 🎯 새 모델이 준비된 후 JSON 라이팅 및 메터리얼 설정 미리 적용
      if (window.lightingManager) {
        console.log(`💡 [ModelManager] ${modelName} 모델 준비 완료, JSON 라이팅 설정 시작`);
      
        try {
          // JSON 기반 모델별 조명 설정 로드 (자동 적용됨)
          const lightingSettings = await window.lightingManager.loadPresetForModel(modelName);
          console.log(`✅ [ModelManager] ${modelName} JSON 라이팅 설정 완료`);
      
          // 🎯 UI 동기화를 위한 이벤트 발생
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            const event = new CustomEvent('lightingSettingsUpdated', {
              detail: {
                settings: lightingSettings,
                source: 'json',
                modelName: modelName
              }
            });
            window.dispatchEvent(event);
            console.log(`🔄 [ModelManager] UI 동기화 이벤트 발생: ${modelName}`);
          }
        } catch (error) {
          console.error(`❌ [ModelManager] ${modelName} JSON 라이팅 설정 실패:`, error);
        }
      }

      // 🎯 JSON 개별 메터리얼 설정 로드 + UI 동기화 이벤트
      if (window.materialManager) {
        console.log(`🎨 [ModelManager] ${modelName} 모델 준비 완료, JSON 개별 메터리얼 설정 시작`);
      
        try {
          const materialSettings = await window.materialManager.loadPresetForModel(modelName);
          console.log(`✅ [ModelManager] ${modelName} JSON 개별 메터리얼 설정 로드 완료`);
          
          // 메터리얼 설정은 모델이 로드된 후에 적용 (아래에서 처리)
          this.pendingMaterialSettings = materialSettings;
          
        } catch (error) {
          console.error(`❌ [ModelManager] ${modelName} JSON 개별 메터리얼 설정 실패:`, error);
        }
      }
      
      // 🎯 카메라 위치 자동 조정 (모델별)
      if (window.cameraManager) {
        console.log(`📷 [ModelManager] ${modelName} 모델 준비 완료, 카메라 위치 자동 조정 시작`);
        try {
          window.cameraManager.setModel(modelName);
          console.log(`✅ [ModelManager] ${modelName} 카메라 위치 자동 조정 완료`);
        } catch (error) {
          console.error(`❌ [ModelManager] ${modelName} 카메라 위치 조정 실패:`, error);
        }
      }
      
      // 🎯 부드러운 모델 전환: 새 모델을 먼저 추가한 후 이전 모델 제거
      console.log('🔄 [ModelManager] 부드러운 모델 전환 시작');
      
      // 1단계: 새 모델을 씬에 추가 (이전 모델은 아직 유지)
      sceneRef.current.add(modelData.model);
      modelData.model.visible = true;
      console.log('✅ [ModelManager] 새 모델 씬에 추가 완료');
      
      // 🎯 모델 로드 완료 후 메터리얼 설정 적용
      if (window.materialManager && this.pendingMaterialSettings) {
        try {
          // MaterialManager에 모델 설정
          window.materialManager.setCurrentModel(modelData.model);
          console.log(`✅ [ModelManager] MaterialManager에 모델 설정 완료: ${modelName}`);
          
          // 메터리얼 설정 적용
          window.materialManager.applySettings(this.pendingMaterialSettings);
          console.log(`✅ [ModelManager] ${modelName} JSON 개별 메터리얼 설정 완료`);
          
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            let individual = {};
            try {
              individual = this.pendingMaterialSettings.individualMaterial || {};
              console.log(`🎨 [ModelManager] 모델 스위치 ${modelName} 개별 메터리얼 설정:`, individual);
              localStorage.setItem(`individualMaterial_${modelName}`, JSON.stringify(individual));
              console.log(`💾 [ModelManager] 모델 스위치 ${modelName} 개별 메터리얼 설정 localStorage 저장 완료`);
            } catch (e) {
              console.error(`❌ [ModelManager] 모델 스위치 ${modelName} localStorage 저장 실패:`, e);
            }
            const event = new CustomEvent('materialSettingsUpdated', {
              detail: {
                settings: this.pendingMaterialSettings,
                individualMaterial: individual,
                source: 'json',
                modelName: modelName
              }
            });
            window.dispatchEvent(event);
            console.log(`🔄 [ModelManager] 모델 스위치 메터리얼 UI 동기화 이벤트 발생: ${modelName}`);
          }
          
          // pendingMaterialSettings 정리
          this.pendingMaterialSettings = null;
        } catch (error) {
          console.error(`❌ [ModelManager] ${modelName} 메터리얼 설정 적용 실패:`, error);
        }
      }
      
      // 2단계: 스켈레톤 헬퍼 추가
      if (modelData.skeletonHelper) {
        tempGroup.remove(modelData.skeletonHelper);
        sceneRef.current.add(modelData.skeletonHelper);
        console.log('✅ [ModelManager] 스켈레톤 헬퍼 추가 완료');
      }
      
      // 3단계: tempGroup 정리
      sceneRef.current.remove(tempGroup);
      
      // 4단계: 이전 모델을 부드럽게 제거 (새 모델이 안정화된 후)
      setTimeout(() => {
        if (previousModel && sceneRef.current) {
          console.log('🗑️ [ModelManager] 이전 모델 제거:', previousModel.name || 'unnamed');
          sceneRef.current.remove(previousModel);
          console.log('✅ [ModelManager] 이전 모델 제거 완료');
        }
      }, 0); // 200ms 지연으로 새 모델 안정화 보장 (100ms → 200ms 증가)
      
      // TalkingHead 설정 직접 호출 (스킵 준비된 설정)
      if (this.talkingHeadCallbacks) {
        await this.setupTalkingHeadModel(modelData, modelName, true); // 스킵 플래그
      }
      
      // 상태 업데이트
      this.currentModel = modelName;
      
     
      // 콜백 호출
      if (this.callbacks.onModelChange) {
        this.callbacks.onModelChange(modelName);
      }
      if (this.callbacks.onModelLoadComplete) {
        this.callbacks.onModelLoadComplete(modelName);
      }
      
  
      
      return modelData;
      
    } finally {
      this.setLoadingState(false);
    }
  }

  // TalkingHead 모델 설정 (중복 로직 제거)
  async setupTalkingHeadModel(modelData, modelName, skipPreparedSettings = false) {
    if (!this.talkingHeadCallbacks) return;

    const callbacks = this.talkingHeadCallbacks;
    
    // 모델 참조 업데이트
    callbacks.refs.modelRef.current = modelData.model;
    callbacks.refs.skeletonHelperRef.current = modelData.skeletonHelper;
    callbacks.refs.mixerRef.current = modelData.mixer;
    callbacks.refs.morphTargetsRef.current = modelData.morphTargets || {};
    callbacks.refs.blendshapeValuesRef.current = new Array(Object.keys(modelData.blendshapeMap || {}).length).fill(0);
    
    // 그림자 비활성화 적용
    if (modelData.model) {
      modelData.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });
    }

    // 스켈레톤 표시 상태 적용
    if (modelData.skeletonHelper) {
      modelData.skeletonHelper.visible = callbacks.getters.getIsSkeletonVisible();
    }

    // 애니메이션 설정
    await callbacks.setupModelAnimations(modelData.model, modelData.skeletonHelper, modelData, modelName);
    
    // 매니저들 설정
    callbacks.setupModelManagers(modelData.model, modelData.skeletonHelper, modelData, modelName);
    
    // 효과 시스템 초기화
    callbacks.initializeEffectSystems();
    
    // 애니메이션 및 표정 시스템 시작
    callbacks.startAnimationSystems();

    // GLB 모델 로드 완료 후 FBX 애니메이션이 확실히 적용되도록 대기
    setTimeout(() => {
      // 모델이 완전히 준비되었는지 확인하고 FBX 애니메이션 강제 적용
      if (callbacks.refs.modelRef.current && callbacks.refs.skeletonHelperRef.current) {
        console.log('🎬 [ModelManager] GLB 모델 로드 완료 후 FBX 애니메이션 강제 적용');
        
        // 모델이 씬에 안정적으로 추가되었는지 확인
        if (callbacks.refs.modelRef.current.parent && callbacks.refs.modelRef.current.visible) {
          console.log('✅ [ModelManager] 모델이 씬에 안정적으로 추가됨');
          
          // AnimationManager에 즉시 적용 요청 (T-pose 방지)
          if (window.animationManager) {
            window.animationManager.applyCurrentAnimationToNewModel(
              callbacks.refs.modelRef.current, 
              callbacks.refs.skeletonHelperRef.current
            );
          }
          
          // 추가로 FBX 애니메이션 데이터가 제대로 설정되었는지 확인
          if (window.animationData && Object.keys(window.animationData).length > 0) {
            console.log('✅ [ModelManager] FBX 애니메이션 데이터 확인됨:', Object.keys(window.animationData));
          } else {
            console.warn('⚠️ [ModelManager] FBX 애니메이션 데이터가 없음');
          }
        } else {
          console.warn('⚠️ [ModelManager] 모델이 아직 씬에 안정적으로 추가되지 않음, 재시도 예정');
          // 재시도
          setTimeout(() => {
            if (callbacks.refs.modelRef.current && callbacks.refs.skeletonHelperRef.current) {
              console.log('🔄 [ModelManager] FBX 애니메이션 적용 재시도');
              if (window.animationManager) {
                window.animationManager.applyCurrentAnimationToNewModel(
                  callbacks.refs.modelRef.current, 
                  callbacks.refs.skeletonHelperRef.current
                );
              }
            }
          }, 500);
        }
      }
    }, 1500); // GLB 모델 안정화 대기 시간 증가 (1000ms → 1500ms)

    // 기본 애니메이션이 확실히 적용된 후 blink 시작
    if (callbacks.startBlinkingAfterModelLoad) {
      setTimeout(() => {
        callbacks.startBlinkingAfterModelLoad();
      }, 2000); // FBX 애니메이션 적용 완료 후 blink 시작 (1200ms → 2000ms로 증가)
    }

    // 최종 상태 업데이트
    callbacks.setters.setCurrentModel(modelName);
    callbacks.setters.setIsModelLoaded(true);
    callbacks.setters.setIsFirstModelLoad(false);
    
    // MaterialManager에 새 모델 설정
    if (typeof window !== 'undefined' && window.materialManager && modelData.model) {
      // MaterialManager에는 GLTF 객체를 전달 (메터리얼 분석을 위해)
      window.materialManager.setCurrentModel(modelData.model);
    }

    // 🚀 백그라운드 프리로딩 시작 (첫 번째 모델 로드 완료 후)
    if (this.isFirstModelLoad) {
      console.log('🚀 [ModelManager] 첫 번째 모델 로드 완료 감지, 프리로딩 시작 예정');
      // 첫 번째 모델 로드 완료 후 프리로딩 시작
      setTimeout(() => {
        this.startBackgroundPreloading();
      }, 1000); // 1초 후 프리로딩 시작 (모델 안정화 대기)
    }

    console.log('✅ [ModelManager] TalkingHead 모델 설정 완료:', modelName);
  }

  // 현재 설정을 완전히 캐싱 (이전 모델 보존용)
  async cacheCurrentSettings() {
    console.log('🗄️ [ModelManager] 현재 설정 캐싱 시작...');
    
    try {
      // 1. 렌더링 설정 캐싱
      if (window.renderingManager) {
        this.cachedSettings.rendering = window.renderingManager.getCurrentSettings();
        console.log('🖥️ [ModelManager] 렌더링 설정 캐싱 완료');
      }
      
      // 2. 메터리얼 설정 캐싱
      if (window.materialManager) {
        this.cachedSettings.material = window.materialManager.getCurrentSettings();
        console.log('🎨 [ModelManager] 메터리얼 설정 캐싱 완료');
      }
      
      // 3. 애니메이션 설정 캐싱
      if (window.animationManager) {
        this.cachedSettings.animation = {
          isAPIMotionActive: window.animationManager.isAPIMotionActive,
          currentAnimationData: window.animationData || null
        };
        console.log('🎭 [ModelManager] 애니메이션 설정 캐싱 완료');
      }
      
      console.log('✅ [ModelManager] 모든 현재 설정 캐싱 완료:', this.cachedSettings);
    } catch (error) {
      console.error('❌ [ModelManager] 설정 캐싱 실패:', error);
    }
  }

  // 로딩 상태 관리
  setLoadingState(isLoading) {
    this.isLoading = isLoading;
    if (this.callbacks.onModelLoadingChange) {
      this.callbacks.onModelLoadingChange(isLoading);
    }
  }

  // 🚀 백그라운드 프리로딩 시작
  async startBackgroundPreloading() {
    try {
      console.log('🚀 [ModelManager] 백그라운드 프리로딩 시작...');
      
      // 프리로딩할 모델 목록 (현재 모델 제외)
      const targetModels = ['brunette', 'man'].filter(model => model !== this.currentModel);
      
      if (targetModels.length === 0) {
        console.log('🚀 [ModelManager] 프리로딩할 모델이 없습니다');
        return;
      }
      
      // PreloadManager가 있으면 프리로딩 시작
      if (typeof window !== 'undefined' && window.preloadManager) {
        console.log('🚀 [ModelManager] PreloadManager를 통한 프리로딩 시작:', targetModels);
        
        // 프리로딩 콜백 설정
        window.preloadManager.setCallbacks(
          () => {
            // 프리로딩 시작 콜백 (ModelManager에서는 사용하지 않음)
            console.log('🚀 [ModelManager] 프리로딩 시작됨');
          },
          (progress) => {
            console.log(`🚀 [ModelManager] 프리로딩 진행률: ${progress.modelName} (${progress.current}/${progress.total})`);
          },
          (result) => {
            console.log(`🎉 [ModelManager] 백그라운드 프리로딩 완료! ${result.totalPreloaded}개 모델:`, result.models);
          }
        );
        
        // 백그라운드에서 프리로딩 시작
        window.preloadManager.startPreloading(targetModels);
        
      } else {
        console.log('⚠️ [ModelManager] PreloadManager를 찾을 수 없음 - 프리로딩 건너뛰기');
      }
      
    } catch (error) {
      console.error('❌ [ModelManager] 백그라운드 프리로딩 시작 실패:', error);
    }
  }



  // 현재 상태 반환
  getCurrentState() {
    return {
      currentModel: this.currentModel,
      isSkeletonVisible: this.isSkeletonVisible,
      qualityMode: this.qualityMode,
      currentBackground: this.currentBackground,
      cameraFOV: this.cameraFOV,
      effectStates: { ...this.effectStates },
      isLoading: this.isLoading,
      isFirstModelLoad: this.isFirstModelLoad
    };
  }
}

// 싱글톤 인스턴스
export const modelManager = new ModelManager();

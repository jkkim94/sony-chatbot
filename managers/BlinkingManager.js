import * as THREE from 'three';
import { getBlendshapeMapForModel } from '../constants/blendshapeConstants';

export class BlinkingManager {
  constructor() {
    this.blinkInterval = null;
    this.eyeTrackingInterval = null;
    this.currentBlendshapeMap = null;
    this.isBlinking = false;
    this.cameraRef = null;
    this.modelRef = null;
    this.blendshapeNames = {
      eyeBlinkLeft: null,
      eyeBlinkRight: null,  
      eyesClosed: null,
      eyeLookUpLeft: null,
      eyeLookUpRight: null,
      eyeLookDownLeft: null,
      eyeLookDownRight: null,
      eyeLookInLeft: null,
      eyeLookInRight: null,
      eyeLookOutLeft: null,
      eyeLookOutRight: null
    };
    this.currentModel = 'woman';
    
    this.morphTargetsRef = null;
    this.blendshapeValuesRef = null;
  }

  // 블렌드쉐입 매핑 설정
  setBlendshapeMap(blendshapeMap, currentModel = 'woman') {
    this.currentBlendshapeMap = blendshapeMap;
    this.currentModel = currentModel;
    
    if (blendshapeMap) {
      this.detectBlendshapeMapping();
    }
  }
  
  // 각 모델의 실제 블렌드셰이프 이름 감지
  detectBlendshapeMapping() {
    if (!this.currentBlendshapeMap) return;

    const availableNames = Object.keys(this.currentBlendshapeMap);
    
    this.blendshapeNames = {
      eyeBlinkLeft: availableNames.find(name => name.toLowerCase().includes('blink') && name.toLowerCase().includes('left')),
      eyeBlinkRight: availableNames.find(name => name.toLowerCase().includes('blink') && name.toLowerCase().includes('right')),
      eyesClosed: availableNames.find(name => name.toLowerCase().includes('eyes') && name.toLowerCase().includes('closed')),
      eyeLookUpLeft: availableNames.find(name => name.toLowerCase().includes('look') && name.toLowerCase().includes('up') && name.toLowerCase().includes('left')),
      eyeLookUpRight: availableNames.find(name => name.toLowerCase().includes('look') && name.toLowerCase().includes('up') && name.toLowerCase().includes('right')),
      eyeLookDownLeft: availableNames.find(name => name.toLowerCase().includes('look') && name.toLowerCase().includes('down') && name.toLowerCase().includes('left')),
      eyeLookDownRight: availableNames.find(name => name.toLowerCase().includes('look') && name.toLowerCase().includes('down') && name.toLowerCase().includes('right')),
      eyeLookInLeft: availableNames.find(name => name.toLowerCase().includes('look') && name.toLowerCase().includes('in') && name.toLowerCase().includes('left')),
      eyeLookInRight: availableNames.find(name => name.toLowerCase().includes('look') && name.toLowerCase().includes('in') && name.toLowerCase().includes('right')),
      eyeLookOutLeft: availableNames.find(name => name.toLowerCase().includes('look') && name.toLowerCase().includes('out') && name.toLowerCase().includes('left')),
      eyeLookOutRight: availableNames.find(name => name.toLowerCase().includes('look') && name.toLowerCase().includes('out') && name.toLowerCase().includes('right'))
    };
  }

  // 현재 상태 반환 (외부에서 상태 확인용)
  getStatus() {
    return {
      isBlinking: this.isBlinking,
      isEyeTracking: !!this.eyeTrackingInterval,
      currentModel: this.currentModel,
      hasMorphTargets: !!this.morphTargetsRef?.current,
      hasBlendshapeMap: !!this.currentBlendshapeMap
    };
  }

  // 블렌드셰이프 업데이트 메서드
  updateBlendshape(blendshapeName, targetValue) {
    if (!this.morphTargetsRef?.current?.head || !this.currentBlendshapeMap) {
      return;
    }

    const morphIndex = this.currentBlendshapeMap[blendshapeName];
    if (morphIndex === undefined) {
      console.warn(`[BlinkingManager] updateBlendshape: ${blendshapeName}에 대한 morphIndex가 없음`);
      return;
    }

    const { head } = this.morphTargetsRef.current;
    const currentValues = this.blendshapeValuesRef?.current;
    
    if (!currentValues) {
      console.warn('[BlinkingManager] updateBlendshape: blendshapeValuesRef가 없음');
      return;
    }

    const currentValue = currentValues[morphIndex] || 0;
    
    // BLINK는 즉시 적용, EYE LOOK은 부드럽게 적용
    let newValue;
    if (blendshapeName.includes('Blink') || blendshapeName.includes('eyesClosed')) {
      newValue = targetValue; // 즉시 적용
    } else {
    const lerpFactor = 0.1;
      newValue = THREE.MathUtils.lerp(currentValue, targetValue, lerpFactor);
    }
      currentValues[morphIndex] = newValue;

      // man/woman 모델의 다중 메시 지원
      try {
        const { mesh, meshes, meshCount } = head;
        
        if (meshCount === 1 || !meshes) {
          if (mesh.morphTargetInfluences && morphIndex < mesh.morphTargetInfluences.length) {
            mesh.morphTargetInfluences[morphIndex] = newValue;
          }
        } else {
          meshes.forEach((mesh) => {
            if (mesh.morphTargetInfluences && morphIndex < mesh.morphTargetInfluences.length) {
              mesh.morphTargetInfluences[morphIndex] = newValue;
            }
          });
        }
      } catch (error) {
      // console.warn(`[BlinkingManager] ${blendshapeName} 적용 중 오류:`, error);
    }
  }

  // 초기화 함수
  initBlinking(morphTargetsRef, blendshapeValuesRef) {
    if (!morphTargetsRef?.current?.head || !this.currentBlendshapeMap) {
      return;
    }

    // morphTargetsRef가 변경되었는지 확인 (모델 교체 감지)
    if (this.morphTargetsRef !== morphTargetsRef) {
      this.resetForModelChange();
    }

    // 참조 저장
    this.morphTargetsRef = morphTargetsRef;
    this.blendshapeValuesRef = blendshapeValuesRef;

    // 블렌드셰이프 이름 감지
    this.detectBlendshapeMapping();

    // 눈동자 추적 시작 (항상 실행)
    this.startEyeTracking();
   }

  // 카메라 참조 설정
  setCameraRef(cameraRef) {
    this.cameraRef = cameraRef;
  }
  
  // 모델 참조 설정
  setModelRef(modelRef) {
    this.modelRef = modelRef;
  }

  // 눈동자 카메라 추적 시작 (항상 실행)
  startEyeTracking() {
    // 기존 인터벌 정리
    if (this.eyeTrackingInterval) {
      clearInterval(this.eyeTrackingInterval);
    }
    
    // 눈동자 추적 인터벌 시작
    this.eyeTrackingInterval = setInterval(() => {
      try {
        this.calculateAndApplyEyePosition();
      } catch (error) {
        // console.log('[BlinkingManager] 눈동자 추적 오류:', error);
      }
    }, 16); // 60fps
  }

  // 눈동자 위치 계산 및 적용 (실제 추적 동작)
  calculateAndApplyEyePosition() {
    if (!this.cameraRef || !this.modelRef) {
        return;
      }
      
      try {
      // 현재 카메라와 머리 위치 계산
        const headPosition = new THREE.Vector3();
        this.modelRef.getWorldPosition(headPosition);
        headPosition.y += 1.5; // 머리 높이 조정
        
        const cameraPosition = this.cameraRef.position.clone();
        const direction = new THREE.Vector3().subVectors(cameraPosition, headPosition).normalize();
      let horizontalAngle = Math.atan2(direction.x, direction.z);
      
      // 🎯 woman 모델일 때 카메라 위치 보정 (0.15만큼)
      if (this.currentModel === 'woman') {
        horizontalAngle -= 0.14; // 카메라가 틀어진 만큼 보정
        // console.log(`👁️ [BlinkingManager] woman 모델 카메라 보정: ${(0.15 * 180 / Math.PI).toFixed(1)}°`);
      }
      
      // 데드존 및 블렌드셰이프 값 계산
      const deadZone = 0.05;
      const isInDeadZone = Math.abs(horizontalAngle) < deadZone;
      
      let finalBlendshapeValue = 0;
      if (!isInDeadZone) {
        // 🎯 새로운 증폭 공식: y = 1-(1-x)^(10/3)
        const rawValue = Math.abs(horizontalAngle) * 1.5;
        const clippedValue = Math.min(rawValue, 1.0);
        finalBlendshapeValue = 1 - Math.pow(1 - clippedValue, 10/3);
        
        // 🎯 woman, man 모델에서는 최대 weight를 0.7로 제한
        if (this.currentModel === 'woman' || this.currentModel === 'man') {
          finalBlendshapeValue = Math.min(finalBlendshapeValue, 0.7);
          // console.log(`👁️ [BlinkingManager] ${this.currentModel} 모델 weight 제한: ${finalBlendshapeValue.toFixed(3)}`);
        }
      }
      
      // 🛡️ 모든 눈 방향 블렌드셰이프를 먼저 0으로 초기화 (충돌 방지)
      this.resetAllEyeTrackingBlendshapes();
      
      // 방향에 따른 weight 계산 및 적용 (한 번에 하나의 방향만)
      if (!isInDeadZone) {
        let appliedBlendshapes = [];
        
        if (horizontalAngle > 0.1) {
          // 오른쪽으로 보기 - 왼쪽 눈만 OUT, 오른쪽 눈만 IN
          if (this.blendshapeNames.eyeLookOutLeft) {
            this.updateBlendshape(this.blendshapeNames.eyeLookOutLeft, finalBlendshapeValue);
            appliedBlendshapes.push(`eyeLookOutLeft:${finalBlendshapeValue.toFixed(3)}`);
          }
          if (this.blendshapeNames.eyeLookInRight) {
            this.updateBlendshape(this.blendshapeNames.eyeLookInRight, finalBlendshapeValue);
            appliedBlendshapes.push(`eyeLookInRight:${finalBlendshapeValue.toFixed(3)}`);
          }
        } else if (horizontalAngle < -0.1) {
          // 왼쪽으로 보기 - 왼쪽 눈만 IN, 오른쪽 눈만 OUT
          if (this.blendshapeNames.eyeLookInLeft) {
            this.updateBlendshape(this.blendshapeNames.eyeLookInLeft, finalBlendshapeValue);
            appliedBlendshapes.push(`eyeLookInLeft:${finalBlendshapeValue.toFixed(3)}`);
          }
          if (this.blendshapeNames.eyeLookOutRight) {
            this.updateBlendshape(this.blendshapeNames.eyeLookOutRight, finalBlendshapeValue);
            appliedBlendshapes.push(`eyeLookOutRight:${finalBlendshapeValue.toFixed(3)}`);
          }
        }
        
        // 🔍 적용된 블렌드셰이프 로깅 (변화가 있을 때만) - 로그 스팸 방지
        // Math.random() 제거로 Hydration 불일치 방지
        if (appliedBlendshapes.length > 0 && Date.now() % 10000 < 16) { // 10초마다 1회만 로그 출력
          console.log('👁️ [BlinkingManager] 눈동자 추적 적용:', {
            direction: horizontalAngle > 0.1 ? 'RIGHT' : 'LEFT',
            angle: horizontalAngle.toFixed(3),
            applied: appliedBlendshapes,
            timestamp: new Date().toISOString().substr(11, 12)
          });
        }
      } else {
        // 🔍 데드존 상태 로깅 (5초마다 1회만)
        //if (Date.now() % 5000 < 16) {
        //  console.log('👁️ [BlinkingManager] 데드존 상태 - 모든 눈 방향 초기화됨');
        //}
      }
      // 데드존에 있을 때는 이미 resetAllEyeTrackingBlendshapes()에서 0으로 설정됨
      
    } catch (error) {
      // console.warn('[BlinkingManager] 눈동자 추적 계산 오류:', error);
    }
  }

  // 눈 깜빡임 실행 메서드
  blink() {
    // 이전 애니메이션 강제 중단
    if (this.isBlinking) {
      this.isBlinking = false;
      
      // 블렌드셰이프 즉시 0으로 리셋
      if (this.blendshapeNames.eyeBlinkLeft) {
        this.updateBlendshape(this.blendshapeNames.eyeBlinkLeft, 0);
      }
      if (this.blendshapeNames.eyeBlinkRight) {
        this.updateBlendshape(this.blendshapeNames.eyeBlinkRight, 0);
      }
      if (this.blendshapeNames.eyesClosed) {
        this.updateBlendshape(this.blendshapeNames.eyesClosed, 0);
      }
    }
    
    this.isBlinking = true;

    const blinkDuration = 150; // 150ms
    const startTime = Date.now();

    const animateBlink = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / blinkDuration, 1);
      
      const blinkValue = Math.sin(progress * Math.PI); // 0~1 범위
      
      // 🎯 모델별 최대 블링크 값 설정
      let maxBlinkValue = 1.0; // 기본값
      if (this.currentModel === 'brunette') {
        maxBlinkValue = 0.7; // airi 모델은 0.9로 제한
      }
      
      const finalBlinkValue = blinkValue * maxBlinkValue;
      
      // BLINK weight 적용
      if (this.blendshapeNames.eyeBlinkLeft) {
        this.updateBlendshape(this.blendshapeNames.eyeBlinkLeft, finalBlinkValue);
      }
      
      if (this.blendshapeNames.eyeBlinkRight) {
        this.updateBlendshape(this.blendshapeNames.eyeBlinkRight, finalBlinkValue);
      }
      
      if (this.blendshapeNames.eyesClosed) {
        this.updateBlendshape(this.blendshapeNames.eyesClosed, finalBlinkValue);
      }

      if (progress < 1) {
        requestAnimationFrame(animateBlink);
      } else {
        // 블렌드셰이프 리셋 (BLINK만)
        if (this.blendshapeNames.eyeBlinkLeft) {
          this.updateBlendshape(this.blendshapeNames.eyeBlinkLeft, 0);
        }
        if (this.blendshapeNames.eyeBlinkRight) {
          this.updateBlendshape(this.blendshapeNames.eyeBlinkRight, 0);
        }
        if (this.blendshapeNames.eyesClosed) {
          this.updateBlendshape(this.blendshapeNames.eyesClosed, 0);
        }
        
        this.isBlinking = false;
      }
    };

    requestAnimationFrame(animateBlink);
  }

  // 깜빡임 시작 메서드 (외부에서 start만 제어)
  startBlinking() {
    // 기존 인터벌 정리
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval);
      this.blinkInterval = null;
    }

    this.isBlinking = true;

    if (this.blink && typeof this.blink === 'function') {
      // 3초마다 랜덤 지연으로 깜빡임
      this.blinkInterval = setInterval(() => {
        const nextBlinkDelay = Math.random() * 1500 + 1500; // 1.5~3초 랜덤
          setTimeout(() => {
          this.blink();
          }, nextBlinkDelay);
      }, 3000);

      // 초기 깜빡임 (즉시 실행)
      this.blink();
    } else {
      this.isBlinking = false;
    }
  }

  // 깜빡임 중단 메서드 (외부에서 stop만 제어)
  stopBlinking() {
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval);
      this.blinkInterval = null;
    }
    
    this.isBlinking = false;
  }

  // 모델 교체 시에만 호출하는 완전 초기화 메서드
  resetForModelChange() {
    this.stopBlinking();
    
    // 상태 리셋
    this.isBlinking = false;
  }

  // 🎯 FacialAnimationManager에 제공할 데이터 (TRACKING + BLINK)
  getData() {
    const trackingData = this.getCurrentTrackingData();
    const blinkData = this.getBlinkData();
    
    return {
      tracking: trackingData,
      blink: blinkData,
      status: {
        isBlinking: this.isBlinking,
        timestamp: Date.now()
      }
    };
  }

  // 현재 적용된 눈동자 추적 데이터 반환
  getCurrentTrackingData() {
    return {
      eyeLookOutLeft: this.getCurrentBlendshapeValue('eyeLookOutLeft') || 0,
      eyeLookInRight: this.getCurrentBlendshapeValue('eyeLookInRight') || 0,
      eyeLookInLeft: this.getCurrentBlendshapeValue('eyeLookInLeft') || 0,
      eyeLookOutRight: this.getCurrentBlendshapeValue('eyeLookOutRight') || 0
    };
  }

  // 특정 블렌드셰이프의 현재 값 가져오기
  getCurrentBlendshapeValue(blendshapeName) {
    if (!this.blendshapeNames[blendshapeName] || !this.currentBlendshapeMap) {
      return 0;
    }

    const morphIndex = this.currentBlendshapeMap[this.blendshapeNames[blendshapeName]];
    if (morphIndex === undefined) {
      return 0;
    }

    const currentValues = this.blendshapeValuesRef?.current;
    if (!currentValues) {
      return 0;
    }

    return currentValues[morphIndex] || 0;
  }

  // BLINK 데이터 계산
  getBlinkData() {
    if (!this.isBlinking) {
      return {
        eyeBlinkLeft: 0,
        eyeBlinkRight: 0,
        eyesClosed: 0,
        isBlinking: false
      };
    }

    // 현재 시간 기반으로 BLINK 애니메이션 계산
    const currentTime = Date.now();
    const blinkDuration = 150; // 150ms
    
    // BLINK 애니메이션 진행도 계산
    const timeSinceLastBlink = currentTime % 3000; // 3초 주기
    const blinkProgress = Math.min(timeSinceLastBlink / blinkDuration, 1);
    
    const blinkValue = Math.sin(blinkProgress * Math.PI); // 0~1 범위
    
    // 🎯 모델별 최대 블링크 값 설정 (blink() 메서드와 동일하게)
    let maxBlinkValue = 1.0; // 기본값
    if (this.currentModel === 'brunette') {
      maxBlinkValue = 0.0; // airi 모델은 0.9로 제한
    }
    
    const finalBlinkValue = blinkValue * maxBlinkValue;
    
    return {
      eyeBlinkLeft: finalBlinkValue,
      eyeBlinkRight: finalBlinkValue,
      eyesClosed: finalBlinkValue,
      isBlinking: true,
      progress: blinkProgress,
      timestamp: currentTime
    };
  }

  // 눈동자 추적 토글 메서드
  toggleEyeTracking() {
    if (this.eyeTrackingInterval) {
      // 현재 활성화되어 있으면 비활성화
      clearInterval(this.eyeTrackingInterval);
      this.eyeTrackingInterval = null;
      
      
      console.log('👁️ [BlinkingManager] 눈동자 추적 비활성화');
      return false;
    } else {
      // 현재 비활성화되어 있으면 활성화
      this.startEyeTracking();
      //console.log('👁️ [BlinkingManager] 눈동자 추적 활성화 - 동시 동작 방지 시스템 활성화');
      //console.log('🛡️ [BlinkingManager] 검증 로그: IN/OUT 블렌드셰이프 동시 적용 방지됨');
      return true;
    }
  }

  // 눈동자 추적 활성화 상태 확인
  isEyeTrackingEnabled() {
    return !!this.eyeTrackingInterval;
  }

  // 🛡️ 모든 눈 방향 블렌드셰이프를 0으로 초기화 (충돌 방지)
  resetAllEyeTrackingBlendshapes() {
    const eyeTrackingBlendshapes = [
      'eyeLookOutLeft',
      'eyeLookInRight', 
      'eyeLookInLeft',
      'eyeLookOutRight'
    ];
    
    // 🔍 초기화 전 현재 상태 로깅
    const beforeReset = {};
    eyeTrackingBlendshapes.forEach(blendshapeName => {
      if (this.blendshapeNames[blendshapeName]) {
        beforeReset[blendshapeName] = this.getCurrentBlendshapeValue(blendshapeName);
      }
    });
    
    // 🛡️ 모든 눈 방향 블렌드셰이프 초기화
    eyeTrackingBlendshapes.forEach(blendshapeName => {
      if (this.blendshapeNames[blendshapeName]) {
        this.updateBlendshape(this.blendshapeNames[blendshapeName], 0);
      }
    });
    
    // 🔍 초기화 후 상태 로깅 (변화가 있었던 경우만) - 로그 스팸 방지
    const hasChanges = Object.values(beforeReset).some(value => value > 0.5);
    if (hasChanges) {
      // console.log('🛡️ [BlinkingManager] 눈 방향 블렌드셰이프 초기화:', {
      //   before: beforeReset,
      //   after: { eyeLookOutLeft: 0, eyeLookInRight: 0, eyeLookInLeft: 0, eyeLookOutRight: 0 },
      //   timestamp: new Date().toISOString().substr(11, 12)
      // });
    }
  }

  // 🎯 외부 제어 함수 (BLINK만 start/stop)
  control(action) {
    switch (action) {
      case 'start':
        this.startBlinking();
        return { success: true, action: 'start' };
        
      case 'stop':
        this.stopBlinking();
        return { success: true, action: 'stop' };
        
      case 'get_data':
        return this.getData();
        
      default:
        return { success: false, error: 'unknown_action' };
    }
  }

  // 리소스 정리
  dispose() {
    this.stopBlinking();
    this.currentBlendshapeMap = null;
  }
} 
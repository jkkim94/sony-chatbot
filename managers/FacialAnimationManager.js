import { FACIAL_ANIMATION_TEMPLATES, ANIMATION_TO_FACIAL_MAP } from '../constants/facialAnimationConstants';
import { applyBlendshapeValue } from '../utils/blendshapeUtils';


export class FacialAnimationManager {
  constructor() {
    this.currentFacialAnimation = null;
    this.defaultFacialState = null;
    this.currentBlendshapeMap = null;
    this.currentModelName = null;  

  }
  // 모델 이름 설정 함수 추가
  setModelName(modelName) {
    this.currentModelName = modelName;
  }

    // 블렌드쉐이프 맵 설정 시 모델 이름도 함께 설정
    setBlendshapeMap(blendshapeMap, modelName) {
      this.currentBlendshapeMap = blendshapeMap;
      this.currentModelName = modelName;  // ✅ 모델 이름도 설정
      
      // 설정 후 매핑 호환성 자동 검증
      setTimeout(() => {
        this.validateBlendshapeMapping();
      }, 100);
    }

  // 현재 상태 반환 (외부에서 상태 확인용)
  getCurrentState() {
    return {
      isPlaying: !!this.currentFacialAnimation,
      currentAnimation: this.currentFacialAnimation,
      currentModel: this.currentModelName,
      hasDefaultState: !!this.defaultFacialState,
      hasBlendshapeMap: !!this.currentBlendshapeMap
    };
  }

  // 기본 표정 상태 저장 함수 (EYE TRACKING 제외)
  saveDefaultFacialState(morphTargetsRef) {
    if (!morphTargetsRef.current.head || !morphTargetsRef.current.head.mesh.morphTargetInfluences) {
      return;
    }

    const { head } = morphTargetsRef.current;
    this.defaultFacialState = {};
    
    // 모든 표정 관련 블렌드쉐입의 기본 상태 저장 (EYE TRACKING 제외)
    Object.keys(this.currentBlendshapeMap).forEach(blendshapeName => {
      // EYE TRACKING 관련 블렌드셰이프는 제외
      if (this.isEyeTrackingBlendshape(blendshapeName)) {
        console.log(`🛡️ [FacialAnimationManager] EYE TRACKING 보호: ${blendshapeName} 제외 (save default state)`);
        return; // 건너뛰기
      }

      // 표정 관련 블렌드쉐입만 저장 (viseme 제외)
      if (!blendshapeName.startsWith('viseme_') && 
          !blendshapeName.includes('mouthOpen') && 
          !blendshapeName.includes('mouthClose')) {
        const morphIndex = this.currentBlendshapeMap[blendshapeName];
        if (morphIndex !== undefined && head.mesh.morphTargetInfluences[morphIndex] !== undefined) {
          this.defaultFacialState[blendshapeName] = head.mesh.morphTargetInfluences[morphIndex];
        }
      }
    });
    
    console.log('기본 표정 상태 저장 (EYE TRACKING 제외):', this.defaultFacialState);
  }

  // 기본 표정으로 복원하는 함수
  resetToDefaultFacialState(morphTargetsRef, blendshapeValuesRef) {
    if (!morphTargetsRef.current.head || !this.defaultFacialState) {
      console.warn('[FacialAnimationManager] 기본 표정 상태가 저장되지 않음', {
        hasHead: !!morphTargetsRef.current.head,
        hasDefaultState: !!this.defaultFacialState,
        defaultStateKeys: this.defaultFacialState ? Object.keys(this.defaultFacialState).length : 0
      });
      return;
    }

    const { head } = morphTargetsRef.current;
    const resetDuration = 1600; // 0.8초에 걸쳐 복원
    const startTime = Date.now();

    // 현재 값들 저장
    const currentValues = {};
    Object.keys(this.defaultFacialState).forEach(blendshapeName => {
      const morphIndex = this.currentBlendshapeMap[blendshapeName];
      if (morphIndex !== undefined && head.mesh.morphTargetInfluences) {
        currentValues[blendshapeName] = head.mesh.morphTargetInfluences[morphIndex] || 0;
      }
    });

    const resetAnimate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / resetDuration, 1);

      // 부드러운 이징 함수 적용 (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      // 각 블렌드쉐입을 기본 값으로 보간 (EYE TRACKING 제외)
      Object.keys(this.defaultFacialState).forEach(blendshapeName => {
        // EYE TRACKING 관련 블렌드셰이프는 제외
        if (this.isEyeTrackingBlendshape(blendshapeName)) {
          console.log(`🛡️ [FacialAnimationManager] EYE TRACKING 보호: ${blendshapeName} 제외 (reset to default)`);
          return; // 건너뛰기
        }

        const morphIndex = this.currentBlendshapeMap[blendshapeName];
        if (morphIndex !== undefined) {
          // 🛡️ 추가 보호: blendshapeValuesRef 업데이트 전에도 eye tracking 확인
          if (this.isEyeTrackingBlendshape(blendshapeName)) {
            console.warn(`🚨 [FacialAnimationManager] 위험! EYE TRACKING blendshape가 reset에서 업데이트되려 함: ${blendshapeName}`);
            return; // 절대 건드리지 않음
          }
          
          const currentValue = currentValues[blendshapeName];
          const targetValue = this.defaultFacialState[blendshapeName];
          const interpolatedValue = currentValue + (targetValue - currentValue) * easedProgress;
          
          // 블렌드쉐입 값 저장
          blendshapeValuesRef.current[morphIndex] = interpolatedValue;
          // 계산된 값으로 블렌드쉐이프 적용
          applyBlendshapeValue(morphTargetsRef.current, morphIndex, interpolatedValue);
        }
      });

      if (progress < 1) {
        requestAnimationFrame(resetAnimate);
      } else {
        console.log('[FacialAnimationManager] 기본 표정으로 복원 완료 (EYE TRACKING 유지)', {
          model: this.currentModelName,
          totalDuration: Date.now() - startTime,
          preservedEyeTracking: true
        });
      }
    };

    console.log('[FacialAnimationManager] 기본 표정으로 복원 시작 (EYE TRACKING 제외)', {
      duration: resetDuration,
      blendshapeCount: Object.keys(this.defaultFacialState).length,
      model: this.currentModelName,
      eyeTrackingPreserved: true
    });
    resetAnimate();
  }

  // EYE TRACKING 관련 블렌드셰이프인지 확인하는 함수 (포괄적 보호)
  isEyeTrackingBlendshape(blendshapeName) {
    // EYE TRACKING 관련 모든 블렌드셰이프 패턴 (더 포괄적으로 확장)
    const eyeTrackingPatterns = [
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
    
    const lowerName = blendshapeName.toLowerCase();
    
    // 패턴 매칭으로 확인
    const isEyeTracking = eyeTrackingPatterns.some(pattern => 
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
  }

  

  // 표정 애니메이션 재생 함수
  playFacialAnimation(templateName, morphTargetsRef, blendshapeValuesRef) {

    if (this.currentModelName === 'turtle') {
      console.log(' Turtle 표정 애니메이션 디버깅:', {
        templateName,
        currentBlendshapeMap: this.currentBlendshapeMap,
        morphTargets: morphTargetsRef.current
      });
    }
    
    const template = FACIAL_ANIMATION_TEMPLATES[templateName];
    if (!template || !morphTargetsRef.current.head) {
      console.warn(`표정 애니메이션 템플릿을 찾을 수 없음: ${templateName}`);
      return;
    }

    // facial animation 시작 시 blink 일시정지 (API 애니메이션이 아님)
    if (typeof window !== 'undefined' && window.blinkingManager) {
      window.blinkingManager.control('stop');
      console.log('👁️ [FacialAnimationManager] facial animation 시작으로 인한 blink 일시정지');
    }

    // 진행 중인 애니메이션이 있으면 중단
    if (this.currentFacialAnimation) {
      this.currentFacialAnimation.stop = true;
      console.log('이전 표정 애니메이션 중단');
    }

    const { head } = morphTargetsRef.current;
    const { duration, keyframes } = template;
    const startTime = Date.now();

    // 애니메이션 객체 생성
    const animationObject = {
      stop: false,
      templateName: templateName
    };
    this.currentFacialAnimation = animationObject;

    // 기본 표정 상태가 없으면 현재 상태를 기본으로 저장
    if (!this.defaultFacialState) {
      this.saveDefaultFacialState(morphTargetsRef);
    }

    const animate = () => {
      // 애니메이션이 중단되었는지 확인
      if (animationObject.stop) {
        console.log(`표정 애니메이션 중단됨: ${templateName}`);
        
        // facial animation 중단 시에도 blink 재개 (API 애니메이션이 아님)
        if (typeof window !== 'undefined' && window.blinkingManager) {
          window.blinkingManager.control('start');
          console.log('👁️ [FacialAnimationManager] facial animation 중단으로 인한 blink 재개');
        }
        
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 현재 시간에 해당하는 키프레임 찾기
      let currentFrame = null;
      let nextFrame = null;

      for (let i = 0; i < keyframes.length - 1; i++) {
        if (progress >= keyframes[i].time && progress <= keyframes[i + 1].time) {
          currentFrame = keyframes[i];
          nextFrame = keyframes[i + 1];
          break;
        }
      }

      if (!currentFrame || !nextFrame) {
        currentFrame = keyframes[keyframes.length - 1];
        nextFrame = currentFrame;
      }

      // 키프레임 간 보간
      const frameProgress = currentFrame === nextFrame ? 1 : 
        (progress - currentFrame.time) / (nextFrame.time - currentFrame.time);

      // 각 블렌드쉐입 값 업데이트 (EYE TRACKING 제외)
      Object.keys(currentFrame.values).forEach(blendshapeName => {
        // EYE TRACKING 관련 블렌드셰이프는 절대 건드리지 않음
        if (this.isEyeTrackingBlendshape(blendshapeName)) {
          console.log(`🛡️ [FacialAnimationManager] EYE TRACKING 보호: ${blendshapeName} 제외 (facial animation)`);
          return; // 건너뛰기
        }

        const currentValue = currentFrame.values[blendshapeName];
        const nextValue = nextFrame.values[blendshapeName];
        const interpolatedValue = currentValue + (nextValue - currentValue) * frameProgress;

        // 대칭적인 블렌드쉐입들을 처리
        const symmetricBlendshapes = ['mouthSmile', 'mouthFrown', 'eyeSquint', 'eyeBlink', 'browDown', 'browOuterUp', 'noseSneer', 'cheekPuff'];
        
        if (blendshapeName === 'mouthSmile' || blendshapeName === 'mouthFrown') {
          this.applySymmetricBlendshape(blendshapeName, interpolatedValue, morphTargetsRef, blendshapeValuesRef);
        } else {
          const morphIndex = this.currentBlendshapeMap[blendshapeName];
          if (morphIndex !== undefined) {
            // 🛡️ 추가 보호: blendshapeValuesRef 업데이트 전에도 eye tracking 확인
            if (this.isEyeTrackingBlendshape(blendshapeName)) {
              console.warn(`🚨 [FacialAnimationManager] 위험! EYE TRACKING blendshape가 blendshapeValuesRef에 업데이트되려 함: ${blendshapeName}`);
              return; // 절대 건드리지 않음
            }
            
            blendshapeValuesRef.current[morphIndex] = interpolatedValue;
            applyBlendshapeValue(morphTargetsRef.current, morphIndex, interpolatedValue);
          } else {
            // 블렌드쉐입이 매핑되지 않은 경우 디버그 로그 (한 번만 출력)
            if (this.currentModelName === 'turtle') {
              console.warn(`블렌드쉐입 '${blendshapeName}'이 ${this.currentModelName} 모델에서 매핑되지 않음`);
            }
          }
        }
      });

      // 애니메이션 계속 또는 종료
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        console.log(`표정 애니메이션 완료: ${templateName}`);
        this.currentFacialAnimation = null;
        
        // facial animation 완료 시 blink 재개 (API 애니메이션이 아님)
        if (typeof window !== 'undefined' && window.blinkingManager) {
          window.blinkingManager.control('start');
          console.log('👁️ [FacialAnimationManager] facial animation 완료로 인한 blink 재개');
        }
        
        // 애니메이션 완료 후 기본 표정으로 복원
        setTimeout(() => {
          this.resetToDefaultFacialState(morphTargetsRef, blendshapeValuesRef);
        }, 1000); // 1초 후 기본 표정으로 복원
      }
    };

    console.log(`표정 애니메이션 시작: ${templateName}`);
    animate();
  }

  // 대칭적인 블렌드쉐입 적용 함수 (EYE TRACKING 제외)
  applySymmetricBlendshape(baseBlendshapeName, value, morphTargetsRef, blendshapeValuesRef) {
    // EYE TRACKING 관련 블렌드셰이프는 절대 건드리지 않음
    if (this.isEyeTrackingBlendshape(baseBlendshapeName)) {
      console.log(`🛡️ [FacialAnimationManager] EYE TRACKING 보호: ${baseBlendshapeName} 제외`);
      return;
    }

    // 기본 블렌드쉐입 이름에서 Left/Right 변형을 시도
    const leftName = baseBlendshapeName + 'Left';
    const rightName = baseBlendshapeName + 'Right';
    
    // 🛡️ 추가 보호: Left/Right 변형도 eye tracking 확인
    if (this.isEyeTrackingBlendshape(leftName) || this.isEyeTrackingBlendshape(rightName)) {
      console.warn(`🚨 [FacialAnimationManager] 위험! EYE TRACKING Left/Right blendshape 감지: ${leftName}, ${rightName}`);
      return;
    }
    
    const leftIndex = this.currentBlendshapeMap[leftName];
    const rightIndex = this.currentBlendshapeMap[rightName];
    
    let appliedCount = 0;
    
    // 양쪽 블렌드쉐입이 모두 존재하는 경우
    if (leftIndex !== undefined && rightIndex !== undefined) {
      // 🛡️ 최종 보호: 실제 적용 전에도 eye tracking 확인
      if (this.isEyeTrackingBlendshape(leftName) || this.isEyeTrackingBlendshape(rightName)) {
        console.error(`🚨 [FacialAnimationManager] 치명적 오류! EYE TRACKING blendshape 적용 시도: ${leftName}, ${rightName}`);
        return;
      }
      
      blendshapeValuesRef.current[leftIndex] = value;
      blendshapeValuesRef.current[rightIndex] = value;
      applyBlendshapeValue(morphTargetsRef.current, leftIndex, value);
      applyBlendshapeValue(morphTargetsRef.current, rightIndex, value);
      appliedCount = 2;
      
      //console.log(`✅ ${baseBlendshapeName}: 양쪽 적용 (${leftName}: ${leftIndex}, ${rightName}: ${rightIndex}) = ${value}`);
    } else {
      // 개별적으로 확인 및 적용
      if (leftIndex !== undefined && !this.isEyeTrackingBlendshape(leftName)) {
        blendshapeValuesRef.current[leftIndex] = value;
        applyBlendshapeValue(morphTargetsRef.current, leftIndex, value);
        appliedCount++;
      }
      
      if (rightIndex !== undefined && !this.isEyeTrackingBlendshape(rightName)) {
        blendshapeValuesRef.current[rightIndex] = value;
        applyBlendshapeValue(morphTargetsRef.current, rightIndex, value);
        appliedCount++;
      }
      
      // 기본 블렌드쉐입도 확인
      const baseIndex = this.currentBlendshapeMap[baseBlendshapeName];
      if (baseIndex !== undefined && !this.isEyeTrackingBlendshape(baseBlendshapeName)) {
        blendshapeValuesRef.current[baseIndex] = value;
        applyBlendshapeValue(morphTargetsRef.current, baseIndex, value);
        appliedCount++;
      }
      
      if (appliedCount > 0) {
        console.log(`⚠️ ${baseBlendshapeName}: 부분 적용 (${appliedCount}개) = ${value}`);
      } else {
        console.warn(`❌ ${baseBlendshapeName}: 매핑되지 않음 (${this.currentModelName} 모델)`);
      }
    }
  }

  // 애니메이션 타입에 따른 표정 재생
  playAnimationBasedFacial(animationType, morphTargetsRef, blendshapeValuesRef) {
    const facialType = ANIMATION_TO_FACIAL_MAP[animationType];
    if (facialType && morphTargetsRef && blendshapeValuesRef) {
      setTimeout(() => {
        this.playFacialAnimation(facialType, morphTargetsRef, blendshapeValuesRef);
      }, 500); // 0.5초 후 표정 애니메이션 시작
    }
  }

  // 블렌드쉐입 매핑 호환성 검증 함수
  validateBlendshapeMapping() {
    if (!this.currentBlendshapeMap || !this.currentModelName) {
      console.warn('블렌드쉐입 매핑 또는 모델 이름이 설정되지 않음');
      return false;
    }

    console.log(`=== ${this.currentModelName} 모델 블렌드쉐입 매핑 검증 ===`);
    
    // facialAnimationConstants에서 사용되는 모든 블렌드쉐입 이름 수집
    const usedBlendshapes = new Set();
    Object.values(FACIAL_ANIMATION_TEMPLATES).forEach(template => {
      template.keyframes.forEach(keyframe => {
        Object.keys(keyframe.values).forEach(blendshapeName => {
          usedBlendshapes.add(blendshapeName);
        });
      });
    });

    const missingMappings = [];
    const availableMappings = [];

    usedBlendshapes.forEach(blendshapeName => {
      if (this.currentBlendshapeMap[blendshapeName] !== undefined) {
        availableMappings.push(blendshapeName);
      } else {
        missingMappings.push(blendshapeName);
      }
    });

    console.log(`✅ 매핑된 블렌드쉐입 (${availableMappings.length}개):`, availableMappings);
    
    // 🛡️ EYE TRACKING 보호 상태 확인
    console.log('\n=== EYE TRACKING 보호 상태 확인 ===');
    const eyeTrackingBlendshapes = [];
    Object.keys(this.currentBlendshapeMap).forEach(blendshapeName => {
      if (this.isEyeTrackingBlendshape(blendshapeName)) {
        eyeTrackingBlendshapes.push(blendshapeName);
      }
    });
    
    if (eyeTrackingBlendshapes.length > 0) {
      console.log(`🛡️ EYE TRACKING 보호 대상 (${eyeTrackingBlendshapes.length}개):`, eyeTrackingBlendshapes);
      console.log('✅ 이 블렌드쉐입들은 facial animation에서 절대 건드려지지 않습니다');
    } else {
      console.log('⚠️ EYE TRACKING 보호 대상이 없음');
    }
    
    // mouthSmile의 대칭 매핑 상태 확인
    console.log('\n=== mouthSmile 대칭 매핑 확인 ===');
    const mouthSmileLeft = this.currentBlendshapeMap['mouthSmileLeft'];
    const mouthSmileRight = this.currentBlendshapeMap['mouthSmileRight'];
    const mouthSmileBase = this.currentBlendshapeMap['mouthSmile'];
    
    console.log(`mouthSmileLeft: ${mouthSmileLeft !== undefined ? `인덱스 ${mouthSmileLeft}` : '없음'}`);
    console.log(`mouthSmileRight: ${mouthSmileRight !== undefined ? `인덱스 ${mouthSmileRight}` : '없음'}`);
    console.log(`mouthSmile (기본): ${mouthSmileBase !== undefined ? `인덱스 ${mouthSmileBase}` : '없음'}`);
    
    if (mouthSmileLeft !== undefined && mouthSmileRight !== undefined) {
      console.log('✅ mouthSmile 양쪽 매핑 완료 - 대칭적으로 작동할 예정');
    } else if (mouthSmileBase !== undefined) {
      console.log('⚠️ mouthSmile 기본 매핑만 존재 - 한쪽만 작동할 가능성');
    } else {
      console.warn('❌ mouthSmile 매핑이 없음');
    }
    
    if (missingMappings.length > 0) {
      console.warn(`\n❌ 누락된 블렌드쉐입 매핑 (${missingMappings.length}개):`, missingMappings);
    } else {
      console.log('\n🎉 모든 블렌드쉐입이 매핑됨!');
    }

    return missingMappings.length === 0;
  }

  // 리소스 정리
  dispose() {
    if (this.currentFacialAnimation) {
      this.currentFacialAnimation.stop = true;
      this.currentFacialAnimation = null;
    }
    this.defaultFacialState = null;
    this.currentBlendshapeMap = null;
  }
} 
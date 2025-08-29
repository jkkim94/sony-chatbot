import * as THREE from 'three';

export class AnimationManager {
  constructor() {
    this.currentBoneMapping = {};
    this.animationFrameId = null;
    this.lastProcessedResult = null;
    this.lastProcessedTimestamp = null;
    this.isAPIMotionActive = false;
    this.currentAnimationStartTime = null;
    this.currentModelName = null;
    this.poseCorrections = null;
    
    // 씬 모니터링 관련 속성
    this.sceneMonitoring = {
      isActive: false,
      lastModelState: null,
      lastMeshCount: 0,
      lastVisibleMeshCount: 0,
      lastModelPosition: null,
      lastModelRotation: null,
      lastModelScale: null,
      changeDetectionCount: 0,
      lastChangeTime: 0
    };
  }

  // 본 매핑 설정
  setBoneMapping(boneMapping) {
    this.currentBoneMapping = boneMapping;
    console.log('🦴 [AnimationManager] 본 매핑 설정됨:', boneMapping);
  }

  // 씬 모니터링 초기화
  initializeSceneMonitoring(model, skeletonHelper) {
    if (!model) return;
    
    this.sceneMonitoring.isActive = true;
    this.sceneMonitoring.lastModelState = this.captureModelState(model);
    this.sceneMonitoring.lastMeshCount = this.countMeshes(model);
    this.sceneMonitoring.lastVisibleMeshCount = this.countVisibleMeshes(model);
    this.sceneMonitoring.lastModelPosition = model.position.clone();
    this.sceneMonitoring.lastModelRotation = model.rotation.clone();
    this.sceneMonitoring.lastModelScale = model.scale.clone();
    this.sceneMonitoring.changeDetectionCount = 0;
    this.sceneMonitoring.lastChangeTime = Date.now();
    
    // CC4 중첩 메쉬 안정화 관련 속성 초기화
    this.sceneMonitoring.cc4MeshStabilized = false;
    this.sceneMonitoring.cc4VisibleMeshStabilized = false;
    this.sceneMonitoring.stableMeshCount = this.sceneMonitoring.lastMeshCount;
    this.sceneMonitoring.stableVisibleMeshCount = this.sceneMonitoring.lastVisibleMeshCount;
    this.sceneMonitoring.hasInitialDetection = false; // 초기 감지 플래그 추가
    
    console.log('🔍 [AnimationManager] 씬 모니터링 시작:', {
      meshCount: this.sceneMonitoring.lastMeshCount,
      visibleMeshCount: this.sceneMonitoring.lastVisibleMeshCount,
      position: this.sceneMonitoring.lastModelPosition,
      timestamp: this.sceneMonitoring.lastChangeTime,
      cc4Stabilization: {
        meshStabilized: this.sceneMonitoring.cc4MeshStabilized,
        visibleMeshStabilized: this.sceneMonitoring.cc4VisibleMeshStabilized,
        stableMeshCount: this.sceneMonitoring.stableMeshCount,
        stableVisibleMeshCount: this.sceneMonitoring.stableVisibleMeshCount
      }
    });
  }

  // 모델 상태 캡처
  captureModelState(model) {
    if (!model) return null;
    
    const state = {
      visible: model.visible,
      position: model.position.clone(),
      rotation: model.rotation.clone(),
      scale: model.scale.clone(),
      children: model.children.length,
      meshCount: this.countMeshes(model),
      visibleMeshCount: this.countVisibleMeshes(model),
      timestamp: Date.now()
    };
    
    return state;
  }

  // 메시 개수 계산
  countMeshes(model) {
    let count = 0;
    model.traverse((child) => {
      if (child.isMesh) count++;
    });
    return count;
  }

  // 보이는 메시 개수 계산
  countVisibleMeshes(model) {
    let count = 0;
    model.traverse((child) => {
      if (child.isMesh && child.visible) count++;
    });
    return count;
  }

  // 씬 변화 감지 및 로깅
  detectSceneChanges(model) {
    if (!this.sceneMonitoring.isActive || !model) return;
    
    const currentState = this.captureModelState(model);
    const currentTime = Date.now();
    
    // 변화 감지
    let hasChanges = false;
    const changes = [];
    
    // 메시 개수 변화 감지 (CC4 중첩 메쉬 문제 해결)
    if (currentState.meshCount !== this.sceneMonitoring.lastMeshCount) {
      // CC4 모델의 경우 메시 개수가 1 ↔ 20으로 변동될 수 있음
      const meshCountDiff = Math.abs(currentState.meshCount - this.sceneMonitoring.lastMeshCount);
      
      // 메시 개수 변화가 너무 크거나 (CC4 중첩 메쉬 문제) 또는 실제 변화인지 판단
      if (meshCountDiff > 5) {
        // CC4 중첩 메쉬 문제로 인한 변화일 가능성이 높음
        if (!this.sceneMonitoring.cc4MeshStabilized) {
          console.log(`🔧 [AnimationManager] CC4 중첩 메쉬 안정화 중: ${this.sceneMonitoring.lastMeshCount} → ${currentState.meshCount}`);
          this.sceneMonitoring.cc4MeshStabilized = true;
          this.sceneMonitoring.stableMeshCount = Math.max(currentState.meshCount, this.sceneMonitoring.lastMeshCount);
        }
        
        // 안정화된 메시 개수와 비교하여 실제 변화인지 확인
        if (Math.abs(currentState.meshCount - this.sceneMonitoring.stableMeshCount) <= 2) {
          // 안정화된 범위 내의 변화는 무시
          hasChanges = false;
        } else {
          hasChanges = true;
          changes.push(`메시 개수: ${this.sceneMonitoring.lastMeshCount} → ${currentState.meshCount} (CC4 안정화됨)`);
        }
      } else {
        // 일반적인 메시 개수 변화
        hasChanges = true;
        changes.push(`메시 개수: ${this.sceneMonitoring.lastMeshCount} → ${currentState.meshCount}`);
      }
    }
    
    // 보이는 메시 개수 변화 감지 (CC4 중첩 메쉬 문제 해결)
    if (currentState.visibleMeshCount !== this.sceneMonitoring.lastVisibleMeshCount) {
      const visibleMeshCountDiff = Math.abs(currentState.visibleMeshCount - this.sceneMonitoring.lastVisibleMeshCount);
      
      // 보이는 메시 개수 변화가 너무 크거나 (CC4 중첩 메쉬 문제) 또는 실제 변화인지 판단
      if (visibleMeshCountDiff > 5) {
        // CC4 중첩 메쉬 문제로 인한 변화일 가능성이 높음
        if (!this.sceneMonitoring.cc4VisibleMeshStabilized) {
          console.log(`🔧 [AnimationManager] CC4 보이는 메시 안정화 중: ${this.sceneMonitoring.lastVisibleMeshCount} → ${currentState.visibleMeshCount}`);
          this.sceneMonitoring.cc4VisibleMeshStabilized = true;
          this.sceneMonitoring.stableVisibleMeshCount = Math.max(currentState.visibleMeshCount, this.sceneMonitoring.lastVisibleMeshCount);
        }
        
        // 안정화된 보이는 메시 개수와 비교하여 실제 변화인지 확인
        if (Math.abs(currentState.visibleMeshCount - this.sceneMonitoring.stableVisibleMeshCount) <= 2) {
          // 안정화된 범위 내의 변화는 무시
          hasChanges = false;
        } else {
          hasChanges = true;
          changes.push(`보이는 메시: ${this.sceneMonitoring.lastVisibleMeshCount} → ${currentState.visibleMeshCount} (CC4 안정화됨)`);
        }
      } else {
        // 일반적인 보이는 메시 개수 변화
        hasChanges = true;
        changes.push(`보이는 메시: ${this.sceneMonitoring.lastVisibleMeshCount} → ${currentState.visibleMeshCount}`);
      }
    }
    
    // 위치 변화 감지 (큰 변화만)
    const positionDiff = model.position.distanceTo(this.sceneMonitoring.lastModelPosition);
    if (positionDiff > 0.1) {
      hasChanges = true;
      changes.push(`위치 변화: ${positionDiff.toFixed(3)}`);
    }
    
    // 회전 변화 감지 (큰 변화만)
    const rotationDiff = Math.abs(model.rotation.y - this.sceneMonitoring.lastModelRotation.y);
    if (rotationDiff > 0.1) {
      hasChanges = true;
      changes.push(`회전 변화: ${rotationDiff.toFixed(3)}`);
    }
    
    // 변화가 감지된 경우 로깅
    if (hasChanges) {
      this.sceneMonitoring.changeDetectionCount++;
      this.sceneMonitoring.lastChangeTime = currentTime;
      
      console.warn(`🚨 [AnimationManager] 씬 변화 감지 #${this.sceneMonitoring.changeDetectionCount}:`, {
        timestamp: new Date(currentTime).toLocaleTimeString(),
        changes: changes,
        currentState: {
          meshCount: currentState.meshCount,
          visibleMeshCount: currentState.visibleMeshCount,
          position: currentState.position,
          children: currentState.children
        },
        previousState: {
          meshCount: this.sceneMonitoring.lastMeshCount,
          visibleMeshCount: this.sceneMonitoring.lastVisibleMeshCount,
          position: this.sceneMonitoring.lastModelPosition,
          children: this.sceneMonitoring.lastModelState?.children
        },
        cc4Stabilization: {
          meshStabilized: this.sceneMonitoring.cc4MeshStabilized,
          visibleMeshStabilized: this.sceneMonitoring.cc4VisibleMeshStabilized,
          stableMeshCount: this.sceneMonitoring.stableMeshCount,
          stableVisibleMeshCount: this.sceneMonitoring.stableVisibleMeshCount
        }
      });
      
      // 상태 업데이트
      this.sceneMonitoring.lastModelState = currentState;
      this.sceneMonitoring.lastMeshCount = currentState.meshCount;
      this.sceneMonitoring.lastVisibleMeshCount = currentState.visibleMeshCount;
      this.sceneMonitoring.lastModelPosition = currentState.position.clone();
      this.sceneMonitoring.lastModelRotation = currentState.rotation.clone();
      this.sceneMonitoring.lastModelScale = currentState.scale.clone();
    }
  }

  // 현재 모델 설정 (자세 보정 자동 적용)
  setCurrentModel(modelName) {
    console.log(`🎭 [AnimationManager] 모델 설정: ${modelName}`);
    this.currentModelName = modelName;
    this.setPoseCorrections(modelName);
  }

  // 모델을 위한 FBX 애니메이션 설정 준비
  async prepareAnimationForModel(modelName) {
    console.log(`🎭 [AnimationManager] ${modelName} 모델용 FBX 애니메이션 준비 시작`);
    
    try {
      // 현재 모델 설정 (자세 보정 적용)
      this.setCurrentModel(modelName);
      
      // 현재 활성 애니메이션 데이터 확인
      let currentAnimationData = null;
      if (this.isAPIMotionActive && window.animationData && window.animationData.result) {
        try {
          currentAnimationData = JSON.parse(window.animationData.result);
          console.log('📋 [AnimationManager] 현재 활성 FBX 애니메이션 데이터 확인됨');
        } catch (e) {
          console.warn('현재 애니메이션 데이터 파싱 실패:', e);
        }
      }
      
      // FBX 애니메이션 설정 반환
      const animationSettings = {
        modelName,
        boneMapping: this.currentBoneMapping,
        poseCorrections: this.poseCorrections,
        isAPIMotionActive: this.isAPIMotionActive,
        currentAnimationData,
        timestamp: Date.now()
      };
      
      console.log(`✅ [AnimationManager] ${modelName} FBX 애니메이션 설정 준비 완료`);
      return animationSettings;
      
    } catch (error) {
      console.error(`❌ [AnimationManager] ${modelName} FBX 애니메이션 준비 실패:`, error);
      return null;
    }
  }

  // 새 모델에 현재 애니메이션 상태 즉시 적용 (T-pose 방지)
  applyCurrentAnimationToNewModel(model, skeletonHelper) {
    if (this.isAPIMotionActive && window.animationData && window.animationData.result) {
      try {
        const animationData = JSON.parse(window.animationData.result);
        if (animationData.bones) {
          console.log('🎬 [AnimationManager] 새 모델에 현재 애니메이션 상태 즉시 적용');
          this.applyAPIAnimationData(animationData, model, skeletonHelper);
        }
      } catch (e) {
        console.warn('새 모델에 애니메이션 적용 실패:', e);
      }
    } else {
      // 기본 애니메이션이나 FBX 애니메이션 데이터가 있으면 적용
      if (window.animationData && Object.keys(window.animationData).length > 0) {
        console.log('🎬 [AnimationManager] 새 모델에 기본/FBX 애니메이션 상태 즉시 적용');
        this.applyFBXAnimationData(window.animationData, model, skeletonHelper);
      } else {
        console.log('⚠️ [AnimationManager] 적용할 애니메이션 데이터가 없음');
      }
    }
  }

  // 본 계층 구조 정의 (FBX 본 이름 기준 - Mixamo 표준 구조)
  getBoneHierarchy() {
    return {
      'mixamorigHips': {
        children: ['mixamorigSpine', 'mixamorigLeftUpLeg', 'mixamorigRightUpLeg'],
        isRoot: true
      },
      'mixamorigSpine': {
        children: ['mixamorigSpine1'],
        parent: 'mixamorigHips'
      },
      'mixamorigSpine1': {
        children: ['mixamorigSpine2'],
        parent: 'mixamorigSpine'
      },
      'mixamorigSpine2': {
        children: ['mixamorigNeck', 'mixamorigLeftShoulder', 'mixamorigRightShoulder'],
        parent: 'mixamorigSpine1'
      },
      'mixamorigNeck': {
        children: ['mixamorigHead'],
        parent: 'mixamorigSpine2'
      },
      'mixamorigHead': {
        children: ['mixamorigHeadTop_End'],
        parent: 'mixamorigNeck'
      },
      'mixamorigHeadTop_End': {
        children: [],
        parent: 'mixamorigHead'
      },
      'mixamorigLeftShoulder': {
        children: ['mixamorigLeftArm'],
        parent: 'mixamorigSpine2'
      },
      'mixamorigLeftArm': {
        children: ['mixamorigLeftForeArm'],
        parent: 'mixamorigLeftShoulder'
      },
      'mixamorigLeftForeArm': {
        children: ['mixamorigLeftHand'],
        parent: 'mixamorigLeftArm'
      },
      'mixamorigLeftHand': {
        children: ['mixamorigLeftHandThumb1', 'mixamorigLeftHandIndex1', 'mixamorigLeftHandMiddle1', 'mixamorigLeftHandRing1', 'mixamorigLeftHandPinky1'],
        parent: 'mixamorigLeftForeArm'
      },
      'mixamorigRightShoulder': {
        children: ['mixamorigRightArm'],
        parent: 'mixamorigSpine2'
      },
      'mixamorigRightArm': {
        children: ['mixamorigRightForeArm'],
        parent: 'mixamorigRightShoulder'
      },
      'mixamorigRightForeArm': {
        children: ['mixamorigRightHand'],
        parent: 'mixamorigRightArm'
      },
      'mixamorigRightHand': {
        children: ['mixamorigRightHandThumb1', 'mixamorigRightHandIndex1', 'mixamorigRightHandMiddle1', 'mixamorigRightHandRing1', 'mixamorigRightHandPinky1'],
        parent: 'mixamorigRightForeArm'
      },
      'mixamorigLeftUpLeg': {
        children: ['mixamorigLeftLeg'],
        parent: 'mixamorigHips'
      },
      'mixamorigLeftLeg': {
        children: ['mixamorigLeftFoot'],
        parent: 'mixamorigLeftUpLeg'
      },
      'mixamorigLeftFoot': {
        children: ['mixamorigLeftToeBase'],
        parent: 'mixamorigLeftLeg',
        skipRotation: true
      },
      'mixamorigLeftToeBase': {
        children: ['mixamorigLeftToe_End'],
        parent: 'mixamorigLeftFoot',
        skipRotation: true
      },
      'mixamorigLeftToe_End': {
        children: [],
        parent: 'mixamorigLeftToeBase',
        skipRotation: true
      },
      'mixamorigRightUpLeg': {
        children: ['mixamorigRightLeg'],
        parent: 'mixamorigHips'
      },
      'mixamorigRightLeg': {
        children: ['mixamorigRightFoot'],
        parent: 'mixamorigRightUpLeg'
      },
      'mixamorigRightFoot': {
        children: ['mixamorigRightToeBase'],
        parent: 'mixamorigRightLeg',
        skipRotation: true
      },
      'mixamorigRightToeBase': {
        children: ['mixamorigRightToe_End'],
        parent: 'mixamorigRightFoot',
        skipRotation: true
      },
      'mixamorigRightToe_End': {
        children: [],
        parent: 'mixamorigRightToeBase',
        skipRotation: true
      },
      // 손가락 본 추가 (Mixamo 표준)
      'mixamorigLeftHandThumb1': { children: ['mixamorigLeftHandThumb2'], parent: 'mixamorigLeftHand' },
      'mixamorigLeftHandThumb2': { children: ['mixamorigLeftHandThumb3'], parent: 'mixamorigLeftHandThumb1' },
      'mixamorigLeftHandThumb3': { children: ['mixamorigLeftHandThumb4'], parent: 'mixamorigLeftHandThumb2' },
      'mixamorigLeftHandThumb4': { children: [], parent: 'mixamorigLeftHandThumb3' },
      'mixamorigLeftHandIndex1': { children: ['mixamorigLeftHandIndex2'], parent: 'mixamorigLeftHand' },
      'mixamorigLeftHandIndex2': { children: ['mixamorigLeftHandIndex3'], parent: 'mixamorigLeftHandIndex1' },
      'mixamorigLeftHandIndex3': { children: ['mixamorigLeftHandIndex4'], parent: 'mixamorigLeftHandIndex2' },
      'mixamorigLeftHandIndex4': { children: [], parent: 'mixamorigLeftHandIndex3' },
      'mixamorigLeftHandMiddle1': { children: ['mixamorigLeftHandMiddle2'], parent: 'mixamorigLeftHand' },
      'mixamorigLeftHandMiddle2': { children: ['mixamorigLeftHandMiddle3'], parent: 'mixamorigLeftHandMiddle1' },
      'mixamorigLeftHandMiddle3': { children: ['mixamorigLeftHandMiddle4'], parent: 'mixamorigLeftHandMiddle2' },
      'mixamorigLeftHandMiddle4': { children: [], parent: 'mixamorigLeftHandMiddle3' },
      'mixamorigLeftHandRing1': { children: ['mixamorigLeftHandRing2'], parent: 'mixamorigLeftHand' },
      'mixamorigLeftHandRing2': { children: ['mixamorigLeftHandRing3'], parent: 'mixamorigLeftHandRing1' },
      'mixamorigLeftHandRing3': { children: ['mixamorigLeftHandRing4'], parent: 'mixamorigLeftHandRing2' },
      'mixamorigLeftHandRing4': { children: [], parent: 'mixamorigLeftHandRing3' },
      'mixamorigLeftHandPinky1': { children: ['mixamorigLeftHandPinky2'], parent: 'mixamorigLeftHand' },
      'mixamorigLeftHandPinky2': { children: ['mixamorigLeftHandPinky3'], parent: 'mixamorigLeftHandPinky1' },
      'mixamorigLeftHandPinky3': { children: ['mixamorigLeftHandPinky4'], parent: 'mixamorigLeftHandPinky2' },
      'mixamorigLeftHandPinky4': { children: [], parent: 'mixamorigLeftHandPinky3' },
      'mixamorigRightHandThumb1': { children: ['mixamorigRightHandThumb2'], parent: 'mixamorigRightHand' },
      'mixamorigRightHandThumb2': { children: ['mixamorigRightHandThumb3'], parent: 'mixamorigRightHandThumb1' },
      'mixamorigRightHandThumb3': { children: ['mixamorigRightHandThumb4'], parent: 'mixamorigRightHandThumb2' },
      'mixamorigRightHandThumb4': { children: [], parent: 'mixamorigRightHandThumb3' },
      'mixamorigRightHandIndex1': { children: ['mixamorigRightHandIndex2'], parent: 'mixamorigRightHand' },
      'mixamorigRightHandIndex2': { children: ['mixamorigRightHandIndex3'], parent: 'mixamorigRightHandIndex1' },
      'mixamorigRightHandIndex3': { children: ['mixamorigRightHandIndex4'], parent: 'mixamorigRightHandIndex2' },
      'mixamorigRightHandIndex4': { children: [], parent: 'mixamorigRightHandIndex3' },
      'mixamorigRightHandMiddle1': { children: ['mixamorigRightHandMiddle2'], parent: 'mixamorigRightHand' },
      'mixamorigRightHandMiddle2': { children: ['mixamorigRightHandMiddle3'], parent: 'mixamorigRightHandMiddle1' },
      'mixamorigRightHandMiddle3': { children: ['mixamorigRightHandMiddle4'], parent: 'mixamorigRightHandMiddle2' },
      'mixamorigRightHandMiddle4': { children: [], parent: 'mixamorigRightHandMiddle3' },
      'mixamorigRightHandRing1': { children: ['mixamorigRightHandRing2'], parent: 'mixamorigRightHand' },
      'mixamorigRightHandRing2': { children: ['mixamorigRightHandRing3'], parent: 'mixamorigRightHandRing1' },
      'mixamorigRightHandRing3': { children: ['mixamorigRightHandRing4'], parent: 'mixamorigRightHandRing2' },
      'mixamorigRightHandRing4': { children: [], parent: 'mixamorigRightHandRing3' },
      'mixamorigRightHandPinky1': { children: ['mixamorigRightHandPinky2'], parent: 'mixamorigRightHand' },
      'mixamorigRightHandPinky2': { children: ['mixamorigRightHandPinky3'], parent: 'mixamorigRightHandPinky1' },
      'mixamorigRightHandPinky3': { children: ['mixamorigRightHandPinky4'], parent: 'mixamorigRightHandPinky2' },
      'mixamorigRightHandPinky4': { children: [], parent: 'mixamorigRightHandPinky3' }
    };
  }

  // 모델별 자세 보정값 설정
  setPoseCorrections(modelName) {
    this.currentModelName = modelName;
    this.poseCorrections = this.poseCorrections || {};
    
    // 모델별 자세 보정 정의
    if (modelName === 'man') {
      this.poseCorrections[modelName] = {
        'mixamorigLeftShoulder': { rotationY: -1.00 },
        'mixamorigLeftShoulder': { rotationX: 0.4 },
        'mixamorigRightShoulder': { rotationY: -1.0 },
        'mixamorigRightShoulder': { rotationX: 0.2 },
        'mixamorigNeck': { rotationX: -0.3 },
        'mixamorigHead': { rotationX: -0.3 }
      };
      console.log(`🧍 [AnimationManager] ${modelName} 어깨 자세 보정 설정`);
    }
    else if (modelName === 'woman') {
      this.poseCorrections[modelName] = {
        'mixamorigNeck': { rotationX: -0.3 },  // 고정값: 목 앞으로 숙임
        'mixamorigHead': { 
          rotationY: 0.1,  // 고개 좌우 회전 (카메라 방향)
          rotationZ: 0.1,  // 고개 기울기
          rotationX: -0.2   // 고정값: 고개 앞으로 숙임
        }
      };
      console.log(`🧍 [AnimationManager] ${modelName} 목/머리 자세 보정 설정 (고개 회전 포함)`);
    }
    else {
      this.poseCorrections[modelName] = {};
      console.log(`🧍 [AnimationManager] ${modelName} 자세 보정 없음`);
    }
    
    console.log(`✅ [AnimationManager] ${modelName} 자세 보정 설정 완료:`, this.poseCorrections[modelName]);
  }

  // FBX 애니메이션 데이터 적용 함수 (기본 자세 오프셋 포함)
  applyFBXAnimationData(animationData, model, skeletonHelper) {
    if (!model || !animationData) return;

    const armature = model.getObjectByName('Armature');
    if (!armature) return;

    const boneHierarchy = this.getBoneHierarchy();

    // 현재 모델의 본 매핑 사용
    Object.entries(this.currentBoneMapping).forEach(([fbxBoneName, glbBoneName]) => {
      const bone = armature.getObjectByName(glbBoneName);
      if (!bone || !animationData[fbxBoneName]) return;

      const { quaternion } = animationData[fbxBoneName];
      const boneInfo = boneHierarchy[fbxBoneName];

      if (!boneInfo) {
        console.warn(`본 정보를 찾을 수 없음: ${fbxBoneName}`);
        return;
      }

      // 회전만 적용 (로컬 좌표계 기준) + 자세 보정 적용
      if (quaternion && !boneInfo.skipRotation) {
        let finalQuaternion = new THREE.Quaternion(
          quaternion.x,
          quaternion.y,
          quaternion.z,
          quaternion.w
        );
        
        // 자세 보정 적용 (해당 본에 보정이 있는 경우)
        if (this.poseCorrections && this.currentModelName && this.poseCorrections[this.currentModelName]) {
          const correction = this.poseCorrections[this.currentModelName][fbxBoneName];
          if (correction) {
            // 보정 회전을 오일러 각도에서 쿼터니언으로 변환
            const correctionEuler = new THREE.Euler(
              correction.rotationX || 0,
              correction.rotationY || 0,
              correction.rotationZ || 0,
              'XYZ'
            );
            const correctionQuaternion = new THREE.Quaternion().setFromEuler(correctionEuler);
            
            // 원본 쿼터니언에 보정 쿼터니언을 곱함 (회전 합성)
            finalQuaternion.multiply(correctionQuaternion);
            
            // 로그는 첫 번째 프레임에만 출력 (스팸 방지)
            if (!this.loggedCorrections) {
              this.loggedCorrections = new Set();
            }
            if (!this.loggedCorrections.has(fbxBoneName)) {
              console.log(`🧍 [AnimationManager] ${fbxBoneName} 자세 보정 활성화:`, correction);
              this.loggedCorrections.add(fbxBoneName);
            }
          }
        }

        if (boneInfo.isRoot) {
          // 루트 본은 월드 회전 그대로 적용
          bone.quaternion.copy(finalQuaternion);
        } else {
          // 부모 본의 월드 쿼터니언을 사용하여 로컬 쿼터니언 계산
          const parentBoneName = this.currentBoneMapping[boneInfo.parent];
          if (parentBoneName) {
            const parentBone = armature.getObjectByName(parentBoneName);
            if (parentBone) {
              const parentWorldQuaternion = new THREE.Quaternion();
              parentBone.getWorldQuaternion(parentWorldQuaternion);
              const parentWorldQuaternionInverse = parentWorldQuaternion.clone().invert();
              const localQuaternion = parentWorldQuaternionInverse.multiply(finalQuaternion);

              bone.quaternion.copy(localQuaternion);
            }
          }
        }
      }

      // 스케일은 원래대로 유지
      bone.scale.set(1, 1, 1);
    });

    // 본 업데이트
    armature.updateMatrixWorld(true);

    // 스켈레톤 헬퍼 업데이트
    if (skeletonHelper) {
      skeletonHelper.updateMatrix();
    }
    
      // 씬 변화 감지 (FBX 애니메이션 적용 후) - 한 번만 실행
  if (this.sceneMonitoring.isActive && !this.sceneMonitoring.hasInitialDetection) {
    this.detectSceneChanges(model);
    this.sceneMonitoring.hasInitialDetection = true;
  }
  }

  // API 애니메이션 데이터 적용 함수
  applyAPIAnimationData(animationData, model, skeletonHelper) {
    if (!model) return;

    const armature = model.getObjectByName('Armature');
    if (!armature) return;

    // 현재 애니메이션 시간 계산
    const currentTime = ((Date.now() - this.currentAnimationStartTime) / 1000);

    // 모든 본의 프레임 시간을 수집
    const allFrameTimes = new Set();
    Object.values(animationData.bones).forEach(boneData => {
      ['position', 'rotation'].forEach(transformType => {
        if (boneData[transformType]) {
          Object.keys(boneData[transformType]).forEach(time => {
            allFrameTimes.add(parseFloat(time));
          });
        }
      });
    });

    const sortedFrameTimes = Array.from(allFrameTimes).sort((a, b) => a - b);
    if (sortedFrameTimes.length === 0) return false;

    // 현재 시간에 해당하는 프레임 찾기
    let currentFrameIndex = sortedFrameTimes.findIndex(time => time > currentTime) - 1;
    if (currentFrameIndex < 0) currentFrameIndex = sortedFrameTimes.length - 1;

    const currentFrameTime = sortedFrameTimes[currentFrameIndex];

    // 눈동자 관련 블렌드셰이프 이름들 (API 애니메이션 중 제외)
    const eyeBlendshapeNames = [
      'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight',
      'Eye_Look_In_Left', 'Eye_Look_In_Right', 'Eye_Look_Out_Left', 'Eye_Look_Out_Right',
      'eyeLookIn_L', 'eyeLookIn_R', 'eyeLookOut_L', 'eyeLookOut_R',
      'LeftEyeLookIn', 'RightEyeLookIn', 'LeftEyeLookOut', 'RightEyeLookOut',
      'EyeLookInLeft', 'EyeLookInRight', 'EyeLookOutLeft', 'EyeLookOutRight',
      'eye_look_in_left', 'eye_look_in_right', 'eye_look_out_left', 'eye_look_out_right',
      'left_eye_look_in', 'right_eye_look_in', 'left_eye_look_out', 'right_eye_look_out'
    ];

    // 각 본에 대해 애니메이션 데이터 적용 (눈동자 블렌드셰이프 제외)
    Object.entries(animationData.bones).forEach(([boneName, boneData]) => {
      // 눈동자 관련 블렌드셰이프는 API 애니메이션 중 제외 (카메라 추적과의 충돌 방지)
      if (eyeBlendshapeNames.includes(boneName)) {
        console.log(`👁️ [AnimationManager] API 애니메이션 중 눈동자 블렌드셰이프 제외: ${boneName} (카메라 추적 유지)`);
        return;
      }

      const bone = armature.getObjectByName(boneName);
      if (!bone) return;

      ['position', 'rotation'].forEach(transformType => {
        if (boneData[transformType]) {
          const frameData = boneData[transformType][currentFrameTime.toString()];
          if (!frameData) return;

          if (transformType === 'position') {
            bone.position.set(
              frameData[0],
              frameData[1],
              frameData[2]
            );
          } else {
            bone.quaternion.set(
              frameData[0],
              frameData[1],
              frameData[2],
              frameData[3]
            );
          }
        }
      });
    });

    armature.updateMatrixWorld(true);
    if (skeletonHelper) {
      skeletonHelper.updateMatrix();
    }

    // 애니메이션이 끝났는지 확인
    return currentTime <= sortedFrameTimes[sortedFrameTimes.length - 1];
  }

  // 애니메이션 데이터 처리 시작
  startAnimationLoop(model, skeletonHelper) {
    let lastAnimationData = null;
    let isAnimating = false;
    let lastValidQuaternions = {};
    let hasValidAnimationData = false;
    
    // 씬 모니터링 시작
    this.initializeSceneMonitoring(model, skeletonHelper);

    const checkAnimationData = () => {
      if (window.animationData) {
        // API 응답 데이터인지 확인
        if (window.animationData.result) {
          try {
            const currentTimestamp = Date.now();

            // 이미 처리한 응답이거나 1초 이내에 동일한 응답이 온 경우 무시
            if (window.animationData.result === this.lastProcessedResult &&
              currentTimestamp - this.lastProcessedTimestamp < 1000) {
              this.animationFrameId = requestAnimationFrame(checkAnimationData);
              return;
            }

            const animationData = JSON.parse(window.animationData.result);
            console.log('새로운 API 애니메이션 데이터 수신');

            if (animationData.bones) {
              // API 애니메이션 시작 전에 BlinkingManager에 즉시 알림 (weight 저장을 위해)
              // 구조 개선: 상위에서 타이밍 관리하도록 변경
              /*
              if (this.blinkingManager) {
                // console.log('🔗 [AnimationManager] BlinkingManager에 API 애니메이션 시작 알림 - BLINK 중단');
                this.blinkingManager.control('stop');
              } else if (window.blinkingManager) {
                // console.log('🔗 [AnimationManager] window.blinkingManager에 API 애니메이션 시작 알림 (fallback) - BLINK 중단');
                window.blinkingManager.control('stop');
              } else {
                console.warn('⚠️ [AnimationManager] BlinkingManager를 찾을 수 없음');
              }
              */
              
              // console.log('🎭 [AnimationManager] API 애니메이션 시작 - 상위에서 타이밍 관리 필요');
              
              // 이전 애니메이션 중단
              if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
              }

              this.isAPIMotionActive = true;
              this.currentAnimationStartTime = Date.now();
              this.lastProcessedResult = window.animationData.result;
              this.lastProcessedTimestamp = currentTimestamp;

              // 새로운 애니메이션 데이터 적용
              const applyNewAnimation = () => {
                const isStillPlaying = this.applyAPIAnimationData(animationData, model, skeletonHelper);

                if (!isStillPlaying) {
                  console.log('API 애니메이션 완료 - 정리 시작');
                  this.isAPIMotionActive = false;
                  this.lastProcessedResult = null;

                  // window.animationData 정리 (반복 방지)
                  if (window.animationData && window.animationData.result) {
                    console.log('window.animationData 정리');
                    delete window.animationData.result;
                  }

                  // 애니메이션이 끝나면 다음 애니메이션을 위해 체크 루프 재시작
                  this.animationFrameId = requestAnimationFrame(checkAnimationData);
                  return;
                }

                // 다음 프레임 요청
                this.animationFrameId = requestAnimationFrame(applyNewAnimation);
              };

              // 새로운 애니메이션 시작
              applyNewAnimation();
            } else {
              console.warn('API 응답에 bones 데이터가 없습니다:', animationData);
              this.lastProcessedResult = null;
              this.animationFrameId = requestAnimationFrame(checkAnimationData);
            }
          } catch (e) {
            console.error('API 애니메이션 데이터 파싱 실패:', e);
            this.isAPIMotionActive = false;
            this.lastProcessedResult = null;
            this.animationFrameId = requestAnimationFrame(checkAnimationData);
          }
        } else if (!this.isAPIMotionActive) {
          // FBX 애니메이션 데이터 처리
          if (window.animationData && Object.keys(window.animationData).length > 0) {
            lastAnimationData = window.animationData;
            isAnimating = true;
            hasValidAnimationData = true;

            Object.entries(this.currentBoneMapping).forEach(([fbxBoneName, glbBoneName]) => {
              if (window.animationData[fbxBoneName]?.quaternion) {
                const quat = window.animationData[fbxBoneName].quaternion;
                lastValidQuaternions[glbBoneName] = new THREE.Quaternion(
                  quat.x,
                  quat.y,
                  quat.z,
                  quat.w
                );
              }
            });

            this.applyFBXAnimationData(window.animationData, model, skeletonHelper);
            
            // IDLE 애니메이션 중 woman 모델 고개 회전 강제 적용
            this.forceHeadRotationForIdle(model, skeletonHelper);
            
            // 씬 변화 감지 (로그 빈도 제한) - 한 번만 실행
            const currentTime = Date.now();
            if (currentTime - this.sceneMonitoring.lastChangeTime > 1000 && !this.sceneMonitoring.hasInitialDetection) { // 1초마다만 체크, 한 번만 실행
              this.detectSceneChanges(model);
              this.sceneMonitoring.hasInitialDetection = true;
            }
            
            // 로그 빈도 제한 (무한 로그 방지)
            if (!this.lastFBXLogTime || currentTime - this.lastFBXLogTime > 10000) { // 10초마다만 로그
              // console.log('🎬 [AnimationManager] FBX 애니메이션 데이터 처리 완료');
              this.lastFBXLogTime = currentTime;
            }
          } else {
            // 로그 빈도 제한 (무한 로그 방지)
            const currentTime = Date.now();
            if (!this.lastNoDataLogTime || currentTime - this.lastNoDataLogTime > 10000) { // 10초마다만 로그
              console.log('⚠️ [AnimationManager] FBX 애니메이션 데이터가 없음');
              this.lastNoDataLogTime = currentTime;
            }
          }
        }
      } else if (isAnimating && hasValidAnimationData && !this.isAPIMotionActive) {
        // FBX 애니메이션 데이터가 중단되었을 때 마지막 상태 유지
        const frozenAnimationData = { ...lastAnimationData };

        Object.entries(this.currentBoneMapping).forEach(([fbxBoneName, glbBoneName]) => {
          if (lastValidQuaternions[glbBoneName]) {
            const quat = lastValidQuaternions[glbBoneName];
            frozenAnimationData[fbxBoneName] = {
              ...frozenAnimationData[fbxBoneName],
              quaternion: {
                x: quat.x,
                y: quat.y,
                z: quat.z,
                w: quat.w
              }
            };
          }
        });

        if (Object.keys(lastValidQuaternions).length > 0) {
          this.applyFBXAnimationData(frozenAnimationData, model, skeletonHelper);
          
          // IDLE 애니메이션 중 woman 모델 고개 회전 강제 적용 (frozen 상태에서도)
          this.forceHeadRotationForIdle(model, skeletonHelper);
        }
      }

      // 다음 프레임 요청
      if (!this.isAPIMotionActive) {
        this.animationFrameId = requestAnimationFrame(checkAnimationData);
      }
    };

    // 애니메이션 시작
    checkAnimationData();
  }

  // 애니메이션 중단
  stopAnimationLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isAPIMotionActive = false;
    this.lastProcessedResult = null;
  }

  // IDLE 애니메이션 중 고개 회전 강제 적용 (woman 모델용)
  forceHeadRotationForIdle(model, skeletonHelper) {
    if (!model || this.currentModelName !== 'woman') return;
    
    // 현재 재생 중인 애니메이션 확인
    const currentAnimation = this.getCurrentAnimationName();
    const isIdleAnimation = currentAnimation && (
      currentAnimation === 'Idle' || 
      currentAnimation === 'Breathing Idle' || 
      currentAnimation === 'Happy Idle' || 
      currentAnimation === 'Sad Idle'
    );
    
    if (!isIdleAnimation) return;
    
    console.log('👩 [AnimationManager] IDLE 애니메이션 중 woman 모델 고개 회전 강제 적용');
    
    const armature = model.getObjectByName('Armature');
    if (!armature) return;
    
    // 고개 본 찾기
    const headBoneName = this.currentBoneMapping['mixamorigHead'];
    if (!headBoneName) return;
    
    const headBone = armature.getObjectByName(headBoneName);
    if (!headBone) return;
    
    // 고개 회전 강제 적용
    const headRotationY = -0.8;  // 좌우 회전 (카메라 방향)
    const headRotationZ = -0.5;  // 기울기
    const headRotationX = -0.3;  // 앞으로 숙임
    
    // 현재 회전값과 비교하여 변경이 필요한 경우만 적용
    const currentRotationY = headBone.rotation.y;
    const currentRotationZ = headBone.rotation.z;
    const currentRotationX = headBone.rotation.x;
    
    let rotationChanged = false;
    
    if (Math.abs(currentRotationY - headRotationY) > 0.01) {
      headBone.rotation.y = headRotationY;
      rotationChanged = true;
    }
    
    if (Math.abs(currentRotationZ - headRotationZ) > 0.01) {
      headBone.rotation.z = headRotationZ;
      rotationChanged = true;
    }
    
    if (Math.abs(currentRotationX - headRotationX) > 0.01) {
      headBone.rotation.x = headRotationX;
      rotationChanged = true;
    }
    
    if (rotationChanged) {
      console.log('👩 [AnimationManager] 고개 회전 강제 적용:', {
        y: headRotationY.toFixed(3),
        z: headRotationZ.toFixed(3),
        x: headRotationX.toFixed(3)
      });
      
      // 본 업데이트
      armature.updateMatrixWorld(true);
      
      // 스켈레톤 헬퍼 업데이트
      if (skeletonHelper) {
        skeletonHelper.updateMatrix();
      }
    }
  }
  
  // 현재 재생 중인 애니메이션 이름 가져오기
  getCurrentAnimationName() {
    if (window.animationData && Object.keys(window.animationData).length > 0) {
      // FBX 애니메이션 데이터에서 애니메이션 이름 추출 시도
      for (const key of Object.keys(window.animationData)) {
        if (key !== 'result' && key !== 'timestamp') {
          return key;
        }
      }
    }
    return null;
  }

  // BlinkingManager 참조 설정 - 구조 개선으로 제거됨
  /*
  setBlinkingManager(blinkingManager) {
    this.blinkingManager = blinkingManager;
    console.log('🔗 [AnimationManager] BlinkingManager 참조 설정 완료');
  }
  */

  // 리소스 정리
  dispose() {
    this.stopAnimationLoop();
    this.currentBoneMapping = {};
  }
} 
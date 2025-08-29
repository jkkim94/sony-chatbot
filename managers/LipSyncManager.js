import * as THREE from 'three';

export class LipSyncManager {
  constructor() {
    this.currentBlendshapeMap = null;
    this.currentModel = null;
  }

  // 블렌드쉐입 매핑 및 모델 설정
  setBlendshapeMap(blendshapeMap) {
    this.currentBlendshapeMap = blendshapeMap;
  }

  setCurrentModel(modelName) {
    this.currentModel = modelName;
  }

  // 오디오 데이터에 따른 블렌드쉐입 업데이트
  updateLipSync(audioData, visemeData, morphTargetsRef, blendshapeValuesRef) {
    if (!morphTargetsRef.current.head || !this.currentBlendshapeMap) {
      console.log('립싱크 업데이트 조건 미충족:', {
        modelExists: !!morphTargetsRef.current.head,
        blendshapeMapExists: !!this.currentBlendshapeMap
      });
      return;
    }

    const { head } = morphTargetsRef.current;
    const currentValues = blendshapeValuesRef.current;
    const lerpFactor = 0.3;

    console.log('현재 viseme:', visemeData);

    // 기본적인 립싱크 블렌드쉐입 업데이트
    const updateBlendshape = (blendshapeName, targetValue) => {
      if (isNaN(targetValue)) {
        console.log(`잘못된 targetValue: ${targetValue}`);
        return;
      }

      const morphIndex = this.currentBlendshapeMap[blendshapeName];
      if (morphIndex === undefined) {
        console.log(`블렌드쉐입을 찾을 수 없음: ${blendshapeName}`);
        return;
      }

      const currentValue = currentValues[morphIndex] || 0;
      const newValue = THREE.MathUtils.lerp(currentValue, targetValue, lerpFactor);
      currentValues[morphIndex] = newValue;

      // Avatar 메시 업데이트
      if (head.mesh.morphTargetInfluences && morphIndex < head.mesh.morphTargetInfluences.length) {
        head.mesh.morphTargetInfluences[morphIndex] = newValue;
      }
    };

    // 기본 입 모양
    const adjustedMouthOpen = Math.max(0, (audioData?.mouthOpen ?? 0));
    updateBlendshape('mouthOpen', adjustedMouthOpen * 0.3); // 입 크기 30%로 제한
    
    // YuHa 모델의 경우 mouthClose 대신 다른 처리
    if (this.currentModel !== 'yuha') {
      updateBlendshape('mouthClose', (audioData?.mouthOpen ?? 0) * 0.3); // 입 크기 30%로 제한
    }

    // viseme에 따른 입 모양 업데이트
    if (visemeData) {
      // 모든 viseme 블렌드쉐입 초기화
      Object.keys(this.currentBlendshapeMap).forEach(key => {
        if (key.startsWith('viseme_')) {
          updateBlendshape(key, 0);
        }
      });

      // 현재 viseme에 해당하는 블렌드쉐입만 활성화
      const visemeName = `viseme_${visemeData.viseme}`;
      if (this.currentBlendshapeMap[visemeName] !== undefined) {
        console.log(`Viseme 블렌드쉐입 적용: ${visemeName}, 강도: ${visemeData.intensity}`);
        updateBlendshape(visemeName, visemeData.intensity * 0.3); // viseme 강도도 30%로 제한
      } else {
        console.log(`Viseme 블렌드쉐입을 찾을 수 없음: ${visemeName}`);
      }
    }
  }

  // 리소스 정리
  dispose() {
    this.currentBlendshapeMap = null;
    this.currentModel = null;
  }
}
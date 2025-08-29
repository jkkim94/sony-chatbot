// 블렌드쉐이프 값을 적용하는 공통 함수
export const applyBlendshapeValue = (morphTargets, morphIndex, newValue) => {
    if (!morphTargets.head) {
      console.warn('❌ morphTargets.head가 없음');
      return;
    }
    
    const { mesh, meshes, meshCount } = morphTargets.head;
    
    // 🎯 모델별 증폭 메시 정의
    const getAmplifiedValue = (meshName, value) => {
      // woman 모델: CC_Base_Body002_3
      //if (meshName === 'CC_Base_Body005_5') {
      //  return value * 1.5;
      //}
      // man 모델: CC_Base_Body004_8, CC_Base_Body004_7
      //if (meshName === 'CC_Base_Body004_8' || meshName === 'CC_Base_Body004_7') {
      //  return value * 2;
      //}
      return value;
    };
    
    if (meshCount === 1 || !meshes) {
      // 단일 메시 처리 (기존 방식)
      if (mesh.morphTargetInfluences && morphIndex < mesh.morphTargetInfluences.length) {
        const amplifiedValue = getAmplifiedValue(mesh.name, newValue);
        mesh.morphTargetInfluences[morphIndex] = Math.min(amplifiedValue, 1.0); // 1.0 초과 방지
        
        if (amplifiedValue !== newValue) {
          //console.log(`🎯 [blendshapeUtils] ${mesh.name} 증폭: ${newValue} → ${amplifiedValue.toFixed(3)}`);
        }
      } else {
        console.warn(`❌ 단일 메시 업데이트 실패: ${mesh.name}, morphIndex: ${morphIndex}, influences 길이: ${mesh.morphTargetInfluences?.length}`);
      }
    } else {
      // 다중 메시 처리 - 각 메시의 범위 내에서만 업데이트
      let updatedCount = 0;
      meshes.forEach((mesh, index) => {
        if (mesh.morphTargetInfluences && morphIndex < mesh.morphTargetInfluences.length) {
          const amplifiedValue = getAmplifiedValue(mesh.name, newValue);
          mesh.morphTargetInfluences[morphIndex] = Math.min(amplifiedValue, 1.0); // 1.0 초과 방지
          
          if (amplifiedValue !== newValue) {
           // console.log(`🎯 [blendshapeUtils] ${mesh.name} 증폭: ${newValue} → ${amplifiedValue.toFixed(3)}`);
          }
          
          updatedCount++;
        }
        // 범위를 벗어나면 무시 (에러 아님)
      });
      
      // 모든 메시에서 업데이트 실패한 경우에만 경고
      if (updatedCount === 0) {
        console.warn(`⚠️ morphIndex ${morphIndex}가 어떤 메시에도 존재하지 않음`);
      }
    }
  };
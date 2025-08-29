// 기본 블렌드쉐입 매핑 
const ModelBlendshapeMap = {
  // 기본 표정
  mouthOpen: 0,
  mouthSmile: 16,
  jawOpen: 50,
  mouthClose: 51,

  // Viseme 블렌드쉐입
  viseme_sil: 1,
  viseme_PP: 2,
  viseme_FF: 3,
  viseme_TH: 4,
  viseme_DD: 5,
  viseme_kk: 6,
  viseme_CH: 7,
  viseme_SS: 8,
  viseme_nn: 9,
  viseme_RR: 10,
  viseme_aa: 11,
  viseme_E: 12,
  viseme_I: 13,
  viseme_O: 14,
  viseme_U: 15,

  // 눈 관련
  eyeBlinkLeft: 67,
  eyeBlinkRight: 68,
  eyeSquintLeft: 22,
  eyeSquintRight: 23,
  eyeWideLeft: 24,
  eyeWideRight: 25,
  eyesClosed: 69,
  eyesLookUp: 70,
  eyesLookDown: 71,

  // 입 관련
  mouthSmileLeft: 64,
  mouthSmileRight: 65,
  mouthFrownLeft: 29,
  mouthFrownRight: 30,
  mouthPucker: 31,
  mouthFunnel: 52,
  mouthDimpleLeft: 53,
  mouthDimpleRight: 54,
  mouthStretchLeft: 55,
  mouthStretchRight: 56,
  mouthRollLower: 57,
  mouthRollUpper: 58,
  mouthShrugLower: 32,
  mouthShrugUpper: 33,
  mouthPressLeft: 59,
  mouthPressRight: 60,
  mouthUpperUpLeft: 61,
  mouthUpperUpRight: 62,

  // 턱 관련
  jawForward: 26,
  jawLeft: 27,
  jawRight: 28,

  // 눈동자 관련
  eyeLookDownLeft: 40,
  eyeLookDownRight: 41,
  eyeLookUpLeft: 42,
  eyeLookUpRight: 43,
  eyeLookInLeft: 44,
  eyeLookInRight: 45,
  eyeLookOutLeft: 46,
  eyeLookOutRight: 47,

  // 기타
  browDownLeft: 17,
  browDownRight: 18,
  browInnerUp: 19,
  browOuterUpLeft: 20,
  browOuterUpRight: 21,
  noseSneerLeft: 34,
  noseSneerRight: 35,
  cheekPuff: 48,
  cheekSquintLeft: 49,
  cheekSquintRight: 50,
  tongueOut: 66
};

// Man 모델용 블렌드쉐입 매핑 (20250825_Sony_Man_BS_Modify_V2.glb)
// 51개 블렌드쉐입을 가진 CC 모델
const ModelBlendshapeMap_for_51BS = {
  browOuterUpLeft: 0,
  browOuterUpRight: 1,
  browDownLeft: 2,
  browDownRight: 3,
  eyeBlinkLeft: 4,
  eyeBlinkRight: 5,
  eyeSquintLeft: 6,
  eyeSquintRight: 7,
  eyeWideLeft: 8,
  eyeWideRight: 9,
  noseSneerLeft: 10,
  noseSneerRight: 11,
  cheekSquintLeft: 12,
  cheekSquintRight: 13,
  mouthSmileLeft: 14,
  mouthSmileRight: 15,
  mouthDimpleLeft: 16,
  mouthDimpleRight: 17,
  mouthPressLeft: 18,
  mouthPressRight: 19,
  mouthShrugUpper: 20,
  mouthShrugLower: 21,
  browInnerUp: 22,
  cheekPuff: 23,
  mouthFunnel: 24,
  mouthPucker: 25,
  mouthLeft: 26,
  mouthRight: 27,
  mouthRollUpper: 28,
  mouthRollLower: 29,
  mouthFrownLeft: 30,
  mouthFrownRight: 31,
  mouthUpperUpLeft: 32,
  mouthUpperUpRight: 33,
  mouthLowerDownLeft: 34,
  mouthLowerDownRight: 35,
  mouthStretchLeft: 36,
  mouthStretchRight: 37,
  jawOpen: 38,
  jawForward: 39,
  jawLeft: 40,
  jawRight: 41,
  mouthClose: 42,
  eyeLookUpLeft: 43,
  eyeLookUpRight: 44,
  eyeLookDownLeft: 45,
  eyeLookDownRight: 46,
  eyeLookInLeft: 47,
  eyeLookInRight: 48,
  eyeLookOutLeft: 49,
  eyeLookOutRight: 50,

  // 기본 매핑 (기존 코드 호환성을 위해)
  mouthOpen: 38, // jawOpen과 동일
  mouthSmile: 14, // mouthSmileLeft와 매핑
  mouthClose: 42, // 주석 해제
  browInnerUp: 22, // 주석 해제
  noseSneerLeft: 10, // 주석 해제
  noseSneerRight: 11, // 주석 해제
  cheekPuff: 23, // 주석 해제

  // Viseme는 YuHa에 없으므로 기본값으로 매핑
  viseme_sil: 38,
  viseme_PP: 25,
  viseme_FF: 24,
  viseme_TH: 38,
  viseme_DD: 38,
  viseme_kk: 38,
  viseme_CH: 38,
  viseme_SS: 38,
  viseme_nn: 38,
  viseme_RR: 38,
  viseme_aa: 38,
  viseme_E: 38,
  viseme_I: 38,
  viseme_O: 25,
  viseme_U: 24
};

// YuHa 모델용 블렌드쉐입 매핑 (YuHa.glb)
// 35개 블렌드쉐입을 가진 커스텀 모델
export const ModelBlendshapeMap_for_Yuha = {
  browDownLeft: 0,
  browDownRight: 1,
  browOuterUpLeft: 2,
  browOuterUpRight: 3,
  mouthLeft: 4,
  mouthRight: 5,
  MOUTH_Angry: 6,
  tongueOut: 7,
  eyeBlinkLeft: 8,
  eyeBlinkRight: 9,
  eyeWideLeft: 10,
  eyeWideRight: 11,
  EyeDark: 12,
  jawOpen: 13,
  mouthPucker: 14,
  mouthFunnel: 15,
  eyeSquintLeft: 16,
  eyeSquintRight: 17,
  eyeLookUpLeft: 18,
  eyeLookUpRight: 19,
  eyeLookDownLeft: 20,
  eyeLookDownRight: 21,
  eyeLookOutLeft: 22,
  eyeLookOutRight: 23,
  eyeLookInRight: 24,
  eyeLookInLeft: 25,
  mouthUpperUpLeft: 26,
  mouthUpperUpRight: 27,
  mouthShrugUpper: 28,
  mouthSmileLeft: 29,
  mouthSmileRight: 30,
  mouthFrownLeft: 31,
  mouthFrownRight: 32,
  EyeSmallL: 33,
  EyeSmallR: 34,

  // 기본 매핑 (기존 코드 호환성을 위해)
  mouthOpen: 13, // jawOpen과 동일
  mouthSmile: 29, // mouthSmileLeft와 매핑
  mouthClose: 13, // jawOpen과 동일
  browInnerUp: 2, // browOuterUpLeft와 매핑
  noseSneerLeft: 6, // MOUTH_Angry와 매핑
  noseSneerRight: 6, // MOUTH_Angry와 매핑
  cheekPuff: 14, // mouthPucker와 매핑
  
  // facialAnimationConstants에서 사용되는 누락된 블렌드쉐입들 추가
  cheekSquintLeft: 16, // eyeSquintLeft와 유사하게 매핑
  cheekSquintRight: 17, // eyeSquintRight와 유사하게 매핑
  mouthDimpleLeft: 29, // mouthSmileLeft와 동일하게 매핑
  mouthDimpleRight: 30, // mouthSmileRight와 동일하게 매핑
  mouthPressLeft: 31, // mouthFrownLeft와 유사하게 매핑
  mouthPressRight: 32, // mouthFrownRight와 유사하게 매핑
  mouthStretchLeft: 4, // mouthLeft와 매핑
  mouthStretchRight: 5, // mouthRight와 매핑

  // Viseme는 YuHa에 없으므로 기본값으로 매핑
  viseme_sil: 13,
  viseme_PP: 14,
  viseme_FF: 15,
  viseme_TH: 13,
  viseme_DD: 13,
  viseme_kk: 13,
  viseme_CH: 13,
  viseme_SS: 13,
  viseme_nn: 13,
  viseme_RR: 13,
  viseme_aa: 13,
  viseme_E: 13,
  viseme_I: 13,
  viseme_O: 14,
  viseme_U: 15
};

// Woman 모델용 블렌드쉐입 매핑 (20250826_LDS_BS_V4.glb)
// 51개 블렌드쉐입을 가진 CC 모델 (brunette 시리즈도 동일한 구조 사용)
const ModelBlendshapeMap_for_Woman = {
  // 실제 woman 모델 순서대로 매핑
  browOuterUpLeft: 0,
  browOuterUpRight: 1,
  browDownLeft: 2,
  browDownRight: 3,
  eyeBlinkLeft: 4,
  eyeBlinkRight: 5,
  eyeSquintLeft: 6,
  eyeSquintRight: 7,
  eyeWideLeft: 8,
  eyeWideRight: 9,
  noseSneerLeft: 10,
  noseSneerRight: 11,
  cheekSquintLeft: 12,
  cheekSquintRight: 13,
  mouthSmileLeft: 14,
  mouthSmileRight: 15,
  mouthDimpleLeft: 16,
  mouthDimpleRight: 17,
  mouthPressLeft: 18,
  mouthPressRight: 19,
  mouthShrugUpper: 20,
  mouthShrugLower: 21,
  browInnerUp: 22,
  cheekPuff: 23,
  mouthFunnel: 24,
  mouthPucker: 25,
  mouthLeft: 26,
  mouthRight: 27,
  mouthRollUpper: 28,
  mouthRollLower: 29,
  mouthFrownLeft: 30,
  mouthFrownRight: 31,
  mouthUpperUpLeft: 32,
  mouthUpperUpRight: 33,
  mouthLowerDownLeft: 34,
  mouthLowerDownRight: 35,
  mouthStretchLeft: 36,
  mouthStretchRight: 37,
  jawOpen: 38,
  jawForward: 39,
  jawLeft: 40,
  jawRight: 41,
  mouthClose: 42,
  eyeLookUpLeft: 43,
  eyeLookUpRight: 44,
  eyeLookDownLeft: 45,
  eyeLookDownRight: 46,
  eyeLookInLeft: 47,
  eyeLookInRight: 48,
  eyeLookOutLeft: 49,
  eyeLookOutRight: 50,

  // 기본 매핑 (기존 코드 호환성을 위해)
  mouthOpen: 38,           // jawOpen과 동일
  mouthSmile: 14,          // mouthSmileLeft와 매핑
  
  // facialAnimationConstants에서 사용되는 추가 매핑들
  browInnerUp: 22,         // 이미 존재하는 매핑
  noseSneerLeft: 10,       // 이미 존재하는 매핑
  noseSneerRight: 11,      // 이미 존재하는 매핑
  cheekPuff: 23,           // 이미 존재하는 매핑

  // Viseme는 woman에 없으므로 기본값으로 매핑
  viseme_sil: 38,
  viseme_PP: 25,
  viseme_FF: 24,
  viseme_TH: 38,
  viseme_DD: 38,
  viseme_kk: 38,
  viseme_CH: 38,
  viseme_SS: 38,
  viseme_nn: 38,
  viseme_RR: 38,
  viseme_aa: 38,
  viseme_E: 38,
  viseme_I: 38,
  viseme_O: 25,
  viseme_U: 24
};


// Turtle 모델용 블렌드쉐입 매핑 (turtle_converted.glb)
// 73개 블렌드쉐입을 가진 Cube031 메시 (Blender에서 확인한 실제 GLB 순서 기반)
const ModelBlendshapeMap_for_Cube031 = {
  // 기본 표정 (Blender에서 확인한 실제 순서 - 0부터 시작)
  browInnerUp: 0,
  browDownLeft: 1,
  browDownRight: 2,
  browOuterUpLeft: 3,
  browOuterUpRight: 4,
  eyeLookUpLeft: 5,
  eyeLookUpRight: 6,
  eyeLookDownLeft: 7,
  eyeLookDownRight: 8,
  eyeLookInLeft: 9,
  eyeLookInRight: 10,
  eyeLookOutLeft: 11,
  eyeLookOutRight: 12,
  eyeBlinkLeft: 13,
  eyeBlinkRight: 14,
  eyeSquintLeft: 15,
  eyeSquintRight: 16,
  eyeWideLeft: 17,
  eyeWideRight: 18,
  cheekPuff: 19,
  cheekSquintLeft: 20,
  cheekSquintRight: 21,
  noseSneerLeft: 22,
  noseSneerRight: 23,
  jawOpen: 24,
  jawForward: 25,
  jawLeft: 26,
  jawRight: 27,
  mouthFunnel: 28,
  mouthPucker: 29,
  mouthLeft: 30,
  mouthRight: 31,
  mouthRollUpper: 32,
  mouthRollLower: 33,
  mouthShrugUpper: 34,
  mouthShrugLower: 35,
  mouthClose: 36,
  mouthSmileLeft: 37,
  mouthSmileRight: 38,
  mouthFrownLeft: 39,
  mouthFrownRight: 40,
  mouthDimpleLeft: 41,
  mouthDimpleRight: 42,
  mouthUpperUpLeft: 43,
  mouthUpperUpRight: 44,
  mouthLowerDownLeft: 45,
  mouthLowerDownRight: 46,
  mouthPressLeft: 47,
  mouthPressRight: 48,
  mouthStretchLeft: 49,
  mouthStretchRight: 50,
  tongueOut: 51,
  EyeSmallL: 52,
  EyeSmallR: 53,
  EyeLargeL: 54,
  EyeLargeR: 55,
  EyeDark: 56,
  TT: 57,
  ChibiSparkleEye: 58,
  Flower: 59,
  'FL.001': 60,
  'FL.002': 61,
  'FL.003': 62,
  'FL.004': 63,
  'FL.005': 64,
  'FL.006': 65,
  'FL.007': 66,
  'FL.008': 67,
  'FL.009': 68,
  'FL.010': 69,
  'FL.011': 70,
  'FL.012': 71,
  'FL.013': 72,

  // 기본 매핑 (기존 코드 호환성을 위해)
  mouthOpen: 24,           // jawOpen과 동일
  mouthSmile: 37,          // mouthSmileLeft와 매핑
  
  // facialAnimationConstants에서 사용되는 추가 매핑들 (이미 존재하는 것들)
  browInnerUp: 0,          // 이미 존재
  noseSneerLeft: 22,       // 이미 존재
  noseSneerRight: 23,      // 이미 존재
  cheekPuff: 19,           // 이미 존재

  // Viseme 매핑
  viseme_sil: 24,          // jawOpen
  viseme_PP: 29,           // mouthPucker
  viseme_FF: 28,           // mouthFunnel
  viseme_TH: 24,           // jawOpen
  viseme_DD: 24,           // jawOpen
  viseme_kk: 24,           // jawOpen
  viseme_CH: 24,           // jawOpen
  viseme_SS: 24,           // jawOpen
  viseme_nn: 24,           // jawOpen
  viseme_RR: 24,           // jawOpen
  viseme_aa: 24,           // jawOpen
  viseme_E: 24,            // jawOpen
  viseme_I: 24,            // jawOpen
  viseme_O: 29,            // mouthPucker
  viseme_U: 28             // mouthFunnel
};


// 모델별 블렌드쉐입 매핑 선택 함수
export const getBlendshapeMapForModel = (modelName) => {
  switch (modelName) {
    case 'yuha':
      return ModelBlendshapeMap_for_Yuha;
    case 'man':
      return ModelBlendshapeMap_for_51BS; // Man 모델 (20250825_Sony_Man_BS_Modify_V2.glb)
    case 'woman':
      return ModelBlendshapeMap_for_Woman; // Woman 모델 (20250826_LDS_BS_V4.glb)
    case 'turtle':
      return ModelBlendshapeMap_for_Cube031; // Turtle 모델 (turtle_converted.glb)
    default:
      return ModelBlendshapeMap; // 기본 매핑 (fallback)
  }
}; 
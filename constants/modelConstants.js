export const MODEL_URLS = {
  brunette: '/glb/brunette.glb',
  brunette1: '/glb/brunette1.glb',
  brunette2: '/glb/brunette2.glb',
  yuha: '/glb/YuHa.glb',
  man: '/glb/20250825_Sony_Man_BS_Modify_V2.glb',  // 원본과 동일하게 복원
  woman: '/glb/20250826_LDS_BS_V4.glb',
  turtle: '/glb/turtle_converted.glb'
};

// 🎯 초기 모델 설정 (woman을 기본값으로)
export const DEFAULT_MODEL = 'woman';

// 모델별 메시 이름 매핑
//export const MODEL_MESH_NAMES = {
//  brunette: 'Wolf3D_Avatar',
//  brunette1: 'Wolf3D_Avatar',
//  brunette2: 'Wolf3D_Avatar',
//  yuha: 'Head_Geo',
//  man: ['CC_Base_Body004_1', 'CC_Base_Body004_7', 'CC_Base_Body004_8']  // 여러 메시
//};

// 모델별 메시 이름 매핑 여러 메쉬를 써야할 수 있으므로 배열로 수정
export const MODEL_MESH_NAMES = {
  brunette: ['Wolf3D_Avatar'],
  brunette1: ['Wolf3D_Avatar'],
  brunette2: ['Wolf3D_Avatar'],
  yuha: ['Head_Geo'],
  //man: ['CC_Base_Body004','CC_Base_Body004_1','CC_Base_Body004_2','CC_Base_Body004_3', 'CC_Base_Body004_4','CC_Base_Body004_5','CC_Base_Body004_6','CC_Base_Body004_7', 'CC_Base_Body004_8', 'CC_Base_Body004_9', 'CC_Base_Body004_10'],
  man: ['CC_Base_Body003','CC_Base_Body003_1','CC_Base_Body003_2'],
  
  //001
  //woman: ['CC_Base_Body'], // woman 모델 메시 이름 (실제 메시 이름으로 수정 필요)
   
  //002
  //woman: ['CC_Base_Body002_1', 'CC_Base_Body002_2', 'CC_Base_Body002_3','CC_Base_Body002_3','CC_Base_Body002_4','CC_Base_Body002_5','CC_Base_Body002_6','CC_Base_Body002_7','CC_Base_Body002_8','CC_Base_Body002_9','CC_Base_Body002_10'],// woman 모델 메시 이름 (실제 메시 이름으로 수정 필요)
  
  //003
  woman: ['CC_Base_Body003','CC_Base_Body003_1', 'CC_Base_Body003_2'],//, 'CC_Base_Body003_3', 'CC_Base_Body003_4', 'CC_Base_Body003_5', 'CC_Base_Body003_6', 'CC_Base_Body003_7'], // woman 모델 메시 이름 (실제 메시 이름으로 수정 필요)
  //woman: ['CC_Base_Body005','CC_Base_Body005_1', 'CC_Base_Body005_2', 'CC_Base_Body005_3', 'CC_Base_Body005_4', 'CC_Base_Body005_5', 'CC_Base_Body005_6', 'CC_Base_Body005_7'], // woman 모델 메시 이름 (실제 메시 이름으로 수정 필요)
  //woman: ['CC_Base_Body002','CC_Base_Body002_1', 'CC_Base_Body002_2'], // woman 모델 메시 이름 (실제 메시 이름으로 수정 필요)

 
  turtle: ['Cube031']  // Turtle 모델: 두 개 메시 ( 메인)
};

// FBX에서 GLB로의 본 매핑 정의 (FBX는 mixamorig 접두사 포함, GLB는 접두사 없음)
export const BONE_MAPPING = {
  // 상체 - Mixamo 표준 구조
  'mixamorigHips': 'Hips',
  'mixamorigSpine': 'Spine',
  'mixamorigSpine1': 'Spine1',
  'mixamorigSpine2': 'Spine2',
  'mixamorigNeck': 'Neck',
  'mixamorigHead': 'Head',
  'mixamorigHeadTop_End': 'HeadTop_End',

  // 왼팔
  'mixamorigLeftShoulder': 'LeftShoulder',
  'mixamorigLeftArm': 'LeftArm',
  'mixamorigLeftForeArm': 'LeftForeArm',
  'mixamorigLeftHand': 'LeftHand',
  'mixamorigLeftHandThumb1': 'LeftHandThumb1',
  'mixamorigLeftHandThumb2': 'LeftHandThumb2',
  'mixamorigLeftHandThumb3': 'LeftHandThumb3',
  'mixamorigLeftHandThumb4': 'LeftHandThumb4',
  'mixamorigLeftHandIndex1': 'LeftHandIndex1',
  'mixamorigLeftHandIndex2': 'LeftHandIndex2',
  'mixamorigLeftHandIndex3': 'LeftHandIndex3',
  'mixamorigLeftHandIndex4': 'LeftHandIndex4',
  'mixamorigLeftHandMiddle1': 'LeftHandMiddle1',
  'mixamorigLeftHandMiddle2': 'LeftHandMiddle2',
  'mixamorigLeftHandMiddle3': 'LeftHandMiddle3',
  'mixamorigLeftHandMiddle4': 'LeftHandMiddle4',
  'mixamorigLeftHandRing1': 'LeftHandRing1',
  'mixamorigLeftHandRing2': 'LeftHandRing2',
  'mixamorigLeftHandRing3': 'LeftHandRing3',
  'mixamorigLeftHandRing4': 'LeftHandRing4',
  'mixamorigLeftHandPinky1': 'LeftHandPinky1',
  'mixamorigLeftHandPinky2': 'LeftHandPinky2',
  'mixamorigLeftHandPinky3': 'LeftHandPinky3',
  'mixamorigLeftHandPinky4': 'LeftHandPinky4',

  // 오른팔
  'mixamorigRightShoulder': 'RightShoulder',
  'mixamorigRightArm': 'RightArm',
  'mixamorigRightForeArm': 'RightForeArm',
  'mixamorigRightHand': 'RightHand',
  'mixamorigRightHandThumb1': 'RightHandThumb1',
  'mixamorigRightHandThumb2': 'RightHandThumb2',
  'mixamorigRightHandThumb3': 'RightHandThumb3',
  'mixamorigRightHandThumb4': 'RightHandThumb4',
  'mixamorigRightHandIndex1': 'RightHandIndex1',
  'mixamorigRightHandIndex2': 'RightHandIndex2',
  'mixamorigRightHandIndex3': 'RightHandIndex3',
  'mixamorigRightHandIndex4': 'RightHandIndex4',
  'mixamorigRightHandMiddle1': 'RightHandMiddle1',
  'mixamorigRightHandMiddle2': 'RightHandMiddle2',
  'mixamorigRightHandMiddle3': 'RightHandMiddle3',
  'mixamorigRightHandMiddle4': 'RightHandMiddle4',
  'mixamorigRightHandRing1': 'RightHandRing1',
  'mixamorigRightHandRing2': 'RightHandRing2',
  'mixamorigRightHandRing3': 'RightHandRing3',
  'mixamorigRightHandRing4': 'RightHandRing4',
  'mixamorigRightHandPinky1': 'RightHandPinky1',
  'mixamorigRightHandPinky2': 'RightHandPinky2',
  'mixamorigRightHandPinky3': 'RightHandPinky3',
  'mixamorigRightHandPinky4': 'RightHandPinky4',

  // 왼쪽 다리
  'mixamorigLeftUpLeg': 'LeftUpLeg',
  'mixamorigLeftLeg': 'LeftLeg',
  'mixamorigLeftFoot': 'LeftFoot',
  'mixamorigLeftToeBase': 'LeftToeBase',
  'mixamorigLeftToe_End': 'LeftToe_End',

  // 오른쪽 다리
  'mixamorigRightUpLeg': 'RightUpLeg',
  'mixamorigRightLeg': 'RightLeg',
  'mixamorigRightFoot': 'RightFoot',
  'mixamorigRightToeBase': 'RightToeBase',
  'mixamorigRightToe_End': 'RightToe_End'
};

// 손 본 찾기를 위한 패턴 정의
export const HAND_BONE_PATTERNS = {
  left: [
    'lefthand',
    'left_hand',
    'hand_l',
    'mixamoriglefthand',
    'LeftHand',
    'Left_Hand',
    'Hand_L'
  ],
  right: [
    'righthand',
    'right_hand',
    'hand_r',
    'mixamorigrighthand',
    'RightHand',
    'Right_Hand',
    'Hand_R'
  ]
};

// 손 본 대안 패턴 (forearm, wrist 등)
export const HAND_ALTERNATIVE_PATTERNS = {
  left: [
    'leftforearm',
    'left_forearm',
    'LeftForeArm',
    'Left_ForeArm',
    'leftwrist',
    'left_wrist',
    'LeftWrist',
    'Left_Wrist'
  ],
  right: [
    'rightforearm',
    'right_forearm',
    'RightForeArm',
    'Right_ForeArm',
    'rightwrist',
    'right_wrist',
    'RightWrist',
    'Right_Wrist'
  ]
};

// 손가락 본 패턴 (최후 수단)
export const FINGER_BONE_PATTERNS = {
  left: [
    'lefthandindex1',
    'left_hand_index_1',
    'LeftHandIndex1',
    'lefthandmiddle1',
    'left_hand_middle_1',
    'LeftHandMiddle1',
    'lefthandthumb1',
    'left_hand_thumb_1',
    'LeftHandThumb1'
  ],
  right: [
    'righthandindex1',
    'right_hand_index_1',
    'RightHandIndex1',
    'righthandmiddle1',
    'right_hand_middle_1',
    'RightHandMiddle1',
    'righthandthumb1',
    'right_hand_thumb_1',
    'RightHandThumb1'
  ]
};

// 일부 GLB 모델이 mixamorig 접두사를 포함하는 경우를 위한 대체 매핑
export const MIXAMORIG_BONE_MAPPING = {
  'mixamorigHips': 'mixamorigHips',
  'mixamorigSpine': 'mixamorigSpine',
  'mixamorigSpine1': 'mixamorigSpine1',
  'mixamorigSpine2': 'mixamorigSpine2',
  'mixamorigNeck': 'mixamorigNeck',
  'mixamorigHead': 'mixamorigHead',
  'mixamorigHeadTop_End': 'mixamorigHeadTop_End',

  'mixamorigLeftShoulder': 'mixamorigLeftShoulder',
  'mixamorigLeftArm': 'mixamorigLeftArm',
  'mixamorigLeftForeArm': 'mixamorigLeftForeArm',
  'mixamorigLeftHand': 'mixamorigLeftHand',
  'mixamorigLeftHandThumb1': 'mixamorigLeftHandThumb1',
  'mixamorigLeftHandThumb2': 'mixamorigLeftHandThumb2',
  'mixamorigLeftHandThumb3': 'mixamorigLeftHandThumb3',
  'mixamorigLeftHandThumb4': 'mixamorigLeftHandThumb4',
  'mixamorigLeftHandIndex1': 'mixamorigLeftHandIndex1',
  'mixamorigLeftHandIndex2': 'mixamorigLeftHandIndex2',
  'mixamorigLeftHandIndex3': 'mixamorigLeftHandIndex3',
  'mixamorigLeftHandIndex4': 'mixamorigLeftHandIndex4',
  'mixamorigLeftHandMiddle1': 'mixamorigLeftHandMiddle1',
  'mixamorigLeftHandMiddle2': 'mixamorigLeftHandMiddle2',
  'mixamorigLeftHandMiddle3': 'mixamorigLeftHandMiddle3',
  'mixamorigLeftHandMiddle4': 'mixamorigLeftHandMiddle4',
  'mixamorigLeftHandRing1': 'mixamorigLeftHandRing1',
  'mixamorigLeftHandRing2': 'mixamorigLeftHandRing2',
  'mixamorigLeftHandRing3': 'mixamorigLeftHandRing3',
  'mixamorigLeftHandRing4': 'mixamorigLeftHandRing4',
  'mixamorigLeftHandPinky1': 'mixamorigLeftHandPinky1',
  'mixamorigLeftHandPinky2': 'mixamorigLeftHandPinky2',
  'mixamorigLeftHandPinky3': 'mixamorigLeftHandPinky3',
  'mixamorigLeftHandPinky4': 'mixamorigLeftHandPinky4',

  'mixamorigRightShoulder': 'mixamorigRightShoulder',
  'mixamorigRightArm': 'mixamorigRightArm',
  'mixamorigRightForeArm': 'mixamorigRightForeArm',
  'mixamorigRightHand': 'mixamorigRightHand',
  'mixamorigRightHandThumb1': 'mixamorigRightHandThumb1',
  'mixamorigRightHandThumb2': 'mixamorigRightHandThumb2',
  'mixamorigRightHandThumb3': 'mixamorigRightHandThumb3',
  'mixamorigRightHandThumb4': 'mixamorigRightHandThumb4',
  'mixamorigRightHandIndex1': 'mixamorigRightHandIndex1',
  'mixamorigRightHandIndex2': 'mixamorigRightHandIndex2',
  'mixamorigRightHandIndex3': 'mixamorigRightHandIndex3',
  'mixamorigRightHandIndex4': 'mixamorigRightHandIndex4',
  'mixamorigRightHandMiddle1': 'mixamorigRightHandMiddle1',
  'mixamorigRightHandMiddle2': 'mixamorigRightHandMiddle2',
  'mixamorigRightHandMiddle3': 'mixamorigRightHandMiddle3',
  'mixamorigRightHandMiddle4': 'mixamorigRightHandMiddle4',
  'mixamorigRightHandRing1': 'mixamorigRightHandRing1',
  'mixamorigRightHandRing2': 'mixamorigRightHandRing2',
  'mixamorigRightHandRing3': 'mixamorigRightHandRing3',
  'mixamorigRightHandRing4': 'mixamorigRightHandRing4',
  'mixamorigRightHandPinky1': 'mixamorigRightHandPinky1',
  'mixamorigRightHandPinky2': 'mixamorigRightHandPinky2',
  'mixamorigRightHandPinky3': 'mixamorigRightHandPinky3',
  'mixamorigRightHandPinky4': 'mixamorigRightHandPinky4',

  'mixamorigLeftUpLeg': 'mixamorigLeftUpLeg',
  'mixamorigLeftLeg': 'mixamorigLeftLeg',
  'mixamorigLeftFoot': 'mixamorigLeftFoot',
  'mixamorigLeftToeBase': 'mixamorigLeftToeBase',
  'mixamorigLeftToe_End': 'mixamorigLeftToe_End',

  'mixamorigRightUpLeg': 'mixamorigRightUpLeg',
  'mixamorigRightLeg': 'mixamorigRightLeg',
  'mixamorigRightFoot': 'mixamorigRightFoot',
  'mixamorigRightToeBase': 'mixamorigRightToeBase',
  'mixamorigRightToe_End': 'mixamorigRightToe_End'
}; 

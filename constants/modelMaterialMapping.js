/**
 * modelMaterialMapping.js
 * 메터리얼 카테고리 관련 상수들
 */

// 카테고리별 표시 이름 (한글)
export const CATEGORY_DISPLAY_NAMES = {
  skin: '피부 (Body)',
  eyes: '눈 (Eyes)',
  eyebrows: '눈썹 (Eyebrows)',
  hair: '머리카락 (Hair)',
  clothing: '의상 (Clothing)',
  accessories: '액세서리 (Accessories)',
  teeth: '치아 (Teeth)',
  tongue: '혀 (Tongue)',
  nails: '손톱 (Nails)',
  eyelashes: '속눈썹 (Eyelashes)',
  lips: '입술 (Lips)',
  unknown: '기타 (Others)'
};

// 카테고리별 한국어 이름 (CC 기준)
export const CATEGORY_NAMES = {
  skin: '피부',
  eyes: '눈동자',
  eyebrows: '눈썹',
  hair: '머리카락',
  clothing: '의상',
  accessories: '액세서리',
  teeth: '치아',
  tongue: '혀',
  nails: '손톱',
  eyelashes: '속눈썹',
  lips: '입술',
  unknown: '기타'
};

// 카테고리별 최적화된 기본 설정 (세분화)
export const CATEGORY_PRESETS = {
  skin: {
    metalness: 0.0,
    roughness: 0.7,
    clearcoat: 0.1,
    envMapIntensity: 0.3,
    specularIntensity: 0.2,
    sheen: 0.0,
    reflectivity: 0.0,
    normalScale: 1.0,
    aoMapIntensity: 1.0,
    transmission: 0.0,
    thickness: 0.5,
    ior: 1.4,
    opacity: 1.0,
    alphaTest: 0.01,
    iridescence: 0.0,
    iridescenceIOR: 1.3,
    emissiveIntensity: 0.0,
    displacementScale: 0.0,
    displacementBias: 0.0
  },
  eyes: {
    metalness: 0.0,
    roughness: 0.1,
    clearcoat: 0.8,
    envMapIntensity: 0.7,
    specularIntensity: 0.9,
    sheen: 0.0,
    reflectivity: 0.8,
    normalScale: 1.0,
    aoMapIntensity: 1.0,
    transmission: 0.0,
    thickness: 0.5,
    ior: 1.4,
    opacity: 1.0,
    alphaTest: 0.01,
    iridescence: 0.0,
    iridescenceIOR: 1.3,
    emissiveIntensity: 0.0,
    displacementScale: 0.0,
    displacementBias: 0.0
  },
  eyebrows: {
    metalness: 0.0,
    roughness: 0.7,
    clearcoat: 0.1,
    envMapIntensity: 0.3,
    specularIntensity: 0.4,
    sheen: 0.2,
    reflectivity: 0.2
  },
  hair: {
    metalness: 0.0,
    roughness: 0.6,
    clearcoat: 0.2,
    envMapIntensity: 0.4,
    specularIntensity: 0.6,
    sheen: 0.3,
    reflectivity: 0.3,
    alphaHash: false,
    alphaHashScale: 0.15,
    transparent: false,
    alphaTest: 0.5
  },
  clothing: {
    metalness: 0.0,
    roughness: 0.9,
    clearcoat: 0.0,
    envMapIntensity: 0.2,
    specularIntensity: 0.3,
    sheen: 0.1,
    reflectivity: 0.1
  },
  accessories: {
    metalness: 0.5,
    roughness: 0.3,
    clearcoat: 0.5,
    envMapIntensity: 0.8,
    specularIntensity: 0.8,
    sheen: 0.0,
    reflectivity: 0.6
  },
  teeth: {
    metalness: 0.0,
    roughness: 0.2,
    clearcoat: 0.6,
    envMapIntensity: 0.5,
    specularIntensity: 0.8,
    sheen: 0.0,
    reflectivity: 0.5
  },
  tongue: {
    metalness: 0.0,
    roughness: 0.6,
    clearcoat: 0.2,
    envMapIntensity: 0.3,
    specularIntensity: 0.4,
    sheen: 0.1,
    reflectivity: 0.2
  },
  nails: {
    metalness: 0.0,
    roughness: 0.1,
    clearcoat: 0.9,
    envMapIntensity: 0.8,
    specularIntensity: 0.9,
    sheen: 0.0,
    reflectivity: 0.7
  },
  eyelashes: {
    metalness: 0.0,
    roughness: 1.0,
    clearcoat: 0.0,
    envMapIntensity: 0.0,
    specularIntensity: 0.0,
    sheen: 0.4,
    reflectivity: 0.0,
    alphaHash: true,
    alphaHashScale: 1.0,
    alphaTest: 0.0,
    normalScale: 1.0,
    aoMapIntensity: 1.0,
    transmission: 0.0,
    thickness: 0.5,
    ior: 1.5,
    opacity: 1.0,
    iridescence: 0.0,
    iridescenceIOR: 1.3,
    emissiveIntensity: 0.0,
    displacementScale: 0.0,
    displacementBias: 0.0
  },
  lips: {
    metalness: 0.0,
    roughness: 0.4,
    clearcoat: 0.3,
    envMapIntensity: 0.3,
    specularIntensity: 0.6,
    sheen: 0.2,
    reflectivity: 0.3
  }
};



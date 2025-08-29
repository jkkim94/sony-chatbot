/**
 * MaterialManager.js
 * 개별 메터리얼만 관리하는 단순화된 매니저
 */

import * as THREE from 'three';

export class MaterialManager {
  constructor() {
    this.currentModel = null; // 현재 모델 직접 참조
    this.materialCategories = {}; // 카테고리별 메터리얼 맵
    
    // 설정 구조 단순화 - 개별 메터리얼만
    this.currentSettings = {
      individualMaterial: {}
    };
    
    // Character Creator 메터리얼 이름 기반 정확한 분류 규칙
    this.categoryRules = {
      // 피부 관련 (Std_Skin_계열)
      skin: [
        'std_skin_head', 'std_skin_body', 'std_skin_arm', 'std_skin_leg',
        'skin_head', 'skin_body', 'skin_arm', 'skin_leg'
      ],
      
      // 눈 관련 (Std_Eye_, Std_Cornea_)
      eyes: [
        'std_eye_r', 'std_eye_l', 'std_cornea_r', 'std_cornea_l',
        'eye_r', 'eye_l', 'cornea_r', 'cornea_l', 'eyeball'
      ],
      
      // 치아 관련 (Std_Upper_Teeth, Std_Lower_Teeth)
      teeth: [
        'std_upper_teeth', 'std_lower_teeth', 'upper_teeth', 'lower_teeth',
        'std_teeth', 'teeth', 'dental'
      ],
      
      // 혀 (Std_Tongue)
      tongue: [
        'std_tongue', 'tongue'
      ],
      
      // 손톱 (Std_Nails)
      nails: [
        'std_nails', 'nails', 'fingernail', 'toenail'
      ],
      
      // 속눈썹 (Std_Eyelash)
      eyelashes: [
        'std_eyelash', 'eyelash', 'lash'
      ],
      
      // 머리카락 (Hair_Transparency, Scalp_Transparency)
      hair: [
        'hair_transparency', 'scalp_transparency', 'hair', 'scalp'
      ],
      
      // 눈썹 (일반적으로 별도 메쉬)
      eyebrows: [
        'std_eyebrow', 'eyebrow', 'brow'
      ],
      
      // 입술 (보통 피부에 포함되지만 별도 있을 수 있음)
      lips: [
        'std_lip', 'lip', 'mouth'
      ],
      
      // 의상 (shirt, skirt 등)
      clothing: [
        'rolled_sleeves_shirt', 'knee_length_skirt', 'shirt', 'pants', 'dress', 
        'jacket', 'skirt', 'outfit', 'cloth'
      ],
      
      // 액세서리 (high_heels 등)
      accessories: [
        'high_heels', 'shoes', 'accessory', 'jewelry', 'watch', 'hat', 'glasses'
      ]
    };

    // 콜백 시스템
    this.callbacks = {};
  }

  // 콜백 설정
  setCallbacks(callbacks) {
    this.callbacks = callbacks;
  }

  // 모델 참조 설정 (메터리얼 중복 적용 방지)
  setCurrentModel(model) {
    console.log(`[MaterialManager] 모델 참조 설정 요청: ${!!model}`);
    
    if (model) {
      console.log(`[MaterialManager] 모델 정보:`, {
        name: model.name,
        type: model.type,
        isGroup: model.isGroup,
        children: model.children?.length || 0
      });
    }
    
    // 동일한 모델이면 스킵 (중복 방지)
    if (this.currentModel === model) {
      console.log(`[MaterialManager] 동일한 모델, 설정 스킵`);
      return;
    }
    
    this.currentModel = model;
    console.log(`[MaterialManager] 새 모델 참조 설정 완료: ${!!model}`);
    
    // 모델이 설정되면 메터리얼 분석 및 기본 속성 적용
    if (model) {
      this._analyzeMaterials(model);
      this._ensureMaterialProperties(model);
    }
  }

  // 메터리얼 분석 및 카테고리별 분류
  _analyzeMaterials(model) {
    console.log(`[MaterialManager] 🔍 메터리얼 분석 시작`);
    
    // 카테고리 초기화 (CC 메터리얼 기준)
    this.materialCategories = {
      skin: [],
      eyes: [],
      teeth: [],
      tongue: [],
      nails: [],
      eyelashes: [],
      hair: [],
      eyebrows: [],
      lips: [],
      clothing: [],
      accessories: [],
      unknown: []
    };

    let totalMaterials = 0;

    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach((material) => {
          if (material) {
            totalMaterials++;
            const materialInfo = {
              material: material,
              meshName: child.name || 'Unnamed',
              materialName: material.name || 'Unnamed'
            };

            // 카테고리 분류
            const category = this._categorizeMaterial(material, child);
            this.materialCategories[category].push(materialInfo);
            
            console.log(`[MaterialManager] 📦 ${materialInfo.meshName} -> ${materialInfo.materialName} -> [${category}]`);
          }
        });
      }
    });

    // 분석 결과 로그
    console.log(`[MaterialManager] 🎨 메터리얼 분석 완료 (총 ${totalMaterials}개):`);
    Object.entries(this.materialCategories).forEach(([category, materials]) => {
      if (materials.length > 0) {
        console.log(`  ${category}: ${materials.length}개`);
        materials.forEach(info => {
          console.log(`    - ${info.meshName} (${info.materialName})`);
        });
      }
    });
  }

  // 메터리얼 카테고리 분류 로직 (CC 이름 정확 매칭)
  _categorizeMaterial(material, mesh) {
    const materialName = (material.name || '').toLowerCase();
    const meshName = (mesh.name || '').toLowerCase();
    
    // 버전 번호와 점 제거하여 정확한 이름 추출
    const cleanMaterialName = materialName.replace(/\.\d+$/, '').replace(/\d+$/, '');
    const cleanMeshName = meshName.replace(/\.\d+$/, '').replace(/\d+$/, '');
    const combinedName = `${cleanMaterialName} ${cleanMeshName}`;

    console.log(`[MaterialManager] 🔍 분류 중: "${materialName}" + "${meshName}" → "${combinedName}"`);

    // 카테고리 규칙 매칭
    for (const [category, keywords] of Object.entries(this.categoryRules)) {
      for (const keyword of keywords) {
        if (combinedName.includes(keyword.toLowerCase())) {
          console.log(`[MaterialManager] ✅ ${category} 카테고리 매칭: "${keyword}"`);
          return category;
        }
      }
    }
    
    // 기본 카테고리 폴백
    if (combinedName.includes('eye') || combinedName.includes('cornea')) return 'eyes';
    if (combinedName.includes('hair') || combinedName.includes('scalp')) return 'hair';
    if (combinedName.includes('teeth') || combinedName.includes('dental')) return 'teeth';
    if (combinedName.includes('eyebrow') || combinedName.includes('brow')) return 'eyebrows';
    if (combinedName.includes('shirt') || combinedName.includes('pants') || combinedName.includes('dress') || combinedName.includes('skirt')) return 'clothing';
    
    console.log(`[MaterialManager] ❓ 매칭되지 않음, 기본값 'skin' 사용`);
    return 'skin';
  }

  // 메터리얼 기본 속성 보장
  _ensureMaterialProperties(model) {
    console.log('[MaterialManager] 🔧 메터리얼 기본 속성 보장 시작');
    
    let meshCount = 0;
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        meshCount++;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach((material) => {
          if (material) {
            // 기본값 강제 설정 (피부 날아가는 것 방지)
            if (material.roughness === undefined) material.roughness = 0.8;
            if (material.metalness === undefined) material.metalness = 0.0;
            if (material.color && material.color.r === 0 && material.color.g === 0 && material.color.b === 0) {
              material.color.setRGB(0.8, 0.8, 0.8);
            }
            material.needsUpdate = true;
          }
        });
      }
    });
    
    console.log(`[MaterialManager] 🔧 메터리얼 기본 속성 보장 완료: ${meshCount}개 메시`);
  }

  // 개별 메터리얼 JSON 파일 로드
  async loadIndividualMaterialPreset(modelName) {
    try {
      console.log(`[MaterialManager] 🎭 개별 메터리얼 JSON 로드 시작: ${modelName}`);
      
      const url = `/presets/${modelName}-individual-material.json?t=${Date.now()}`;
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) {
        console.warn(`[MaterialManager] 개별 메터리얼 JSON 파일 없음: ${modelName}-individual-material.json`);
        return {};
      }
      
      const data = await response.json();
      const individualSettings = data.individualMaterial || {};
      
      console.log(`[MaterialManager] 🎭 개별 메터리얼 JSON 로드 완료:`, {
        modelName,
        categories: Object.keys(individualSettings)
      });
      
      return individualSettings;
      
    } catch (error) {
      console.warn(`[MaterialManager] 🎭 개별 메터리얼 JSON 로드 실패: ${modelName}`, error);
      return {};
    }
  }

  // 모델용 메터리얼 프리셋 로드 (개별 메터리얼만)
  async loadPresetForModel(modelName) {
    try {
      console.log(`[MaterialManager] 📦 ${modelName} 모델 메터리얼 프리셋 로드 시작`);
      
      // 개별 메터리얼만 로드
      const individualSettings = await this.loadIndividualMaterialPreset(modelName);
      
      // 설정 구조화 (개별 메터리얼만)
      const combinedSettings = {
        individualMaterial: individualSettings
      };
      
      console.log(`[MaterialManager] 📦 ${modelName} 모델 메터리얼 프리셋 로드 완료:`, {
        individualSettings: Object.keys(individualSettings)
      });
      
      return combinedSettings;
      
    } catch (error) {
      console.error(`[MaterialManager] 📦 ${modelName} 모델 메터리얼 프리셋 로드 실패:`, error);
      return {
        individualMaterial: {}
      };
    }
  }

  // 설정 적용 (개별 메터리얼만)
  applySettings(settings) {
    if (!this.currentModel) {
      console.warn('[MaterialManager] 모델이 설정되지 않음, 설정 적용 스킵');
      console.warn('[MaterialManager] currentModel 상태:', this.currentModel);
      console.warn('[MaterialManager] setCurrentModel이 먼저 호출되어야 합니다.');
      return;
    }

    console.log('[MaterialManager] 🎨 메터리얼 설정 적용 시작');
    
    const individualSettings = settings.individualMaterial || {};
    
    let meshCount = 0;
    let appliedCount = 0;

    this.currentModel.traverse((child) => {
      if (child.isMesh && child.material) {
        meshCount++;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        materials.forEach((material) => {
          if (material) {
            // 개별 메터리얼 설정만 적용
            const meshCategory = this._getMeshCategory(child.name, material.name);
            if (individualSettings[meshCategory]) {
              Object.entries(individualSettings[meshCategory]).forEach(([property, value]) => {
                if (material[property] !== undefined || this._isSpecialProperty(property)) {
                  this._applyMaterialProperty(material, property, value);
                  appliedCount++;
                }
              });
            }
          }
        });
      }
    });
        
    console.log(`[MaterialManager] 🎨 메터리얼 설정 적용 완료: ${meshCount}개 메시, ${appliedCount}개 속성`);
    
    // 현재 설정 업데이트
    this.currentSettings = { ...settings };
  }

  // 특수 속성인지 확인
  _isSpecialProperty(property) {
    return ['alphaHash', 'alphaHashScale', 'alphaTest', 'transparent', 'depthWrite', 'specularColor', 'normalScale'].includes(property);
  }

  // 메시 카테고리 판별 (메시 이름과 메터리얼 이름 기반)
  _getMeshCategory(meshName, materialName) {
    const combinedName = `${materialName || ''} ${meshName || ''}`.toLowerCase();
    
    // 카테고리 규칙 매칭
    for (const [category, keywords] of Object.entries(this.categoryRules)) {
      for (const keyword of keywords) {
        if (combinedName.includes(keyword.toLowerCase())) {
          return category;
        }
      }
    }
    
    // 기본 카테고리 폴백
    if (combinedName.includes('eye') || combinedName.includes('cornea')) return 'eyes';
    if (combinedName.includes('hair') || combinedName.includes('scalp')) return 'hair';
    if (combinedName.includes('teeth') || combinedName.includes('dental')) return 'teeth';
    if (combinedName.includes('eyebrow') || combinedName.includes('brow')) return 'eyebrows';
    if (combinedName.includes('shirt') || combinedName.includes('pants') || combinedName.includes('dress') || combinedName.includes('skirt')) return 'clothing';
    
    return 'skin';
  }

  // 개별 메터리얼 속성 적용 헬퍼 메서드
  _applyMaterialProperty(material, property, val) {
    if (property === 'normalScale' && material.normalMap) {
      if (material.normalScale && typeof material.normalScale.set === 'function') {
        material.normalScale.set(val, val);
      } else {
        material.normalScale = new THREE.Vector2(val, val);
      }
    } else if (property === 'specularColor' && Array.isArray(val)) {
      if (material.specularColor && typeof material.specularColor.setRGB === 'function') {
        material.specularColor.setRGB(val[0], val[1], val[2]);
      } else if (material.specularColor && typeof material.specularColor.set === 'function') {
        material.specularColor.set(val[0], val[1], val[2]);
      } else {
        material.specularColor = new THREE.Color(val[0], val[1], val[2]);
      }
    } else if (property === 'alphaHash') {
      material.alphaHash = val;
      if (val) {
        material.transparent = false;
        material.depthWrite = true;
      }
    } else if (property === 'alphaHashScale') {
      if (material.alphaHash) {
        material.alphaHashScale = val;
      }
    } else if (property === 'alphaTest') {
      material.alphaTest = val;
      if (val > 0) {
        material.transparent = false;
        material.depthWrite = true;
      }
    } else {
      material[property] = val;
    }
    material.needsUpdate = true;
  }

  // 현재 설정 반환
  getCurrentSettings() {
    return { ...this.currentSettings };
  }

  // 개별 메터리얼 설정 업데이트
  updateIndividualSetting(category, property, value) {
    console.log(`[MaterialManager] 🎭 개별 메터리얼 설정 업데이트: ${category}.${property} = ${value}`);
    
    if (!this.currentSettings.individualMaterial) {
      this.currentSettings.individualMaterial = {};
    }
    if (!this.currentSettings.individualMaterial[category]) {
      this.currentSettings.individualMaterial[category] = {};
    }
    
    this.currentSettings.individualMaterial[category][property] = value;
    
    // 실제 메터리얼에 즉시 적용
    this._applyIndividualSettingToMaterials(category, property, value);
    
    return this.currentSettings;
  }

  // 개별 메터리얼 설정을 실제 메터리얼에 적용
  _applyIndividualSettingToMaterials(category, property, value) {
    if (!this.currentModel) return;
    
    this.currentModel.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (material) {
            const meshCategory = this._getMeshCategory(child.name, material.name);
            if (meshCategory === category && (material[property] !== undefined || this._isSpecialProperty(property))) {
              this._applyMaterialProperty(material, property, value);
            }
          }
        });
      }
    });
  }

  // 카테고리별 메터리얼 정보 반환
  getCategoryMaterials(category) {
    return this.materialCategories[category] || [];
  }

  // 사용 가능한 카테고리 목록 반환
  getAllCategories() {
    return Object.keys(this.materialCategories).filter(cat => 
      this.materialCategories[cat] && this.materialCategories[cat].length > 0
    );
  }

  // 카테고리별 설정 적용 (MaterialPanel에서 사용)
  applyCategorySettings(category, settings) {
    console.log(`[MaterialManager] 🎭 ${category} 카테고리 설정 적용:`, settings);
    
    Object.entries(settings).forEach(([property, value]) => {
      this.updateIndividualSetting(category, property, value);
    });
  }

  // 기존 호환성을 위한 메서드들
  updateSetting(property, value) {
    // 개별 메터리얼의 기본 카테고리(skin)로 처리
    return this.updateIndividualSetting('skin', property, value);
  }

  setSetting(property, value) {
    return this.updateIndividualSetting('skin', property, value);
  }

  // 설정을 로컬 스토리지에 저장
  saveSettingsToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('materialSettings', JSON.stringify(this.currentSettings));
        console.log('💾 [MaterialManager] 설정 저장됨');
      }
    } catch (error) {
      console.warn('💾 [MaterialManager] 설정 저장 실패:', error);
    }
  }

  // 로컬 스토리지에서 설정 복원
  loadSettingsFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('materialSettings');
        return saved ? JSON.parse(saved) : {};
      }
      return {};
    } catch (error) {
      console.warn('💾 [MaterialManager] 설정 복원 실패:', error);
      return {};
    }
  }
}

// 싱글톤 인스턴스 (브라우저에서만 생성)
let materialManager = null;

if (typeof window !== 'undefined') {
  materialManager = new MaterialManager();
} else {
  // 서버 사이드에서는 더미 객체 생성
  materialManager = {
    getCurrentSettings: () => ({}),
    applySettings: () => {},
    loadPresetForModel: async () => ({}),
    loadIndividualMaterialPreset: async () => ({}),
    setCurrentModel: () => {},
    getMaterialCategories: () => ({}),
    updateIndividualSetting: () => ({}),
    updateSetting: () => ({}),
    setSetting: () => ({}),
    setCallbacks: () => {},
    saveSettingsToStorage: () => {},
    loadSettingsFromStorage: () => ({}),
    getAllCategories: () => ([]),
    getCategoryMaterials: () => ([]),
    applyCategorySettings: () => {}
  };
}

export { materialManager };

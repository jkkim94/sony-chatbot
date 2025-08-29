/**
 * LightingManager.js
 * 단순화된 조명 관리자 - 기능은 유지하되 복잡성 제거
 */

import * as THREE from 'three';

export class LightingManager {
  constructor() {
    // 단순화된 조명 구조 (이중 구조 제거)
    this.lights = {
      directional: null,
      point: null,
      spot: null,
      ambient: null
    };
    
    this.scene = null;
    
    // 기본 설정 (JSON에서 오버라이드됨)
    this.defaultSettings = {
      directional: {
        enabled: true,
        intensity: 2.5,
        color: [1, 1, 1],
        position: [0, 0.3, 2.5],
        target: [0, 0, 0],
        castShadow: false
      },
      point: {
        enabled: true,
        intensity: 1.0,
        color: [1, 1, 1],
        position: [2, 2, 2],
        distance: 0,
        decay: 2,
        castShadow: false
      },
      spot: {
        enabled: false,
        intensity: 1.5,
        color: [1, 1, 1],
        position: [-2, 3, 1],
        target: [0, 1, 0],
        angle: Math.PI / 6,
        penumbra: 0.2,
        distance: 0,
        decay: 2,
        castShadow: false
      },
      ambient: {
        enabled: true,
        intensity: 0.4,
        color: [1, 1, 1]
      },
      overall: {
      contrast: 1.0,
        brightness: 1.0,
        warmth: 1.0,
        exposure: 1.0
      }
    };

    // 현재 설정 (JSON에서 로드된 값)
    this.currentSettings = { ...this.defaultSettings };
    
    // 로컬 스토리지에서 사용자 커스텀 설정 복원
    this.loadUserSettings();
  }

  // 🎯 JSON 기반 모델별 조명 로드 (핵심 기능)
  async loadPresetForModel(modelName) {
    try {
      console.log(`💡 [LightingManager] ${modelName} 모델 조명 설정 로드 시작`);
      
      // 1. JSON 파일에서 모델별 조명 설정 로드
      const response = await fetch(`/presets/${modelName}-lighting.json`);
        if (response.ok) {
          const jsonPreset = await response.json();
        console.log(`✅ [LightingManager] ${modelName} JSON 조명 설정 로드 성공:`, jsonPreset);
        
        // JSON 설정을 기본 설정에 병합
        this.currentSettings = this.mergeSettings(this.defaultSettings, jsonPreset);
        
        // 조명이 이미 초기화되어 있다면 즉시 적용
        if (this.scene) {
          this.applyCurrentSettings();
        }
        
        return this.currentSettings;
      }
    } catch (error) {
      console.warn(`⚠️ [LightingManager] ${modelName} JSON 조명 설정 로드 실패, 기본값 사용:`, error);
    }
    
    // JSON 로드 실패 시 기본 설정 사용
    this.currentSettings = { ...this.defaultSettings };
    return this.currentSettings;
  }

  // 🎯 설정 병합 헬퍼 (JSON + 기본값)
  mergeSettings(defaultSettings, jsonSettings) {
    const merged = { ...defaultSettings };
    
    // 각 조명 타입별로 병합
    ['directional', 'point', 'spot', 'ambient'].forEach(lightType => {
      if (jsonSettings[lightType]) {
        merged[lightType] = { ...defaultSettings[lightType], ...jsonSettings[lightType] };
      }
    });
    
    // 전체 조정 설정 병합
    if (jsonSettings.overall) {
      merged.overall = { ...defaultSettings.overall, ...jsonSettings.overall };
    }
    
    return merged;
  }

  // 🎯 조명 초기화 (씬에 조명 생성)
  initializeLights(initialSettings = null) {
    if (!this.scene) {
      console.error('❌ [LightingManager] 씬이 설정되지 않았습니다.');
      return;
    }

    const settings = initialSettings || this.currentSettings;
    console.log('💡 [LightingManager] 조명 초기화 시작:', settings);

    // 기존 조명 제거
    this.disposeLights();

    // Directional Light 생성
    if (settings.directional) {
      const config = settings.directional;
      this.lights.directional = new THREE.DirectionalLight(
        new THREE.Color().setRGB(config.color[0], config.color[1], config.color[2]),
        config.intensity
      );
      this.lights.directional.position.set(config.position[0], config.position[1], config.position[2]);
      this.lights.directional.castShadow = config.castShadow || false;
      this.lights.directional.visible = config.enabled;
      this.scene.add(this.lights.directional);
    }

    // Point Light 생성
    if (settings.point) {
      const config = settings.point;
      this.lights.point = new THREE.PointLight(
        new THREE.Color().setRGB(config.color[0], config.color[1], config.color[2]),
        config.intensity,
        config.distance,
        config.decay
      );
      this.lights.point.position.set(config.position[0], config.position[1], config.position[2]);
      this.lights.point.castShadow = config.castShadow || false;
      this.lights.point.visible = config.enabled;
      this.scene.add(this.lights.point);
    }

    // Spot Light 생성
    if (settings.spot) {
      const config = settings.spot;
      this.lights.spot = new THREE.SpotLight(
        new THREE.Color().setRGB(config.color[0], config.color[1], config.color[2]),
        config.intensity,
        config.distance,
        config.angle,
        config.penumbra,
        config.decay
      );
      this.lights.spot.position.set(config.position[0], config.position[1], config.position[2]);
      this.lights.spot.target.position.set(config.target[0], config.target[1], config.target[2]);
      this.lights.spot.castShadow = config.castShadow || false;
      this.lights.spot.visible = config.enabled;
      this.scene.add(this.lights.spot);
      this.scene.add(this.lights.spot.target);
    }

    // Ambient Light 생성
    if (settings.ambient) {
      const config = settings.ambient;
      this.lights.ambient = new THREE.AmbientLight(
        new THREE.Color().setRGB(config.color[0], config.color[1], config.color[2]),
        config.intensity
      );
      this.lights.ambient.visible = config.enabled;
      this.scene.add(this.lights.ambient);
    }

    console.log('✅ [LightingManager] 조명 초기화 완료');
  }

  // 🎯 실시간 조명 조정 (UI에서 호출)
  updateLight(lightType, property, value) {
    console.log(`🎛️ [LightingManager] ${lightType}.${property} = ${value}`);
    
    // 설정 업데이트
    if (this.currentSettings[lightType]) {
      this.currentSettings[lightType][property] = value;
    }
    
    // 실제 조명 객체에 즉시 적용
    if (this.lights[lightType]) {
      const light = this.lights[lightType];
      
      switch (property) {
        case 'enabled':
          light.visible = value;
          break;
        case 'intensity':
          // 개별 조명 강도 변경 시 기본값도 업데이트
          this.currentSettings[lightType].intensity = value;
          light.intensity = value;
          // 전체 조정 재적용 (새로운 기본값으로)
          this.reapplyOverallAdjustments();
          break;
        case 'color':
          if (Array.isArray(value)) {
            light.color.setRGB(value[0], value[1], value[2]);
          }
          break;
        case 'position':
          if (Array.isArray(value)) {
            light.position.set(value[0], value[1], value[2]);
          }
          break;
        case 'target':
          if (Array.isArray(value) && light.target) {
            light.target.position.set(value[0], value[1], value[2]);
          }
          break;
        case 'castShadow':
          light.castShadow = value;
          break;
        // Spot Light 전용 속성들
        case 'angle':
          if (light.angle !== undefined) light.angle = value;
          break;
        case 'penumbra':
          if (light.penumbra !== undefined) light.penumbra = value;
          break;
        case 'distance':
          if (light.distance !== undefined) light.distance = value;
          break;
        case 'decay':
          if (light.decay !== undefined) light.decay = value;
          break;
      }
    }
    
    // 사용자 설정 저장
    this.saveUserSettings();
  }

  // 🎯 전체 조명 조정 (대비, 밝기, 색온도, 노출)
  updateOverall(property, value, saveSettings = true) {
    console.log(`🎨 [LightingManager] 전체 조정 ${property} = ${value}`);
    
    this.currentSettings.overall[property] = value;
    
    // 모든 전체 조정을 한 번에 적용 (서로 덮어씌우는 문제 방지)
    this.applyAllOverallAdjustments();
    
    // 사용자 설정 저장 (applyCurrentSettings에서 호출될 때는 저장하지 않음)
    if (saveSettings) {
      this.saveUserSettings();
    }
  }

  // 🎯 모든 전체 조정을 한 번에 적용
  applyAllOverallAdjustments() {
    if (!this.currentSettings.overall) return;
    
    const overall = this.currentSettings.overall;
    
    Object.keys(this.lights).forEach(lightType => {
      if (this.lights[lightType] && this.currentSettings[lightType]) {
        const light = this.lights[lightType];
        const baseIntensity = this.currentSettings[lightType].intensity;
        const baseColor = this.currentSettings[lightType].color;
        
        // 1. 기본 강도에서 시작
        let finalIntensity = baseIntensity;
        
        // 2. 밝기 조정 적용
        if (overall.brightness !== undefined) {
          finalIntensity *= overall.brightness;
        }
        
        // 3. 대비 조정 적용
        if (overall.contrast !== undefined) {
          const contrastMultiplier = 0.5 + (overall.contrast - 0.5) * 2;
          finalIntensity *= contrastMultiplier;
        }
        
        // 4. 노출 조정 적용
        if (overall.exposure !== undefined) {
          finalIntensity *= overall.exposure;
        }
        
        // 5. 최종 강도 적용
        light.intensity = finalIntensity;
        
        // 6. 색온도 조정 적용
        if (overall.warmth !== undefined) {
          const adjustedColor = this.adjustColorTemperature(baseColor, overall.warmth);
          light.color.setRGB(adjustedColor[0], adjustedColor[1], adjustedColor[2]);
        }
      }
    });
  }

  // 🎯 색온도 조정 헬퍼
  adjustColorTemperature(baseColor, warmth) {
    // warmth: 0.5 (차가움) ~ 1.5 (따뜻함)
    const [r, g, b] = baseColor;
    
    if (warmth > 1.0) {
      // 따뜻하게 (빨간색/노란색 증가)
      return [
        Math.min(1, r * (1 + (warmth - 1) * 0.3)),
        Math.min(1, g * (1 + (warmth - 1) * 0.1)),
        Math.max(0, b * (1 - (warmth - 1) * 0.2))
      ];
    } else {
      // 차갑게 (파란색 증가)
      return [
        Math.max(0, r * (1 - (1 - warmth) * 0.2)),
        Math.max(0, g * (1 - (1 - warmth) * 0.1)),
        Math.min(1, b * (1 + (1 - warmth) * 0.3))
      ];
    }
  }

  // 🎯 전체 조정 재적용 (개별 조명 강도 변경 후)
  reapplyOverallAdjustments() {
    // 새로운 통합 방식 사용
    this.applyAllOverallAdjustments();
  }

  // 🎯 현재 설정 적용 (초기화 후)
  applyCurrentSettings() {
    if (!this.scene) return;
    
    // 개별 조명 설정 적용
    Object.keys(this.currentSettings).forEach(lightType => {
      if (lightType !== 'overall' && this.lights[lightType]) {
        const config = this.currentSettings[lightType];
        this.updateLight(lightType, 'enabled', config.enabled);
        this.updateLight(lightType, 'intensity', config.intensity);
        this.updateLight(lightType, 'color', config.color);
        this.updateLight(lightType, 'position', config.position);
        if (config.target) {
          this.updateLight(lightType, 'target', config.target);
        }
      }
    });
    
    // 전체 조정 설정 적용 (중요!)
    if (this.currentSettings.overall) {
      // 통합 방식으로 모든 전체 조정을 한 번에 적용
      this.applyAllOverallAdjustments();
    }
  }

  // 🎯 조명 정리
  disposeLights() {
    Object.values(this.lights).forEach(light => {
      if (light && this.scene) {
        this.scene.remove(light);
        if (light.target) {
          this.scene.remove(light.target);
        }
      }
    });
    this.lights = { directional: null, point: null, spot: null, ambient: null };
  }

  // 🎯 사용자 설정 저장/로드
  saveUserSettings() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('userLightingSettings', JSON.stringify(this.currentSettings));
      }
    } catch (error) {
      console.warn('사용자 조명 설정 저장 실패:', error);
    }
  }

  loadUserSettings() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('userLightingSettings');
        if (saved) {
          const userSettings = JSON.parse(saved);
          this.currentSettings = this.mergeSettings(this.defaultSettings, userSettings);
        }
      }
    } catch (error) {
      console.warn('사용자 조명 설정 로드 실패:', error);
    }
  }

  // 🎯 현재 설정 반환
  getCurrentSettings() {
    return { ...this.currentSettings };
  }

  // 🎯 씬 참조 설정
  setScene(scene) {
    this.scene = scene;
  }

  // 🎯 조명 객체 반환
  getLights() {
    return { ...this.lights };
  }

  // 🎯 기존 호환성을 위한 메서드들 (page.js에서 사용)
  applySettings(settings) {
    console.log('💡 [LightingManager] applySettings 호출:', settings);
    
    // 내부 상태 업데이트
    this.currentSettings = { ...this.currentSettings, ...settings };
    
    // 조명이 초기화되어 있다면 즉시 적용
    if (this.scene) {
      this.applyCurrentSettings();
    }
    
    // 사용자 설정 저장
    this.saveUserSettings();
  }

  // 🎯 프리셋 적용 (기존 호환성)
  applyPreset(presetName) {
    console.log(`🎨 [LightingManager] 프리셋 적용: ${presetName}`);
    
    // 하드코딩된 프리셋들
    const presets = {
      outdoor: {
        directional: { enabled: true, intensity: 3.2, color: [1, 0.95, 0.85], position: [1, 2, 1.5] },
        point: { enabled: true, intensity: 1.0, color: [0.9, 0.95, 1], position: [-1, 1.5, 1] },
        spot: { enabled: false },
        ambient: { enabled: true, intensity: 0.6, color: [0.9, 0.95, 1] },
        overall: { contrast: 1.2, brightness: 1.1, warmth: 1.2, exposure: 1.1 }
      },
      indoor: {
        directional: { enabled: true, intensity: 2.0, color: [1, 0.9, 0.7], position: [0, 1.5, 1] },
        point: { enabled: true, intensity: 1.8, color: [1, 0.85, 0.6], position: [1, 2.5, 0.5] },
        spot: { enabled: false },
        ambient: { enabled: true, intensity: 0.7, color: [1, 0.9, 0.8] },
        overall: { contrast: 0.9, brightness: 0.9, warmth: 0.8, exposure: 0.9 }
      },
      studio: {
        directional: { enabled: true, intensity: 2.8, color: [1, 1, 1], position: [0, 0.3, 2.5] },
        point: { enabled: true, intensity: 1.5, color: [1, 0.95, 0.9], position: [1.5, 2, 1.5] },
        spot: { enabled: false },
        ambient: { enabled: true, intensity: 0.5, color: [1, 1, 1] },
        overall: { contrast: 1.0, brightness: 1.0, warmth: 1.0, exposure: 1.0 }
      },
      dramatic: {
        directional: { enabled: true, intensity: 4.0, color: [1, 0.8, 0.6], position: [2, 3, 1] },
        point: { enabled: true, intensity: 0.5, color: [0.6, 0.7, 1], position: [-2, 1, 1] },
        spot: { enabled: true, intensity: 2.0, color: [1, 0.9, 0.7], position: [0, 4, 0] },
        ambient: { enabled: true, intensity: 0.2, color: [0.8, 0.8, 1] },
        overall: { contrast: 1.5, brightness: 0.8, warmth: 1.3, exposure: 0.7 }
      }
    };

    const preset = presets[presetName];
    if (!preset) {
      console.warn(`❌ [LightingManager] 프리셋 '${presetName}'을 찾을 수 없습니다.`);
      return this.currentSettings;
    }

    // 프리셋 적용
    this.currentSettings = this.mergeSettings(this.defaultSettings, preset);
    
    // 조명이 초기화되어 있다면 즉시 적용
    if (this.scene) {
      this.applyCurrentSettings();
    }
    
    // 사용자 설정 저장
    this.saveUserSettings();
    
    return this.currentSettings;
  }
}

// 싱글톤 인스턴스
export const lightingManager = new LightingManager();

/**
 * CameraManager
 * 카메라 위치, 각도, OrbitControls 관리 클래스
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// 환경 설정 제거 - 모든 모드에서 동일하게 동작

class CameraManager {
  constructor() {
    // 카메라 및 컨트롤 참조
    this.camera = null;
    this.controls = null;
    this.renderer = null;
    this.container = null;
    
    // 현재 모델 정보
    this.currentModel = null;
    
    // 환경별 설정 가져오기
    // 환경 설정 제거 - 모든 모드에서 동일하게 동작
    this.isProduction = false; // 항상 개발 모드처럼 동작
    
    // 카메라 설정 값들
    this.settings = {
      // 카메라 위치 (위에서 내려다보기)
      positionX: 0,
      positionY: 1.6,  // 캐릭터보다 높은 위치
      positionZ: 0.65,  // 기본값 (MAN 모델 기준)
      
      // 카메라 타겟 (바라보는 지점 - 캐릭터 가슴/목 부근)
      targetX: 0,
      targetY: 1.5,    // 캐릭터 상반신
      targetZ: 0,
      
      // FOV 설정
      fov: 50,
      
      // 카메라 회전 제어 (yaw, pitch, roll)
      yaw: 0,           // Y축 회전 (좌우)
      pitch: 0,         // X축 회전 (상하)
      roll: 0,          // Z축 회전 (기울기)
      
      // OrbitControls 설정
      enableDamping: true,
      dampingFactor: 0.05,
      minDistance: 0.4,
      maxDistance: 3,
      minPolarAngle: 0,
      maxPolarAngle: Math.PI,
      enablePan: false,
      enableZoom: true,
      enableRotate: true
    };
    
         // 환경별 카메라 설정
    this.environmentSettings = {
      // 개발 모드: 자유로운 제어
      development: {
        minAzimuthAngle: -Infinity,
        maxAzimuthAngle: Infinity,
        minPolarAngle: 0,
        maxPolarAngle: Math.PI,
        minDistance: 0.4,
        maxDistance: 3.0,
        enablePan: true,
        rotateSpeed: 1.0,
        zoomSpeed: 1.0,
        renderCutoffDistance: 0.1
      },
      // Release 모드: 제한적 제어
      production: {
        minAzimuthAngle: -Infinity,
        maxAzimuthAngle: Infinity,
        minPolarAngle: 0,              // 🚀 Dev 모드와 동일: 위쪽 각도 제한 해제
        maxPolarAngle: Math.PI,        // 🚀 Dev 모드와 동일: 아래쪽 각도 제한 해제
        minDistance: 0.4,    // 🚀 Dev 모드와 동일: 최소 거리
        maxDistance: 3.0,    // 🚀 Dev 모드와 동일: 최대 거리
        enablePan: true,     // 🚀 Dev 모드와 동일: 패닝 활성화
        rotateSpeed: 1.0,    // 🚀 Dev 모드와 동일: 회전 속도
        zoomSpeed: 1.0,      // 🚀 Dev 모드와 동일: 줌 속도
        renderCutoffDistance: 0.1  // 🚀 Dev 모드와 동일: 렌더링 중단 거리
      }
    };
    
    // 모델별 카메라 위치 및 회전 설정
    this.modelCameraSettings = {
      man: {
        positionZ: 0.625,
        positionY: 1.6,
        positionX: 0.0,

        targetY: 1.5,
        yaw: 0,      // Y축 회전 (좌우)
        pitch: 0,    // X축 회전 (상하)
        roll: 0      // Z축 회전 (기울기)
      },
      woman: {
        positionZ: 0.60,
        positionX: 0.15,
        positionY: 1.6,
        targetY: 1.5,
        yaw: 45,
        pitch: 0,
        roll: 0
      },
      brunette: {
        positionZ: 0.7,
        positionX: 0.0,
        positionY: 1.6,
        targetY: 1.5,
        yaw: 4500,
        pitch: 45,
        roll: 40
      },
      turtle: {
        positionZ: 0.8,
        positionY: 1.6,
        targetY: 1.5,
        yaw: 0,
        pitch: 0,
        roll: 0
      },
      yuha: {
        positionZ: 0.8,
        positionY: 1.6,
        targetY: 1.5,
        yaw: 0,
        pitch: 0,
        roll: 0
      }
    };
    
    // 콜백 함수들
    this.onSettingsChange = null;
  }
  
  /**
   * 카메라 매니저 초기화
   */
  init(container, renderer) {
    this.container = container;
    this.renderer = renderer;
    
    // 카메라 생성
    this.createCamera();
    
    // OrbitControls 생성
    this.createControls();
    
    console.log('📷 CameraManager 초기화 완료');
    return this.camera;
  }
  
  /**
   * 카메라 생성
   */
  createCamera() {
    if (!this.container) return;
    
    const camera = new THREE.PerspectiveCamera(
      this.settings.fov,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    
    // 먼저 카메라 참조 설정
    this.camera = camera;
    
    // 카메라 위치 설정
    this.updateCameraPosition();
    
    console.log('📷 카메라 생성 완료:', {
      position: camera.position.clone(),
      target: { x: this.settings.targetX, y: this.settings.targetY, z: this.settings.targetZ },
      fov: this.settings.fov
    });
  }
  
  /**
   * OrbitControls 생성
   */
  createControls() {
    if (!this.camera || !this.renderer) return;
    
    // 기존 컨트롤 정리
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    
    // 새로운 OrbitControls 생성
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // 설정 적용
    this.applyControlsSettings(controls);
    
    this.controls = controls;
    
    // OrbitControls 생성 후 카메라 위치 다시 강제 설정
    setTimeout(() => {
      this.updateCameraPosition();
      if (this.controls) {
        this.controls.update();
      }
      console.log('📷 OrbitControls 생성 후 카메라 위치 재설정 완료');
    }, 50);
    
    console.log('🎮 OrbitControls 생성 완료');
  }
  

  
  /**
   * OrbitControls 설정 적용 (환경별 설정 사용)
   */
  applyControlsSettings(controls) {
    const s = this.settings;
    
    controls.enableDamping = s.enableDamping;
    controls.dampingFactor = s.dampingFactor;
    
    // 환경별 설정 적용
    const env = 'development'; // 항상 개발 모드
    const envSettings = this.environmentSettings[env];
    
    if (envSettings) {
      // 환경별 제한 적용
      controls.minDistance = envSettings.minDistance;
      controls.maxDistance = envSettings.maxDistance;
      controls.minPolarAngle = envSettings.minPolarAngle;
      controls.maxPolarAngle = envSettings.maxPolarAngle;
      controls.minAzimuthAngle = envSettings.minAzimuthAngle;
      controls.maxAzimuthAngle = envSettings.maxAzimuthAngle;
      
      // 환경별 제어 설정
      controls.enablePan = envSettings.enablePan;
      controls.enableZoom = s.enableZoom;  // 기본값 유지
      controls.enableRotate = s.enableRotate;  // 기본값 유지
      
      // 환경별 속도 설정
      controls.rotateSpeed = envSettings.rotateSpeed;
      controls.zoomSpeed = envSettings.zoomSpeed;
      
      if (true) {
        console.log(`🔧 [CameraManager] ${env} 모드 설정 적용:`, {
          distance: `${envSettings.minDistance} ~ ${envSettings.maxDistance}`,
          polarAngle: `${(envSettings.minPolarAngle * 180 / Math.PI).toFixed(1)}° ~ ${(envSettings.maxPolarAngle * 180 / Math.PI).toFixed(1)}°`,
          azimuthAngle: '자유롭게',
          pan: envSettings.enablePan ? '활성화' : '비활성화',
          rotateSpeed: `${envSettings.rotateSpeed}x`,
          zoomSpeed: `${envSettings.zoomSpeed}x`
        });
      }
    }
    
    // 타겟 설정
    controls.target.set(s.targetX, s.targetY, s.targetZ);
    controls.enabled = true;
    
    // 패닝 설정
    if (envSettings?.enablePan) {
      controls.panSpeed = 1.0;
      controls.screenSpacePanning = false;
    }
  }
  
  /**
   * 카메라 위치 업데이트
   */
  updateCameraPosition() {
    if (!this.camera) return;
    
    const s = this.settings;
    this.camera.position.set(s.positionX, s.positionY, s.positionZ);
    
    // 기본 lookAt 방향 설정
    this.camera.lookAt(s.targetX, s.targetY, s.targetZ);
    
    // 회전 값이 있다면 적용
    if (s.yaw !== 0 || s.pitch !== 0 || s.roll !== 0) {
      this.applyCameraRotation();
    }
    
    console.log('📷 카메라 위치 업데이트:', {
      position: { x: s.positionX, y: s.positionY, z: s.positionZ },
      target: { x: s.targetX, y: s.targetY, z: s.targetZ },
      rotation: { yaw: s.yaw, pitch: s.pitch, roll: s.roll }
    });
  }
  
  /**
   * 카메라 설정 변경
   */
  updateSettings(newSettings) {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...newSettings };
    
    // 카메라 위치 업데이트
    this.updateCameraPosition();
    
    // OrbitControls 설정 업데이트
    if (this.controls) {
      this.applyControlsSettings(this.controls);
      this.controls.update();
    }
    
    // FOV가 변경된 경우 projection matrix 업데이트
    if (oldSettings.fov !== this.settings.fov) {
      if (this.camera) {
        this.camera.fov = this.settings.fov;
        this.camera.updateProjectionMatrix();
      }
    }
    
    // 콜백 호출
    if (this.onSettingsChange) {
      this.onSettingsChange(this.settings);
    }
    
    console.log('📷 카메라 설정 업데이트:', newSettings);
  }
  
  /**
   * 모델 변경 시 카메라 위치 및 회전 자동 조정
   */
  setModel(modelName) {
    if (this.currentModel === modelName) return;
    
    console.log(`📷 모델 변경 시작: ${this.currentModel} → ${modelName}`);
    
    this.currentModel = modelName;
    
    // 모델별 카메라 설정 적용
    const modelSettings = this.modelCameraSettings[modelName];
    if (modelSettings) {
      console.log(`📷 모델 ${modelName} 설정:`, modelSettings);
      
      // 위치 설정 업데이트
      this.updateSettings(modelSettings);
      
      // 회전 설정 적용
      if (modelSettings.yaw !== undefined) {
        this.settings.yaw = modelSettings.yaw;
        console.log(`📷 Yaw 설정: ${modelSettings.yaw}°`);
      }
      if (modelSettings.pitch !== undefined) {
        this.settings.pitch = modelSettings.pitch;
        console.log(`📷 Pitch 설정: ${modelSettings.pitch}°`);
      }
      if (modelSettings.roll !== undefined) {
        this.settings.roll = modelSettings.roll;
        console.log(`📷 Roll 설정: ${modelSettings.roll}°`);
      }
      
      console.log(`📷 현재 설정 상태:`, {
        yaw: this.settings.yaw,
        pitch: this.settings.pitch,
        roll: this.settings.roll
      });
      
      // 회전 적용
      this.applyCameraRotation();
      
      console.log(`📷 모델 변경으로 카메라 위치 및 회전 조정 완료: ${modelName}`, {
        position: { positionZ: modelSettings.positionZ, positionY: modelSettings.positionY, targetY: modelSettings.targetY },
        rotation: { yaw: modelSettings.yaw, pitch: modelSettings.pitch, roll: modelSettings.roll }
      });
    } else {
      console.warn(`📷 알 수 없는 모델: ${modelName}, 기본 카메라 설정 사용`);
    }
  }
  /**
   * 프리셋 적용
   */
  applyPreset(presetName) {
    const presets = {
      default: {
        positionX: 0, positionY: 2.2, positionZ: 0.7,  // 위에서 내려다보기
        targetX: 0, targetY: 1.4, targetZ: 0,           // 캐릭터 상반신
        fov: 50
      },
      closeUp: {
        positionX: 0, positionY: 2.0, positionZ: 0.5,  // 가까운 위치에서 내려다보기
        targetX: 0, targetY: 1.6, targetZ: 0,           // 얼굴/목 부근
        fov: 40
      },
      wideShot: {
        positionX: 0, positionY: 2.5, positionZ: 1.2,  // 멀리서 위에서 내려다보기
        targetX: 0, targetY: 1.2, targetZ: 0,           // 전신 중심
        fov: 60
      },
      topDown: {
        positionX: 0, positionY: 3.0, positionZ: 0.3,  // 완전히 위에서 내려다보기
        targetX: 0, targetY: 1.0, targetZ: 0,           // 머리 부근
        fov: 50
      }
    };
    
    const preset = presets[presetName];
    if (preset) {
      this.updateSettings(preset);
      console.log(`📷 프리셋 적용: ${presetName}`);
    } else {
      console.warn(`📷 알 수 없는 프리셋: ${presetName}`);
    }
  }
  
  /**
   * 카메라 위치 강제 리셋 (OrbitControls가 위치를 변경한 경우)
   */
  forceReset() {
    this.updateCameraPosition();
    if (this.controls) {
      this.controls.target.set(this.settings.targetX, this.settings.targetY, this.settings.targetZ);
      this.controls.update();
    }
    console.log('📷 카메라 위치 강제 리셋 완료');
  }

  /**
   * 업데이트 (매 프레임마다 호출)
   */
  update() {
    if (this.controls) {
      this.controls.update();
    }
  }
  
  /**
   * 카메라 회전 적용
   */
  applyCameraRotation() {
    if (!this.camera) return;

    console.log('📷 회전 적용 시작 - 현재 설정:', {
      yaw: this.settings.yaw,
      pitch: this.settings.pitch,
      roll: this.settings.roll
    });

    // 라디안으로 변환
    const yawRad = THREE.MathUtils.degToRad(this.settings.yaw);
    const pitchRad = THREE.MathUtils.degToRad(this.settings.pitch);
    const rollRad = THREE.MathUtils.degToRad(this.settings.roll);

    console.log('📷 라디안 변환 결과:', {
      yawRad: yawRad.toFixed(4),
      pitchRad: pitchRad.toFixed(4),
      rollRad: rollRad.toFixed(4)
    });

    // 회전 적용 전 카메라 상태
    console.log('📷 회전 적용 전 카메라 상태:', {
      position: {
        x: this.camera.position.x.toFixed(3),
        y: this.camera.position.y.toFixed(3),
        z: this.camera.position.z.toFixed(3)
      },
      rotation: {
        x: THREE.MathUtils.radToDeg(this.camera.rotation.x).toFixed(2),
        y: THREE.MathUtils.radToDeg(this.camera.rotation.y).toFixed(2),
        z: THREE.MathUtils.radToDeg(this.camera.rotation.z).toFixed(2)
      }
    });

    // 카메라의 기본 방향을 유지하면서 회전 적용
    // 1. 먼저 기본 lookAt 방향으로 설정
    this.camera.lookAt(this.settings.targetX, this.settings.targetY, this.settings.targetZ);
    
    console.log('📷 lookAt 적용 후 회전:', {
      x: THREE.MathUtils.radToDeg(this.camera.rotation.x).toFixed(2),
      y: THREE.MathUtils.radToDeg(this.camera.rotation.y).toFixed(2),
      z: THREE.MathUtils.radToDeg(this.camera.rotation.z).toFixed(2)
    });
    
    // 2. Yaw (Y축 회전) - 좌우 회전
    if (yawRad !== 0) {
      this.camera.rotateY(yawRad);
      console.log('📷 Yaw 회전 적용 후:', {
        y: THREE.MathUtils.radToDeg(this.camera.rotation.y).toFixed(2)
      });
    }
    
    // 3. Pitch (X축 회전) - 상하 회전
    if (pitchRad !== 0) {
      this.camera.rotateX(pitchRad);
      console.log('📷 Pitch 회전 적용 후:', {
        x: THREE.MathUtils.radToDeg(this.camera.rotation.x).toFixed(2)
      });
    }
    
    // 4. Roll (Z축 회전) - 기울기
    if (rollRad !== 0) {
      this.camera.rotateZ(rollRad);
      console.log('📷 Roll 회전 적용 후:', {
        z: THREE.MathUtils.radToDeg(this.camera.rotation.z).toFixed(2)
      });
    }
    
    // OrbitControls가 있다면 업데이트
    if (this.controls) {
      this.controls.update();
    }
    
    // 최종 카메라 상태
    console.log('📷 회전 적용 완료 - 최종 상태:', {
      yaw: this.settings.yaw,
      pitch: this.settings.pitch,
      roll: this.settings.roll,
      cameraRotation: {
        x: THREE.MathUtils.radToDeg(this.camera.rotation.x).toFixed(2),
        y: THREE.MathUtils.radToDeg(this.camera.rotation.y).toFixed(2),
        z: THREE.MathUtils.radToDeg(this.camera.rotation.z).toFixed(2)
      }
    });
  }

  /**
   * 현재 설정 가져오기
   */
  getSettings() {
    return { ...this.settings };
  }
  
  /**
   * OrbitControls 참조 가져오기
   */
  getControls() {
    return this.controls;
  }
  
  /**
   * 환경별 캐릭터 근접 시 렌더링 중단 여부 확인
   */
  shouldStopRendering() {
    if (!this.camera) { // 환경 체크 제거
      return false;
    }
    
    // 환경별 렌더링 중단 거리 사용
    const env = 'development'; // 항상 개발 모드
    const envSettings = this.environmentSettings[env];
    
    if (!envSettings) return false;
    
    // 카메라와 타겟(캐릭터) 사이의 거리 계산
    const distance = this.camera.position.distanceTo(
      new THREE.Vector3(this.settings.targetX, this.settings.targetY, this.settings.targetZ)
    );
    
    // 렌더링 중단 거리보다 가까우면 true 반환
    if (distance < envSettings.renderCutoffDistance) {
      if (true) {
        console.log(`🚫 [CameraManager] 렌더링 중단: 거리 ${distance.toFixed(3)} < ${envSettings.renderCutoffDistance}`);
      }
      return true;
    }
    
    return false;
  }
  
}

export default CameraManager;

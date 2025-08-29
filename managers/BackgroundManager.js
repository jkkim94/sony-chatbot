/**
 * BackgroundManager.js
 * 배경 관련 설정을 관리하는 매니저 - 스튜디오 배경만 지원
 */

import * as THREE from 'three';

export class BackgroundManager {
  constructor() {
    this.currentBackground = 'studio';
    this.sceneRef = null;
    this.floorRef = null;
    
    this.backgroundTypes = {
      studio: '스튜디오',
      outdoor: '야외'
    };


  }



  // Scene 참조 설정
  setSceneRef(sceneRef) {
    this.sceneRef = sceneRef;
    this._initializeFloor();
  }

  // 바닥 참조 설정
  setFloorRefs(floorRef) {
    this.floorRef = floorRef;
  }

  // 배경 설정 - 스튜디오와 야외 지원
  setBackground(backgroundType = 'studio') {
    if (!this.sceneRef?.current) {
      console.log(`🎨 [BackgroundManager] Scene 참조 대기 중`);
      this.currentBackground = backgroundType;
      return;
    }
    
    console.log(`🎨 [BackgroundManager] ${backgroundType} 배경 설정`);
    this.currentBackground = backgroundType;
    
    const scene = this.sceneRef.current;
    
    // 배경 타입에 따른 색상 설정
    switch (backgroundType) {
      case 'studio':
        // 스튜디오 배경 - 밝은 회색
        scene.background = new THREE.Color(0xf8f9fa);
        break;
      case 'outdoor':
        // 야외 배경 - 하늘색 그라데이션
        const skyColor = new THREE.Color(0x87CEEB); // 하늘색
        const horizonColor = new THREE.Color(0xE0F6FF); // 지평선 색상
        // Canvas를 사용하여 그라데이션 텍스처 생성
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB'); // 하늘색
        gradient.addColorStop(1, '#E0F6FF'); // 지평선 색상
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const gradientTexture = new THREE.CanvasTexture(canvas);
        scene.background = gradientTexture;
        break;
      default:
        // 기본값 - 스튜디오
        scene.background = new THREE.Color(0xf8f9fa);
        break;
    }
    
    // 바닥과 뒷벽도 동일한 색상으로 업데이트
    this._updateRoomColors();
    

  }



  // 단순한 배경 초기화 (바닥 + 뒷벽만) - 스튜디오 색상
  _initializeFloor() {
    if (!this.sceneRef?.current) return;

    const scene = this.sceneRef.current;

    // 룸 그룹 생성
    const roomGroup = new THREE.Group();

    // 1. 배경 반구 생성 (가장자리가 둥글게 말려든 돔 형태)
    const hemisphereGeometry = new THREE.SphereGeometry(
      8,                    // 반지름 8
      128,                  // 수평 세그먼트 (매우 높은 해상도로 부드러운 곡면)
      64,                   // 수직 세그먼트 (매우 높은 해상도로 부드러운 곡면)  
      0,                    // phiStart: 0 (수평 시작각)
      Math.PI * 2,          // phiLength: 360도 (전체 둘레)
      0,                    // thetaStart: 0 (수직 시작각 - 맨 위 극점부터)
      Math.PI / 2 + 0.2     // thetaLength: 90도 + 0.2 라디안 (가장자리 둥글게 처리)
    );
    const hemisphereTexture = this._createHemisphereGradientTexture();
    const hemisphereMaterial = new THREE.MeshLambertMaterial({
      map: hemisphereTexture,
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide, // 반구 내부와 바닥면 모두 보이도록
      alphaTest: 0, // 부드러운 경계를 위한 알파 테스트 비활성화
      depthWrite: true, // 깊이 버퍼 쓰기 활성화
      depthTest: true, // 깊이 테스트 활성화
      flatShading: false // 부드러운 셰이딩으로 곡면 강조
    });
    
    const backgroundHemisphere = new THREE.Mesh(hemisphereGeometry, hemisphereMaterial);
    backgroundHemisphere.position.set(0, 0.3, 0); // 반구를 약간 위로 올려서 둥근 가장자리가 바닥과 부드럽게 연결
1   
    // 그림자 설정 (반구의 바닥면이 그림자를 받음)
    backgroundHemisphere.receiveShadow = true; // 바닥면에서 캐릭터 그림자 수신
    backgroundHemisphere.castShadow = false;   // 반구 자체는 그림자 생성 안 함

    // 룸 그룹에 추가 (반구만)
    roomGroup.add(backgroundHemisphere);

    // 씬에 룸 그룹 추가
    scene.add(roomGroup);

    // 참조 저장 (반구)
    this.roomGroup = roomGroup;
    this.backgroundHemisphere = backgroundHemisphere;
    
    // 기존 바닥 참조는 반구로 대체
    if (this.floorRef) {
      this.floorRef.current = backgroundHemisphere; // 반구의 바닥면이 바닥 역할
    }

    console.log('🏠 [BackgroundManager] 스튜디오 룸 초기화 완료 (참조 이미지 기반 미묘한 그라데이션)');
    
    // 스튜디오 색상으로 룸 업데이트
    this._updateRoomColors();
  }

  // 스튜디오 그라데이션으로 룸 업데이트 (참조 이미지 기반 미묘한 그라데이션)
  _updateRoomColors() {
    if (!this.backgroundHemisphere) return;

    const hemisphere = this.backgroundHemisphere;

    // 새로운 반구 텍스처 생성 및 적용
    if (hemisphere.material.map) {
      hemisphere.material.map = this._createHemisphereGradientTexture();
      hemisphere.material.needsUpdate = true;
    }

    // 반구 항상 표시
    hemisphere.visible = true;

    console.log(`🏠 [BackgroundManager] 스튜디오 그라데이션 적용 완료 (참조 이미지 기반 미묘한 그라데이션)`);
  }

  // 참조 이미지 기반 미묘한 방사형 그라데이션 텍스처 생성 (이질감 없는 부드러운 전환)
  _createHemisphereGradientTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    // 반구용 방사형 그라데이션: 중심은 밝고 가장자리(끝)로 갈수록 어둡게
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY);
    
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, '#e8e9ea');     // 중심: 부드러운 밝은 회색 (참조 이미지와 유사)
    gradient.addColorStop(0.5, '#e0e1e2');  // 중간: 미묘한 변화
    gradient.addColorStop(0.7, '#e8e9ea');  // 중간-외곽: 조금 더 어두움
    gradient.addColorStop(0.85, '#e8e9ea'); // 가장자리 근처: 미묘한 전환
    gradient.addColorStop(0.95, '#e8e9ea'); // 가장자리 직전: 약간 어두움
    gradient.addColorStop(1, '#c0c1c2');    // 가장자리: 참조 이미지처럼 미묘한 어둠
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // 참조 이미지처럼 부드러운 전환을 위한 강화된 블러 효과
    context.filter = 'blur(2px)';
    context.drawImage(canvas, 0, 0);
    context.filter = 'blur(1px)';
    context.drawImage(canvas, 0, 0);
    context.filter = 'none';
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping; // 구체에서는 반복 래핑
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true; // 부드러운 전환을 위한 밉맵
    return texture;
  }


}

// 싱글톤 인스턴스
export const backgroundManager = new BackgroundManager();
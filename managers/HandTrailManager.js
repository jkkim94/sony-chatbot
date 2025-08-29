import * as THREE from 'three';
import { HAND_BONE_PATTERNS, HAND_ALTERNATIVE_PATTERNS, FINGER_BONE_PATTERNS } from '../constants/modelConstants';

export class HandTrailManager {
  constructor() {
    this.isEnabled = false;
    this.leftHandTrail = [];
    this.rightHandTrail = [];
    this.maxTrailLength = 40; // 궤적 최대 길이 증가 (더 긴 궤적)
    this.trailLines = {
      left: null,
      right: null
    };
    this.handBones = {
      left: null,
      right: null
    };
    this.scene = null;
    this.updateInterval = 2; // 더 자주 업데이트 (2프레임마다)
    this.frameCount = 0;
    this.fadeSpeed = 0.98; // 페이드 속도 (매 프레임마다 98%로 감소)
    this.minDistance = 0.005; // 최소 이동 거리 (더 민감하게)
    
    // 비활성 감지를 위한 변수들
    this.lastLeftPosition = null;
    this.lastRightPosition = null;
    this.leftInactiveFrames = 0;
    this.rightInactiveFrames = 0;
    this.maxInactiveFrames = 180; // 3초 (60fps 기준)
    this.autoFadeThreshold = 120; // 2초 후부터 자동 페이드 시작
  }

  // 초기화
  init(scene, model) {
    console.log('=== HandTrailManager 초기화 시작 ===');
    console.log('현재 활성화 상태:', this.isEnabled);
    
    // 기존 상태 보존
    const wasEnabled = this.isEnabled;
    const previousLeftTrail = [...this.leftHandTrail];
    const previousRightTrail = [...this.rightHandTrail];
    
    this.scene = scene;
    
    // 기존 궤적 라인 정리 (새 모델용으로 재생성)
    if (this.trailLines.left) {
      this.scene.remove(this.trailLines.left);
      this.trailLines.left.geometry.dispose();
      this.trailLines.left.material.dispose();
    }
    if (this.trailLines.right) {
      this.scene.remove(this.trailLines.right);
      this.trailLines.right.geometry.dispose();
      this.trailLines.right.material.dispose();
    }
    
    // 본 찾기 및 궤적 라인 재생성
    this.findHandBones(model);
    this.createTrailLines();
    
    // 상태 복원
    this.isEnabled = wasEnabled;
    
    // 궤적 데이터 복원 (새 모델에서도 유지)
    if (wasEnabled && (previousLeftTrail.length > 0 || previousRightTrail.length > 0)) {
      console.log('이전 궤적 데이터 복원 중...');
      this.leftHandTrail = previousLeftTrail;
      this.rightHandTrail = previousRightTrail;
      
      // 궤적 라인 업데이트
      if (this.leftHandTrail.length > 0) {
        this.updateTrailLine('left', this.leftHandTrail);
      }
      if (this.rightHandTrail.length > 0) {
        this.updateTrailLine('right', this.rightHandTrail);
      }
    }
    
    // 라인 표시 상태 설정
    if (this.isEnabled) {
      console.log('궤적 활성화 상태로 라인 설정');
      if (this.trailLines.left && this.handBones.left) {
        this.trailLines.left.visible = this.leftHandTrail.length > 0;
        console.log('왼손 라인 표시:', this.trailLines.left.visible);
      }
      if (this.trailLines.right && this.handBones.right) {
        this.trailLines.right.visible = this.rightHandTrail.length > 0;
        console.log('오른손 라인 표시:', this.trailLines.right.visible);
      }
    } else {
      console.log('궤적 비활성화 상태로 라인 숨김');
      if (this.trailLines.left) this.trailLines.left.visible = false;
      if (this.trailLines.right) this.trailLines.right.visible = false;
    }
    
    console.log('=== HandTrailManager 초기화 완료 ===');
    console.log('왼손 본:', this.handBones.left?.name || '없음');
    console.log('오른손 본:', this.handBones.right?.name || '없음');
    console.log('활성화 상태:', this.isEnabled);
    console.log('왼손 궤적 길이:', this.leftHandTrail.length);
    console.log('오른손 궤적 길이:', this.rightHandTrail.length);
  }

  // 손 본 찾기
  findHandBones(model) {
    if (!model) {
      console.warn('모델이 없어서 손 본을 찾을 수 없습니다.');
      return;
    }

    console.log('=== 손 본 찾기 시작 ===');
    console.log('모델 이름:', model.name || '이름 없음');
    
    // 기존 본 참조 초기화
    this.handBones.left = null;
    this.handBones.right = null;
    
    const allBones = [];
    const handBones = [];

    model.traverse((child) => {
      if (child.isBone) {
        allBones.push(child.name);
        const boneName = child.name.toLowerCase();
        
        // 손 관련 본만 필터링
        if (boneName.includes('hand') || boneName.includes('wrist')) {
          handBones.push({
            name: child.name,
            lowerName: boneName,
            bone: child
          });
        }
      }
    });

    console.log('전체 본 개수:', allBones.length);
    console.log('손 관련 본들:', handBones.map(h => h.name));

    // 정확한 본 이름 매칭 (대소문자 구분)
    for (const handBone of handBones) {
      const exactName = handBone.name;
      const lowerName = handBone.lowerName;
      
      // 왼손 본 찾기 - 정확한 이름 우선
      if (!this.handBones.left) {
        if (exactName === 'LeftHand' || exactName === 'lefthand' || 
            exactName === 'Left_Hand' || exactName === 'left_hand' ||
            exactName === 'mixamorigLeftHand' || lowerName === 'mixamoriglefthand') {
          this.handBones.left = handBone.bone;
          console.log('✅ 왼손 본 발견 (정확한 매칭):', handBone.name);
        }
      }
      
      // 오른손 본 찾기 - 정확한 이름 우선
      if (!this.handBones.right) {
        if (exactName === 'RightHand' || exactName === 'righthand' || 
            exactName === 'Right_Hand' || exactName === 'right_hand' ||
            exactName === 'mixamorigRightHand' || lowerName === 'mixamorigrighthand') {
          this.handBones.right = handBone.bone;
          console.log('✅ 오른손 본 발견 (정확한 매칭):', handBone.name);
        }
      }
    }

    console.log('1차 검색 결과 - 왼손:', this.handBones.left?.name || '없음');
    console.log('1차 검색 결과 - 오른손:', this.handBones.right?.name || '없음');

  }


  // 궤적 라인 생성
  createTrailLines() {
    if (!this.scene) return;

    console.log('궤적 라인 생성 시작...');

    // 왼손 궤적 라인 (파란색) - 부드러운 페이드를 위한 설정
    const leftGeometry = new THREE.BufferGeometry();
    const leftMaterial = new THREE.LineBasicMaterial({ 
      color: 0x0066ff, 
      linewidth: 8, // 라인 두께 증가
      transparent: true,
      opacity: 1.0,
      vertexColors: true,
      // 🚀 성능 최적화: AdditiveBlending → NormalBlending 변경
      blending: THREE.NormalBlending, // AdditiveBlending에서 변경 (성능 향상)
      depthWrite: true, // 🚀 깊이 쓰기 활성화로 성능 향상
      alphaTest: 0.01 // 🚀 알파테스트로 성능 향상
    });
    this.trailLines.left = new THREE.Line(leftGeometry, leftMaterial);
    this.trailLines.left.frustumCulled = false;
    this.trailLines.left.renderOrder = 999; // 렌더링 순서 조정
    this.scene.add(this.trailLines.left);

    // 오른손 궤적 라인 (빨간색) - 부드러운 페이드를 위한 설정
    const rightGeometry = new THREE.BufferGeometry();
    const rightMaterial = new THREE.LineBasicMaterial({ 
      color: 0xff3333, 
      linewidth: 8, // 라인 두께 증가
      transparent: true,
      opacity: 1.0,
      vertexColors: true,
      // 🚀 성능 최적화: AdditiveBlending → NormalBlending 변경
      blending: THREE.NormalBlending, // AdditiveBlending에서 변경 (성능 향상)
      depthWrite: true, // 🚀 깊이 쓰기 활성화로 성능 향상
      alphaTest: 0.01 // 🚀 알파테스트로 성능 향상
    });
    this.trailLines.right = new THREE.Line(rightGeometry, rightMaterial);
    this.trailLines.right.frustumCulled = false;
    this.trailLines.right.renderOrder = 999; // 렌더링 순서 조정
    this.scene.add(this.trailLines.right);

    // 초기에는 숨김
    this.trailLines.left.visible = false;
    this.trailLines.right.visible = false;
    
    console.log('궤적 라인 생성 완료');
  }

  // 궤적 업데이트
  update() {
    if (!this.isEnabled) return;

    // 최소 한 손은 있어야 함
    if (!this.handBones.left && !this.handBones.right) return;

    this.frameCount++;

    // 왼손 궤적 업데이트 (독립적으로 처리)
    if (this.handBones.left) {
      try {
        const leftHandPosition = new THREE.Vector3();
        this.handBones.left.getWorldPosition(leftHandPosition);
        
        // 이전 위치와 비교하여 움직임 감지
        const lastLeftPos = this.leftHandTrail[this.leftHandTrail.length - 1];
        const hasMovement = !this.lastLeftPosition || leftHandPosition.distanceTo(this.lastLeftPosition) > this.minDistance;
        
        if (hasMovement) {
          // 움직임이 있으면 비활성 카운터 리셋
          this.leftInactiveFrames = 0;
          
          // 궤적 라인 즉시 표시
          if (this.trailLines.left && !this.trailLines.left.visible) {
            this.trailLines.left.visible = true;
            console.log('왼손 궤적 라인 활성화');
          }
          
          // 궤적 업데이트 (기존 로직)
          if (this.frameCount % this.updateInterval === 0) {
            if (!lastLeftPos || leftHandPosition.distanceTo(lastLeftPos) > this.minDistance) {
              
              // 부드러운 연결을 위한 보간 포인트 추가
              if (lastLeftPos && leftHandPosition.distanceTo(lastLeftPos) > 0.05) {
                const interpolatedPoint = lastLeftPos.clone().lerp(leftHandPosition, 0.5);
                this.leftHandTrail.push(interpolatedPoint);
              }
              
              this.leftHandTrail.push(leftHandPosition.clone());
              
              // 궤적 길이 제한 (부드럽게)
              while (this.leftHandTrail.length > this.maxTrailLength) {
                this.leftHandTrail.shift();
              }
              
              // 왼손 궤적 라인 업데이트
              this.updateTrailLine('left', this.leftHandTrail);
            }
          }
        } else {
          // 움직임이 없으면 비활성 카운터 증가
          this.leftInactiveFrames++;
        }
        
        // 마지막 위치 저장
        this.lastLeftPosition = leftHandPosition.clone();
        
      } catch (error) {
        console.warn('왼손 궤적 업데이트 오류:', error);
      }
    }

    // 오른손 궤적 업데이트 (독립적으로 처리)
    if (this.handBones.right) {
      try {
        const rightHandPosition = new THREE.Vector3();
        this.handBones.right.getWorldPosition(rightHandPosition);
        
        // 이전 위치와 비교하여 움직임 감지
        const lastRightPos = this.rightHandTrail[this.rightHandTrail.length - 1];
        const hasMovement = !this.lastRightPosition || rightHandPosition.distanceTo(this.lastRightPosition) > this.minDistance;
        
        if (hasMovement) {
          // 움직임이 있으면 비활성 카운터 리셋
          this.rightInactiveFrames = 0;
          
          // 궤적 라인 즉시 표시
          if (this.trailLines.right && !this.trailLines.right.visible) {
            this.trailLines.right.visible = true;
            console.log('오른손 궤적 라인 활성화');
          }
          
          // 궤적 업데이트 (기존 로직)
          if (this.frameCount % this.updateInterval === 0) {
            if (!lastRightPos || rightHandPosition.distanceTo(lastRightPos) > this.minDistance) {
              
              // 부드러운 연결을 위한 보간 포인트 추가
              if (lastRightPos && rightHandPosition.distanceTo(lastRightPos) > 0.05) {
                const interpolatedPoint = lastRightPos.clone().lerp(rightHandPosition, 0.5);
                this.rightHandTrail.push(interpolatedPoint);
              }
              
              this.rightHandTrail.push(rightHandPosition.clone());
              
              // 궤적 길이 제한 (부드럽게)
              while (this.rightHandTrail.length > this.maxTrailLength) {
                this.rightHandTrail.shift();
              }
              
              // 오른손 궤적 라인 업데이트
              this.updateTrailLine('right', this.rightHandTrail);
            }
          }
        } else {
          // 움직임이 없으면 비활성 카운터 증가
          this.rightInactiveFrames++;
        }
        
        // 마지막 위치 저장
        this.lastRightPosition = rightHandPosition.clone();
        
      } catch (error) {
        console.warn('오른손 궤적 업데이트 오류:', error);
      }
    }

    // 비활성 상태에서 자동 페이드 아웃
    this.handleInactivityFade();

    // 기존 자동 페이드 아웃 (궤적이 너무 길어지지 않도록)
    if (this.frameCount % 60 === 0) { // 1초마다
      this.autoFadeOldTrails();
    }
  }

  // 궤적 라인 업데이트
  updateTrailLine(hand, trail) {
    if (!this.trailLines[hand] || trail.length < 2) return;

    const positions = [];
    const colors = [];
    
    // 손별로 다른 색상 설정 (더 명확한 구분)
    const baseColor = hand === 'left' 
      ? new THREE.Color(0x0066ff)  // 진한 파란색 (왼손)
      : new THREE.Color(0xff3333); // 진한 빨간색 (오른손)

    for (let i = 0; i < trail.length; i++) {
      const point = trail[i];
      positions.push(point.x, point.y, point.z);

      // 부드러운 투명도 그라데이션 (오래된 것일수록 투명)
      const normalizedIndex = i / (trail.length - 1); // 0 ~ 1
      
      // 지수 함수를 사용한 부드러운 페이드 (오래된 것이 더 빠르게 페이드)
      const fadeAlpha = Math.pow(normalizedIndex, 0.5); // 제곱근으로 부드러운 곡선
      const intensity = fadeAlpha * 0.9 + 0.1; // 0.1 ~ 1.0 범위
      
      // 색상과 투명도 적용
      const color = baseColor.clone();
      color.multiplyScalar(intensity);
      
      // 알파 값을 색상에 반영 (더 투명한 효과)
      const alpha = fadeAlpha * 0.8 + 0.2; // 0.2 ~ 1.0 범위
      colors.push(color.r * alpha, color.g * alpha, color.b * alpha);
    }

    const geometry = this.trailLines[hand].geometry;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    // 부드러운 업데이트를 위한 설정
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.setDrawRange(0, trail.length);

    // 바운딩 박스 업데이트
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    // 디버깅 정보 (가끔씩만 출력)
    if (this.frameCount % 300 === 0) { // 5초마다
      const lastPos = trail[trail.length - 1];
      console.log(`${hand} 손 궤적:`, {
        본이름: hand === 'left' ? this.handBones.left?.name : this.handBones.right?.name,
        포인트수: trail.length,
        표시상태: this.trailLines[hand].visible,
        마지막위치: `(${lastPos.x.toFixed(2)}, ${lastPos.y.toFixed(2)}, ${lastPos.z.toFixed(2)})`,
        색상: hand === 'left' ? '파란색' : '빨간색',
        투명도범위: '0.2 ~ 1.0'
      });
    }
  }

  // 궤적 표시 토글
  toggle() {
    this.isEnabled = !this.isEnabled;
    
    console.log('손 궤적 표시:', this.isEnabled ? '활성화' : '비활성화');
    console.log('왼손 본 상태:', this.handBones.left ? '있음' : '없음');
    console.log('오른손 본 상태:', this.handBones.right ? '있음' : '없음');
    
    if (this.isEnabled) {
      // 활성화 시 즉시 표시 및 카운터 초기화
      this.leftInactiveFrames = 0;
      this.rightInactiveFrames = 0;
      this.lastLeftPosition = null;
      this.lastRightPosition = null;
      
      // 본이 있으면 라인을 표시 준비 상태로 설정 (실제 표시는 움직임 감지 시)
      if (this.trailLines.left && this.handBones.left) {
        // 기존 궤적이 있으면 즉시 표시, 없으면 대기
        this.trailLines.left.visible = this.leftHandTrail.length > 0;
        console.log('왼손 궤적 라인 준비:', this.trailLines.left.visible ? '즉시 표시' : '움직임 대기');
      }
      
      if (this.trailLines.right && this.handBones.right) {
        // 기존 궤적이 있으면 즉시 표시, 없으면 대기
        this.trailLines.right.visible = this.rightHandTrail.length > 0;
        console.log('오른손 궤적 라인 준비:', this.trailLines.right.visible ? '즉시 표시' : '움직임 대기');
      }
    } else {
      // 비활성화 시 부드러운 페이드 아웃
      console.log('부드러운 페이드 아웃 시작...');
      this.clearTrailsGradually();
      
      // 라인 숨김은 페이드 완료 후
      setTimeout(() => {
        if (this.trailLines.left) {
          this.trailLines.left.visible = false;
        }
        if (this.trailLines.right) {
          this.trailLines.right.visible = false;
        }
      }, 1000); // 1초 후 완전히 숨김
    }

    return this.isEnabled;
  }

  // 궤적 초기화
  clearTrails() {
    this.leftHandTrail = [];
    this.rightHandTrail = [];
    
    // 비활성 카운터 초기화
    this.leftInactiveFrames = 0;
    this.rightInactiveFrames = 0;
    this.lastLeftPosition = null;
    this.lastRightPosition = null;
    
    if (this.trailLines.left) {
      this.trailLines.left.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
      this.trailLines.left.geometry.attributes.position.needsUpdate = true;
    }
    
    if (this.trailLines.right) {
      this.trailLines.right.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
      this.trailLines.right.geometry.attributes.position.needsUpdate = true;
    }
  }

  // 궤적 점진적 페이드 아웃
  fadeOutTrails() {
    // 왼손 궤적 페이드
    if (this.leftHandTrail.length > 0) {
      // 오래된 포인트들을 점진적으로 제거
      const fadeCount = Math.ceil(this.leftHandTrail.length * 0.02); // 2%씩 제거
      for (let i = 0; i < fadeCount && this.leftHandTrail.length > 0; i++) {
        this.leftHandTrail.shift();
      }
      
      if (this.leftHandTrail.length > 0) {
        this.updateTrailLine('left', this.leftHandTrail);
      }
    }

    // 오른손 궤적 페이드
    if (this.rightHandTrail.length > 0) {
      // 오래된 포인트들을 점진적으로 제거
      const fadeCount = Math.ceil(this.rightHandTrail.length * 0.02); // 2%씩 제거
      for (let i = 0; i < fadeCount && this.rightHandTrail.length > 0; i++) {
        this.rightHandTrail.shift();
      }
      
      if (this.rightHandTrail.length > 0) {
        this.updateTrailLine('right', this.rightHandTrail);
      }
    }
  }

  // 부드러운 궤적 초기화
  clearTrailsGradually() {
    const fadeInterval = setInterval(() => {
      this.fadeOutTrails();
      
      // 모든 궤적이 사라지면 정리
      if (this.leftHandTrail.length === 0 && this.rightHandTrail.length === 0) {
        clearInterval(fadeInterval);
        this.clearTrails(); // 완전 초기화
      }
    }, 50); // 50ms마다 페이드
  }

  // 정리
  dispose() {
    if (this.scene && this.trailLines.left) {
      this.scene.remove(this.trailLines.left);
      this.trailLines.left.geometry.dispose();
      this.trailLines.left.material.dispose();
    }
    
    if (this.scene && this.trailLines.right) {
      this.scene.remove(this.trailLines.right);
      this.trailLines.right.geometry.dispose();
      this.trailLines.right.material.dispose();
    }
    
    this.leftHandTrail = [];
    this.rightHandTrail = [];
    this.handBones = { left: null, right: null };
    this.trailLines = { left: null, right: null };
    this.scene = null;
  }

  // 상태 확인
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      hasLeftHand: !!this.handBones.left,
      hasRightHand: !!this.handBones.right,
      leftTrailLength: this.leftHandTrail.length,
      rightTrailLength: this.rightHandTrail.length
    };
  }

  
  // 자동으로 오래된 궤적 페이드
  autoFadeOldTrails() {
    // 왼손 궤적이 최대 길이의 90%를 넘으면 점진적 제거
    if (this.leftHandTrail.length > this.maxTrailLength * 0.9) {
      const removeCount = Math.ceil(this.leftHandTrail.length * 0.05); // 5%씩 제거
      for (let i = 0; i < removeCount; i++) {
        this.leftHandTrail.shift();
      }
      if (this.leftHandTrail.length > 0) {
        this.updateTrailLine('left', this.leftHandTrail);
      }
    }

    // 오른손 궤적이 최대 길이의 90%를 넘으면 점진적 제거
    if (this.rightHandTrail.length > this.maxTrailLength * 0.9) {
      const removeCount = Math.ceil(this.rightHandTrail.length * 0.05); // 5%씩 제거
      for (let i = 0; i < removeCount; i++) {
        this.rightHandTrail.shift();
      }
      if (this.rightHandTrail.length > 0) {
        this.updateTrailLine('right', this.rightHandTrail);
      }
    }
  }

  // 비활성 상태에서 자동 페이드 아웃
  handleInactivityFade() {
    // 왼손 비활성 처리
    if (this.leftInactiveFrames > this.autoFadeThreshold && this.leftHandTrail.length > 0) {
      // 점진적으로 궤적 제거 (2초 후부터 시작)
      const fadeRate = Math.min((this.leftInactiveFrames - this.autoFadeThreshold) / 60, 1); // 1초에 걸쳐 점진적
      const removeCount = Math.ceil(this.leftHandTrail.length * 0.03 * fadeRate); // 3%씩 제거
      
      for (let i = 0; i < removeCount && this.leftHandTrail.length > 0; i++) {
        this.leftHandTrail.shift();
      }
      
      if (this.leftHandTrail.length > 0) {
        this.updateTrailLine('left', this.leftHandTrail);
      } else {
        // 궤적이 완전히 사라진 경우에만 라인 숨김
        if (this.trailLines.left && this.trailLines.left.visible) {
          this.trailLines.left.visible = false;
          console.log('왼손 궤적 라인 비활성화 (궤적 완전 소거)');
        }
      }
    }

    // 오른손 비활성 처리
    if (this.rightInactiveFrames > this.autoFadeThreshold && this.rightHandTrail.length > 0) {
      // 점진적으로 궤적 제거 (2초 후부터 시작)
      const fadeRate = Math.min((this.rightInactiveFrames - this.autoFadeThreshold) / 60, 1); // 1초에 걸쳐 점진적
      const removeCount = Math.ceil(this.rightHandTrail.length * 0.03 * fadeRate); // 3%씩 제거
      
      for (let i = 0; i < removeCount && this.rightHandTrail.length > 0; i++) {
        this.rightHandTrail.shift();
      }
      
      if (this.rightHandTrail.length > 0) {
        this.updateTrailLine('right', this.rightHandTrail);
      } else {
        // 궤적이 완전히 사라진 경우에만 라인 숨김
        if (this.trailLines.right && this.trailLines.right.visible) {
          this.trailLines.right.visible = false;
          console.log('오른손 궤적 라인 비활성화 (궤적 완전 소거)');
        }
      }
    }

    // 디버깅 정보 (가끔씩만 출력)
    if (this.frameCount % 300 === 0) {
      console.log('비활성 상태:', {
        왼손비활성프레임: this.leftInactiveFrames,
        오른손비활성프레임: this.rightInactiveFrames,
        왼손궤적길이: this.leftHandTrail.length,
        오른손궤적길이: this.rightHandTrail.length,
        자동페이드임계값: this.autoFadeThreshold,
        왼손라인표시: this.trailLines.left?.visible,
        오른손라인표시: this.trailLines.right?.visible
      });
    }
  }
} 
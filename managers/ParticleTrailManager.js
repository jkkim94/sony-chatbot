import * as THREE from 'three';

export class ParticleTrailManager {
  constructor() {
    this.isEnabled = false;
    this.scene = null;
    this.particleSystems = {
      left: null,
      right: null
    };
    this.particleGeometries = {
      left: null,
      right: null
    };
    this.particleMaterials = {
      left: null,
      right: null
    };
    
    // 파티클 설정 (궤적 따라 움직이는 스타일)
    this.maxParticles = 150; // 파티클 수 감소 (더 깔끔한 효과)
    this.particleLifetime = 1.5; // 생명주기 단축
    this.emissionRate = 25; // 방출 속도 감소
    this.particleSpeed = 0.3; // 속도 감소
    this.particleSize = 0.8; // 크기 대폭 감소
    
    // 궤적 따라 움직이는 파티클 데이터
    this.leftParticles = {
      positions: new Float32Array(this.maxParticles * 3),
      velocities: new Float32Array(this.maxParticles * 3),
      lifetimes: new Float32Array(this.maxParticles),
      sizes: new Float32Array(this.maxParticles),
      alphas: new Float32Array(this.maxParticles),
      rotations: new Float32Array(this.maxParticles),
      trailProgress: new Float32Array(this.maxParticles), // 궤적 진행도 (0~1)
      trailSpeed: new Float32Array(this.maxParticles), // 궤적 따라 움직이는 속도
      count: 0
    };
    
    this.rightParticles = {
      positions: new Float32Array(this.maxParticles * 3),
      velocities: new Float32Array(this.maxParticles * 3),
      lifetimes: new Float32Array(this.maxParticles),
      sizes: new Float32Array(this.maxParticles),
      alphas: new Float32Array(this.maxParticles),
      rotations: new Float32Array(this.maxParticles),
      trailProgress: new Float32Array(this.maxParticles), // 궤적 진행도 (0~1)
      trailSpeed: new Float32Array(this.maxParticles), // 궤적 따라 움직이는 속도
      count: 0
    };
    
    // 시간 관련
    this.clock = new THREE.Clock();
    this.lastEmissionTime = 0;
    
    // 궤적 경로 저장 (HandTrailManager에서 가져옴)
    this.leftTrailPath = [];
    this.rightTrailPath = [];
    this.maxTrailPathLength = 60; // 궤적 경로 최대 길이
    
    // 움직임 감지를 위한 변수들
    this.lastLeftPosition = null;
    this.lastRightPosition = null;
    this.minMovementDistance = 0.01;
    this.inactiveFrames = 0;
    this.maxInactiveFrames = 60;
  }

  // 초기화
  init(scene) {
    //console.log('=== 파티클 시스템 초기화 시작 ===');
    //console.log('현재 활성화 상태:', this.isEnabled);
    
    // 기존 상태 보존
    const wasEnabled = this.isEnabled;
    const previousLeftParticleCount = this.leftParticles.count;
    const previousRightParticleCount = this.rightParticles.count;
    
    this.scene = scene;
    console.log('Scene:', scene);
    
    // 기존 파티클 시스템 정리 (새 씬용으로 재생성)
    this.disposeParticleSystems();
    
    // 새 파티클 시스템 생성
    this.createParticleSystems();
    
    // 상태 복원
    this.isEnabled = wasEnabled;
    
    // 파티클 시스템 표시 상태 복원
    if (this.particleSystems.left) {
      this.particleSystems.left.visible = this.isEnabled;
    }
    if (this.particleSystems.right) {
      this.particleSystems.right.visible = this.isEnabled;
    }
    
    console.log('=== 파티클 시스템 초기화 완료 ===');
    console.log('복원된 상태:', {
      isEnabled: this.isEnabled,
      previousLeftCount: previousLeftParticleCount,
      previousRightCount: previousRightParticleCount
    });
  }

  // 파티클 시스템 생성
  createParticleSystems() {
    if (!this.scene) return;

    console.log('궤적 파티클 시스템 생성 시작...');

    // 왼손 파티클 시스템 (세련된 청록색)
    this.createParticleSystem('left', 0x00d4ff);
    
    // 오른손 파티클 시스템 (세련된 핑크색)
    this.createParticleSystem('right', 0xff6b9d);

    console.log('궤적 파티클 시스템 생성 완료');
  }

  // 🚀 성능 최적화된 파티클 시스템 생성
  createParticleSystem(hand, color) {
    console.log(`🚀 [ParticleTrailManager] ${hand} 파티클 시스템 생성 (성능 최적화 적용)`);
    const geometry = new THREE.BufferGeometry();
    const particleData = hand === 'left' ? this.leftParticles : this.rightParticles;
    
    // 초기 속성 설정
    geometry.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(particleData.velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(particleData.lifetimes, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(particleData.sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(particleData.alphas, 1));
    geometry.setAttribute('rotation', new THREE.BufferAttribute(particleData.rotations, 1));
    
    // 궤적 따라 움직이는 셰이더 머티리얼
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uPixelRatio: { value: window.devicePixelRatio },
        uBaseSize: { value: 120.0 } // 파팈클 크기 
      },
      vertexShader: `
        attribute float lifetime;
        attribute float size;
        attribute float alpha;
        attribute vec3 velocity;
        attribute float rotation;
        
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uBaseSize;
        
        varying float vAlpha;
        varying float vLifetime;
        varying float vRotation;
        varying vec3 vWorldPosition;
        
        void main() {
          vAlpha = alpha;
          vLifetime = lifetime;
          vRotation = rotation + uTime * 1.0;
          
          // 파티클 위치 (궤적을 따라 움직임)
          vec3 pos = position;
          vWorldPosition = pos;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // 크기 계산 (생명주기 기반)
          float lifetimeScale = smoothstep(0.0, 0.1, lifetime) * smoothstep(2.0, 0.5, lifetime);
          float finalSize = max(uBaseSize * size * lifetimeScale, uBaseSize * 0.15);
          
          gl_PointSize = max(finalSize / -mvPosition.z, 8.0); // 최소 크기 감소 (15px → 8px)
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        
        varying float vAlpha;
        varying float vLifetime;
        varying float vRotation;
        varying vec3 vWorldPosition;
        
        void main() {
          if (vLifetime <= 0.0) discard;
          
          // 회전 변환
          vec2 coord = gl_PointCoord - 0.5;
          float cosR = cos(vRotation);
          float sinR = sin(vRotation);
          coord = mat2(cosR, sinR, -sinR, cosR) * coord;
          coord += 0.5;
          
          // 원형 파티클 생성
          float dist = length(coord - 0.5);
          if (dist > 0.5) discard;
          
          // 중심부 글로우 효과 (더 부드럽게)
          float glow = 1.0 - dist * 2.0;
          glow = pow(glow, 2.0);
          
          // 홀로그램 같은 색상 효과
          vec3 baseColor = uColor;
          
          // 시간에 따른 색상 변화 (무지개 효과)
          float colorShift = sin(uTime * 2.0 + vWorldPosition.x * 10.0 + vWorldPosition.z * 10.0) * 0.2;
          baseColor.r += colorShift;
          baseColor.g += sin(colorShift + 2.094) * 0.2; // 120도 위상차
          baseColor.b += sin(colorShift + 4.188) * 0.2; // 240도 위상차
          
          // 중심부 밝은 화이트 글로우
          vec3 finalColor = mix(baseColor, vec3(1.0, 1.0, 1.0), glow * 0.3);
          
          // 외곽부 색상 강화
          finalColor = mix(finalColor, baseColor * 1.3, 1.0 - glow);
          
          // 반짝임 효과 (더 부드럽게)
          float sparkle = sin(uTime * 3.0 + vWorldPosition.x * 30.0) * 0.1 + 0.9;
          finalColor *= sparkle;
          
          // 최종 알파 계산 (더 부드러운 페이드)
          float finalAlpha = glow * vAlpha * 0.7;
          
          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      // 🚀 성능 최적화: AdditiveBlending → NormalBlending 변경
      blending: THREE.NormalBlending, // AdditiveBlending에서 변경 (성능 향상)
      depthWrite: false,
      vertexColors: false,
      // 🚀 추가 최적화 설정
      alphaTest: 0.01, // 알파테스트로 성능 향상
      side: THREE.DoubleSide // 양면 렌더링으로 깊이 문제 해결
    });
    
    // 파티클 시스템 생성
    const particleSystem = new THREE.Points(geometry, material);
    particleSystem.frustumCulled = false;
    
    // 🚀 렌더링 순서 최적화 (투명도 객체는 나중에 렌더링)
    particleSystem.renderOrder = 1000; // 높은 값으로 설정하여 나중에 렌더링
    particleSystem.sortParticles = true; // 파티클 정렬 활성화
    
    // 씬에 추가
    this.scene.add(particleSystem);
    
    // 저장
    this.particleSystems[hand] = particleSystem;
    this.particleGeometries[hand] = geometry;
    this.particleMaterials[hand] = material;
    
    console.log(`${hand} 궤적 파티클 시스템 생성됨`);
  }

  // 파티클 업데이트 (궤적 따라 움직이는 스타일)
  update(leftHandPosition, rightHandPosition) {
    if (!this.isEnabled) {
      if (Date.now() % 5000 < 16) {
        //console.log('파티클 시스템 비활성화됨');
      }
      return;
    }
    
    const deltaTime = this.clock.getDelta();
    const currentTime = this.clock.getElapsedTime();
    
    // 움직임 감지
    let hasMovement = false;
    
    if (leftHandPosition && this.lastLeftPosition) {
      const leftMovement = leftHandPosition.distanceTo(this.lastLeftPosition);
      if (leftMovement > this.minMovementDistance) {
        hasMovement = true;
        // 왼손 궤적 경로 업데이트
        this.leftTrailPath.push(leftHandPosition.clone());
        if (this.leftTrailPath.length > this.maxTrailPathLength) {
          this.leftTrailPath.shift();
        }
      }
    }
    
    if (rightHandPosition && this.lastRightPosition) {
      const rightMovement = rightHandPosition.distanceTo(this.lastRightPosition);
      if (rightMovement > this.minMovementDistance) {
        hasMovement = true;
        // 오른손 궤적 경로 업데이트
        this.rightTrailPath.push(rightHandPosition.clone());
        if (this.rightTrailPath.length > this.maxTrailPathLength) {
          this.rightTrailPath.shift();
        }
      }
    }
    
    // 움직임 상태 업데이트
    if (hasMovement) {
      if (this.inactiveFrames > this.maxInactiveFrames) {
        console.log('움직임 재개 - 파티클 시스템 리셋');
        this.resetParticleVisibility();
      }
      this.inactiveFrames = 0;
    } else {
      this.inactiveFrames++;
    }
    
    // 위치 저장
    this.lastLeftPosition = leftHandPosition ? leftHandPosition.clone() : null;
    this.lastRightPosition = rightHandPosition ? rightHandPosition.clone() : null;
    
    // 디버깅: 5초마다 상태 출력
    if (Date.now() % 5000 < 16) {
      console.log('=== 궤적 파티클 상태 ===');
      console.log('hasMovement:', hasMovement);
      console.log('leftTrailPath length:', this.leftTrailPath.length);
      console.log('rightTrailPath length:', this.rightTrailPath.length);
      console.log('leftParticleCount:', this.leftParticles.count);
      console.log('rightParticleCount:', this.rightParticles.count);
    }
    
    // 파티클 방출 (움직임이 있고 궤적이 충분할 때만)
    const shouldEmit = hasMovement && this.inactiveFrames < this.maxInactiveFrames;
    
    if (shouldEmit && currentTime - this.lastEmissionTime > 1.0 / this.emissionRate) {
      if (leftHandPosition && this.leftTrailPath.length >= 2) {
        this.emitTrailParticle('left', leftHandPosition);
      }
      if (rightHandPosition && this.rightTrailPath.length >= 2) {
        this.emitTrailParticle('right', rightHandPosition);
      }
      this.lastEmissionTime = currentTime;
    }
    
    // 파티클 업데이트 (궤적 따라 움직임)
    this.updateTrailParticles('left', deltaTime, currentTime, !hasMovement);
    this.updateTrailParticles('right', deltaTime, currentTime, !hasMovement);
    
    // 셰이더 유니폼 업데이트
    if (this.particleMaterials.left) {
      this.particleMaterials.left.uniforms.uTime.value = currentTime;
    }
    if (this.particleMaterials.right) {
      this.particleMaterials.right.uniforms.uTime.value = currentTime;
    }
  }

  // 궤적을 따라 움직이는 파티클 업데이트 (React Three Fiber 스타일)
  updateTrailParticles(hand, deltaTime, currentTime, isInactive) {
    const particleData = hand === 'left' ? this.leftParticles : this.rightParticles;
    const trailPath = hand === 'left' ? this.leftTrailPath : this.rightTrailPath;
    const geometry = this.particleGeometries[hand];
    
    if (!geometry) return;
    
    // 파티클 생명주기 및 궤적 따라 움직임 업데이트
    for (let i = particleData.count - 1; i >= 0; i--) {
      const i3 = i * 3;
      
      // 생명주기 감소 (움직임이 없으면 더 빠르게 감소)
      const lifetimeDecay = isInactive ? deltaTime * 2.0 : deltaTime;
      particleData.lifetimes[i] -= lifetimeDecay;
      
      if (particleData.lifetimes[i] <= 0) {
        // 죽은 파티클 제거
        this.removeTrailParticle(particleData, i);
        continue;
      }
      
      // 궤적 진행도 업데이트 (React Three Fiber 스타일)
      particleData.trailProgress[i] += particleData.trailSpeed[i] * deltaTime;
      
      // 궤적을 따라 위치 업데이트
      if (trailPath.length >= 2) {
        const targetPosition = this.getPositionOnTrail(trailPath, particleData.trailProgress[i]);
        
        if (targetPosition) {
          // 부드러운 이동 (lerp 사용)
          const currentPos = new THREE.Vector3(
            particleData.positions[i3],
            particleData.positions[i3 + 1],
            particleData.positions[i3 + 2]
          );
          
          // 궤적 위치로 부드럽게 이동
          const lerpFactor = Math.min(deltaTime * 5.0, 1.0); // 부드러운 추적
          currentPos.lerp(targetPosition, lerpFactor);
          
          // 랜덤 속도 적용 (약간의 흩날림 효과)
          currentPos.x += particleData.velocities[i3] * deltaTime;
          currentPos.y += particleData.velocities[i3 + 1] * deltaTime;
          currentPos.z += particleData.velocities[i3 + 2] * deltaTime;
          
          // 위치 업데이트
          particleData.positions[i3] = currentPos.x;
          particleData.positions[i3 + 1] = currentPos.y;
          particleData.positions[i3 + 2] = currentPos.z;
        }
      }
      
      // 궤적 끝에 도달하면 페이드 아웃 시작
      if (particleData.trailProgress[i] > 1.0) {
        particleData.trailProgress[i] = 1.0;
        // 궤적 끝에서 더 빠르게 소멸
        particleData.lifetimes[i] -= deltaTime * 2.0;
      }
      
      // 랜덤 속도 감쇠 (공기 저항)
      particleData.velocities[i3] *= 0.99;
      particleData.velocities[i3 + 1] *= 0.99;
      particleData.velocities[i3 + 2] *= 0.99;
      
      // 회전 업데이트 (React Three Fiber 스타일)
      const rotationSpeed = 1.0 + Math.sin(currentTime + i) * 0.5;
      particleData.rotations[i] += rotationSpeed * deltaTime;
      
      // 알파 업데이트 (생명주기 기반)
      const ageRatio = 1.0 - (particleData.lifetimes[i] / this.particleLifetime);
      if (ageRatio > 0.6) {
        const fadeProgress = (ageRatio - 0.6) / 0.4;
        particleData.alphas[i] = Math.max(1.0 - fadeProgress, 0.1);
      } else {
        // 궤적 진행도에 따른 알파 조절
        const trailAlpha = Math.sin(particleData.trailProgress[i] * Math.PI);
        particleData.alphas[i] = Math.max(trailAlpha, 0.3);
      }
      
      // 크기 변화 (React Three Fiber 스타일)
      const sizeVariation = 1.0 + Math.sin(currentTime * 2.0 + i) * 0.2;
      particleData.sizes[i] = this.particleSize * sizeVariation * (1.0 - ageRatio * 0.5);
    }
    
    // 지오메트리 속성 업데이트
    this.updateGeometryAttributes(hand);
  }

  // 궤적 파티클 제거
  removeTrailParticle(particleData, index) {
    const lastIndex = particleData.count - 1;
    
    if (index !== lastIndex) {
      // 마지막 파티클을 현재 위치로 이동
      const i3 = index * 3;
      const last3 = lastIndex * 3;
      
      particleData.positions[i3] = particleData.positions[last3];
      particleData.positions[i3 + 1] = particleData.positions[last3 + 1];
      particleData.positions[i3 + 2] = particleData.positions[last3 + 2];
      
      particleData.velocities[i3] = particleData.velocities[last3];
      particleData.velocities[i3 + 1] = particleData.velocities[last3 + 1];
      particleData.velocities[i3 + 2] = particleData.velocities[last3 + 2];
      
      particleData.lifetimes[index] = particleData.lifetimes[lastIndex];
      particleData.sizes[index] = particleData.sizes[lastIndex];
      particleData.alphas[index] = particleData.alphas[lastIndex];
      particleData.rotations[index] = particleData.rotations[lastIndex];
      particleData.trailProgress[index] = particleData.trailProgress[lastIndex];
      particleData.trailSpeed[index] = particleData.trailSpeed[lastIndex];
    }
    
    particleData.count--;
  }

  // 지오메트리 속성 업데이트
  updateGeometryAttributes(hand) {
    const particleData = hand === 'left' ? this.leftParticles : this.rightParticles;
    const geometry = this.particleGeometries[hand];
    
    if (!geometry) return;
    
    // 활성 파티클만 업데이트
    geometry.setDrawRange(0, particleData.count);
    
    // 속성 업데이트
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.velocity.needsUpdate = true;
    geometry.attributes.lifetime.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
    geometry.attributes.alpha.needsUpdate = true;
    geometry.attributes.rotation.needsUpdate = true;
  }

  // 파티클 시스템 토글
  toggle() {
    this.isEnabled = !this.isEnabled;
    
    console.log('=== 궤적 파티클 시스템 토글 ===');
    console.log('상태:', this.isEnabled ? '활성화' : '비활성화');
    
    // 파티클 시스템 표시/숨김
    if (this.particleSystems.left) {
      this.particleSystems.left.visible = this.isEnabled;
    }
    if (this.particleSystems.right) {
      this.particleSystems.right.visible = this.isEnabled;
    }
    
    if (!this.isEnabled) {
      this.clearParticles();
    }
    
    return this.isEnabled;
  }

  // 모든 파티클 제거
  clearParticles() {
    this.leftParticles.count = 0;
    this.rightParticles.count = 0;
    
    this.updateGeometryAttributes('left');
    this.updateGeometryAttributes('right');
  }

  // 정리
  dispose() {
    if (this.scene) {
      if (this.particleSystems.left) {
        this.scene.remove(this.particleSystems.left);
        this.particleGeometries.left.dispose();
        this.particleMaterials.left.dispose();
      }
      if (this.particleSystems.right) {
        this.scene.remove(this.particleSystems.right);
        this.particleGeometries.right.dispose();
        this.particleMaterials.right.dispose();
      }
    }
    
    this.clearParticles();
    this.scene = null;
  }

  // 상태 확인
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      leftParticleCount: this.leftParticles.count,
      rightParticleCount: this.rightParticles.count,
      maxParticles: this.maxParticles
    };
  }

  // 파티클 시스템 리셋 (움직임 재개 시)
  resetParticleVisibility() {
    const leftParticleData = this.leftParticles;
    const rightParticleData = this.rightParticles;
    
    for (let i = 0; i < leftParticleData.count; i++) {
      leftParticleData.alphas[i] = 1.0;
    }
    
    for (let i = 0; i < rightParticleData.count; i++) {
      rightParticleData.alphas[i] = 1.0;
    }
    
    this.updateGeometryAttributes('left');
    this.updateGeometryAttributes('right');
  }

  // 궤적 경로 업데이트 (HandTrailManager에서 호출)
  updateTrailPath(hand, trailPoints) {
    if (hand === 'left') {
      this.leftTrailPath = [...trailPoints];
    } else {
      this.rightTrailPath = [...trailPoints];
    }
    
    // 경로 길이 제한
    if (this.leftTrailPath.length > this.maxTrailPathLength) {
      this.leftTrailPath = this.leftTrailPath.slice(-this.maxTrailPathLength);
    }
    if (this.rightTrailPath.length > this.maxTrailPathLength) {
      this.rightTrailPath = this.rightTrailPath.slice(-this.maxTrailPathLength);
    }
    
    // 디버깅: 궤적 경로 업데이트 로그
    if (Date.now() % 2000 < 16) { // 2초마다
      console.log(`${hand} 궤적 경로 업데이트:`, trailPoints.length, '포인트');
    }
  }

  // HandTrailManager와 동기화 (모델 전환 시 호출)
  syncWithHandTrailManager(handTrailManager) {
    if (!handTrailManager) return;
    
    console.log('=== HandTrailManager와 파티클 시스템 동기화 ===');
    
    // 손 궤적 데이터 가져오기
    const leftTrail = handTrailManager.leftHandTrail || [];
    const rightTrail = handTrailManager.rightHandTrail || [];
    
    // 궤적 경로 동기화
    this.leftTrailPath = [...leftTrail];
    this.rightTrailPath = [...rightTrail];
    
    // 경로 길이 제한
    if (this.leftTrailPath.length > this.maxTrailPathLength) {
      this.leftTrailPath = this.leftTrailPath.slice(-this.maxTrailPathLength);
    }
    if (this.rightTrailPath.length > this.maxTrailPathLength) {
      this.rightTrailPath = this.rightTrailPath.slice(-this.maxTrailPathLength);
    }
    
    console.log('동기화 완료:', {
      leftTrailLength: this.leftTrailPath.length,
      rightTrailLength: this.rightTrailPath.length,
      handTrailEnabled: handTrailManager.isEnabled
    });
  }

  // 궤적 경로에서 위치 보간 (React Three Fiber 스타일)
  getPositionOnTrail(trailPath, progress) {
    if (trailPath.length < 2) return null;
    
    const totalLength = trailPath.length - 1;
    const scaledProgress = progress * totalLength;
    const index = Math.floor(scaledProgress);
    const t = scaledProgress - index;
    
    if (index >= totalLength) {
      return trailPath[totalLength].clone();
    }
    
    const p1 = trailPath[index];
    const p2 = trailPath[index + 1];
    
    // 부드러운 보간
    return p1.clone().lerp(p2, t);
  }

  // 궤적을 따라 움직이는 파티클 생성
  emitTrailParticle(hand, startPosition) {
    if (!this.isEnabled || !startPosition) {
      return;
    }
    
    const particleData = hand === 'left' ? this.leftParticles : this.rightParticles;
    const trailPath = hand === 'left' ? this.leftTrailPath : this.rightTrailPath;
    
    if (particleData.count >= this.maxParticles || trailPath.length < 2) {
      return;
    }
    
    const index = particleData.count;
    const i3 = index * 3;
    
    // 궤적 시작점에서 파티클 생성
    particleData.positions[i3] = startPosition.x;
    particleData.positions[i3 + 1] = startPosition.y;
    particleData.positions[i3 + 2] = startPosition.z;
    
    // 궤적 따라 움직이는 속성 설정
    particleData.trailProgress[index] = 0.0; // 궤적 시작점
    particleData.trailSpeed[index] = 0.3 + Math.random() * 0.4; // 0.3~0.7 속도
    
    // 기본 속성
    particleData.lifetimes[index] = this.particleLifetime;
    particleData.sizes[index] = this.particleSize * (0.6 + Math.random() * 0.8); // 크기 다양성 증가 (0.8~1.2 → 0.6~1.4)
    particleData.alphas[index] = 1.0;
    particleData.rotations[index] = Math.random() * Math.PI * 2;
    
    // 약간의 랜덤 속도 (궤적에서 벗어나는 효과) - 분산 증가
    const randomFactor = 0.15; // 분산 증가 (0.1 → 0.15)
    particleData.velocities[i3] = (Math.random() - 0.5) * randomFactor;
    particleData.velocities[i3 + 1] = (Math.random() - 0.5) * randomFactor;
    particleData.velocities[i3 + 2] = (Math.random() - 0.5) * randomFactor;
    
    particleData.count++;
    
    // 10개마다만 로그 출력
    if (particleData.count % 10 === 0) {
      console.log(`${hand} 궤적 파티클 생성! 총 개수:`, particleData.count);
    }
  }

  // 파티클 시스템만 정리 (상태는 보존)
  disposeParticleSystems() {
    if (this.scene) {
      if (this.particleSystems.left) {
        this.scene.remove(this.particleSystems.left);
        if (this.particleGeometries.left) this.particleGeometries.left.dispose();
        if (this.particleMaterials.left) this.particleMaterials.left.dispose();
      }
      if (this.particleSystems.right) {
        this.scene.remove(this.particleSystems.right);
        if (this.particleGeometries.right) this.particleGeometries.right.dispose();
        if (this.particleMaterials.right) this.particleMaterials.right.dispose();
      }
    }
    
    // 참조 초기화
    this.particleSystems.left = null;
    this.particleSystems.right = null;
    this.particleGeometries.left = null;
    this.particleGeometries.right = null;
    this.particleMaterials.left = null;
    this.particleMaterials.right = null;
  }
} 
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SkeletonHelper } from 'three';

const FBXViewer = ({ 
  currentAnimation, 
  currentModel,
  onAnimationChange, 
  onLoadingChange,
  onAnimationDataExtract
}) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const skeletonHelperRef = useRef(null);
  const animationTimeoutRef = useRef(null);
  const animationFrameRef = useRef(null);
  const floorRef = useRef(null);
  const shadowFloorRef = useRef(null);
  const firstFrameDataRef = useRef({}); // 첫 프레임 데이터 저장
  const idleShoulderPositionsRef = useRef({}); // Idle 기본 대기 어깨 위치 저장

  // 3D 씬 초기화
  const initScene = () => {
    if (!containerRef.current) return;

    // Scene 설정
    const scene = new THREE.Scene();
    sceneRef.current = scene;


    // Camera 설정
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // Renderer 설정
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x000000);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 조명 설정
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 4.0);
    scene.add(hemisphereLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 3.0);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 4.0);
    mainLight.position.set(0, 0.3, 2.5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 3.0);
    fillLight.position.set(2.5, 0.3, 0);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 2.5);
    backLight.position.set(0, 0.3, -2.5);
    scene.add(backLight);

    const diagonalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    diagonalLight.position.set(2, 0.3, 2);
    scene.add(diagonalLight);

    const diagonalLight2 = new THREE.DirectionalLight(0xffffff, 2.5);
    diagonalLight2.position.set(-2, 0.3, 2);
    scene.add(diagonalLight2);

    // Floor 평면 추가 (그리드 스타일)
    const floorGeometry = new THREE.PlaneGeometry(20, 20, 20, 20);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x444444,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      wireframe: true,
      depthTest: false, // 모델 뒤에 있어도 항상 보이도록
      depthWrite: false
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // 수평으로 회전
    floor.position.y = -0.01; // 캐릭터 발 아래에 위치
    floor.receiveShadow = true;
    floor.renderOrder = -1; // 가장 먼저 렌더링
    scene.add(floor);
    
    // 추가 바닥 평면 (그림자용)
    const shadowFloorGeometry = new THREE.PlaneGeometry(20, 20);
    const shadowFloorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x222222,
      transparent: true,
      opacity: 0.3,
      depthTest: false,
      depthWrite: false
    });
    const shadowFloor = new THREE.Mesh(shadowFloorGeometry, shadowFloorMaterial);
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = -0.005;
    shadowFloor.receiveShadow = true;
    shadowFloor.renderOrder = -1;
    scene.add(shadowFloor);
    
    // floor 참조 저장
    floorRef.current = floor;
    shadowFloorRef.current = shadowFloor;

    // OrbitControls 설정
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.target.set(0, 1.5, 0);
    controlsRef.current = controls;
  };

  // FBX 모델 로드 함수
  const loadFBXModel = (filename, modelName) => {
    if (!sceneRef.current) return;

    // 이전 타이머 정리
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    // 이전 모델과 스켈레톤 헬퍼 완전 제거
    if (skeletonHelperRef.current) {
      sceneRef.current.remove(skeletonHelperRef.current);
      skeletonHelperRef.current.dispose?.(); // 메모리 해제
      skeletonHelperRef.current = null;
    }
    
    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
      // 모델의 모든 자식 요소들도 정리
      modelRef.current.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      modelRef.current = null;
    }

    // 믹서 정리
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }

    // 로딩 시작
    console.log('🎭 FBX 모델 로딩 시작:', filename, 'modelName:', modelName);
    console.log('🎭 currentModel 확인:', modelName);
    onLoadingChange(true);

    const loader = new FBXLoader();
    
    // 파일명 매핑 (UI 이름 → 실제 파일명)
    const filenameMapping = {
      'Idle': 'Idle', // 모든 모델에서 대문자 Idle 사용 (실제 파일명과 일치)
      'Happy Idle': 'Happy Idle',
      'Sad Idle': 'Sad Idle', 
      'Breathing Idle': 'Breathing Idle',
      'Standing Arguing': 'Standing Arguing',
      'Standing Greeting': 'Standing Greeting',
      'Sitting': 'Sitting',
      'Samba Dancing': 'Samba Dancing'
    };
    
    // 디버깅: filename과 filenameMapping 상세 로그
    console.log('🔍 [FBXViewer] 디버깅 정보:', {
      filename: filename,
      filenameType: typeof filename,
      filenameLength: filename ? filename.length : 0,
      filenameMapping: filenameMapping,
      hasIdle: 'Idle' in filenameMapping,
      idleValue: filenameMapping['Idle'],
      actualFilename: filenameMapping[filename] || filename
    });
    
    // 실제 파일명 가져오기
    const actualFilename = filenameMapping[filename] || filename;
    console.log(`📂 파일명 매핑: "${filename}" → "${actualFilename}"`);
    
    // 모델별 폴더 구조 및 파일명 패턴 처리
    let filePath;
    
    if (modelName === 'man') {
      // Man 폴더의 Man_ 접두사 파일들
      filePath = `/fbx/Man/Man_${actualFilename}.fbx`;
      console.log(`Man 모델 감지: ${filePath} 로드`);
    } else if (modelName === 'woman') {
      // Woman 폴더의 파일들 (실제 woman 모델만)
      if (filename === 'Happy Idle') {
        // Happy Idle은 공백 패턴이 주 경로
        filePath = `/fbx/Woman/Woman ${actualFilename}.fbx`;
        console.log(`Woman 모델 감지 (공백 패턴): ${filePath} 로드`);
      } else {
        // 나머지는 언더스코어 패턴이 주 경로
        filePath = `/fbx/Woman/Woman_${actualFilename}.fbx`;
        console.log(`Woman 모델 감지 (언더스코어 패턴): ${filePath} 로드`);
      }
    } else {
      // 기본 폴더의 파일들 (brunette, brunette1, brunette2, yuha, turtle 등)
      filePath = `/fbx/${actualFilename}.fbx`;
      console.log(`기본 모델 (${modelName}): ${filePath} 로드`);
    }
    
    console.log('🎯 최종 파일 경로:', filePath, 'modelName:', modelName);
    console.log('🎯 브라우저에서 파일 접근 테스트:', `window.location.origin${filePath}`);
    
    // 파일 로딩 함수 (실패 시 대체 패턴 시도)
    const tryLoadFBX = (primaryPath, fallbackPath = null) => {
      loader.load(
        primaryPath,
        (fbx) => {
          console.log('FBX 모델 로드 성공:', primaryPath);
          loadFBXModelSuccess(fbx, filename, modelName);
        },
        (xhr) => {
          const progress = (xhr.loaded / xhr.total) * 100;
          console.log(`FBX 로딩 진행률: ${progress.toFixed(2)}%`);
        },
        (error) => {
          console.error('FBX 로드 에러 (1차 시도):', error, '경로:', primaryPath);
          
          // 대체 경로가 있다면 시도
          if (fallbackPath) {
            console.log('대체 경로로 재시도:', fallbackPath);
            loader.load(
              fallbackPath,
              (fbx) => {
                console.log('FBX 모델 로드 성공 (2차 시도):', fallbackPath);
                loadFBXModelSuccess(fbx, filename, modelName);
              },
              (xhr) => {
                const progress = (xhr.loaded / xhr.total) * 100;
                console.log(`FBX 로딩 진행률 (2차): ${progress.toFixed(2)}%`);
              },
              (error) => {
                console.error('FBX 로드 에러 (2차 시도도 실패):', error, '경로:', fallbackPath);
                onLoadingChange(false);
              }
            );
          } else {
            onLoadingChange(false);
          }
        }
      );
    };

    // FBX 모델 로드 성공 시 처리 함수
    const loadFBXModelSuccess = (fbx, filename, modelName) => {
        console.log('✅ FBX 모델 로드 성공 처리 시작:', filename, modelName);
        console.log('✅ FBX 객체:', fbx);
        console.log('✅ FBX 애니메이션 수:', fbx.animations ? fbx.animations.length : 0);
        
        // 씬이 여전히 유효한지 확인
        if (!sceneRef.current) {
          console.warn('⚠️ 씬이 제거되어 모델 로드를 중단합니다');
          onLoadingChange(false);
          return;
        }
        
        // 모델 설정
        console.log('🎯 모델 이름 확인:', modelName, '타입:', typeof modelName);
        if (modelName === 'man') {
          fbx.scale.set(0.02, 0.02, 0.02); // Man 모델 스케일
          console.log('👨 Man 모델 크기 설정 완료 - 스케일: 0.02');
          console.log('👨 Man 모델 실제 스케일:', fbx.scale);
        } else if (modelName === 'woman') {
          fbx.scale.set(2, 2, 2); // Woman 모델 스케일 (일관성을 위해 동일하게)
          console.log('👩 Woman 모델 크기 설정 완료 - 스케일: 0.02');
          console.log('👩 Woman 모델 실제 스케일:', fbx.scale);
        } else {
          fbx.scale.set(0.01, 0.01, 0.01); // 다른 모델들은 기본 크기
          console.log('🎭 기본 모델 크기 설정 완료 - 스케일: 0.01');
          console.log('🎭 기본 모델 실제 스케일:', fbx.scale);
        }
        fbx.position.set(0, 0, 0);
        
        // 애니메이션별 어깨 위치 조정
        if (fbx.animations && fbx.animations.length > 0) {
          const animationName = fbx.animations[0].name || 'unknown';
          console.log('애니메이션 이름:', animationName);
          
          // Idle 기본 대기 애니메이션에서 어깨 위치 저장
          if (filename === 'Idle') {
            idleShoulderPositionsRef.current = {};
            fbx.traverse((child) => {
              if (child.isBone) {
                // 어깨 본 찾기
                if (child.name.includes('shoulder') || child.name.includes('Shoulder') || 
                    child.name.includes('Arm') && !child.name.includes('ForeArm') && !child.name.includes('Hand')) {
                  
                  // Idle 애니메이션의 어깨 위치 저장
                  idleShoulderPositionsRef.current[child.name] = {
                    x: child.position.x,
                    y: child.position.y,
                    z: child.position.z
                  };
                  console.log(`${child.name} Idle 어깨 위치 저장:`, idleShoulderPositionsRef.current[child.name]);
                }
              }
            });
            console.log('Idle 기본 대기 어깨 위치 저장 완료');
          }
          
          // 다른 애니메이션에서 저장된 Idle 어깨 위치 적용
          if (filename !== 'Idle' && Object.keys(idleShoulderPositionsRef.current).length > 0) {
            fbx.traverse((child) => {
              if (child.isBone && idleShoulderPositionsRef.current[child.name]) {
                // 저장된 Idle 어깨 위치로 설정
                const idlePosition = idleShoulderPositionsRef.current[child.name];
                child.position.set(idlePosition.x, idlePosition.y, idlePosition.z);
                console.log(`${child.name} Idle 어깨 위치 적용:`, idlePosition);
              }
            });
            console.log('다른 애니메이션에 Idle 어깨 위치 적용 완료');
          }
        }
        
        // FBX 모델의 본 구조 분석
        let boneCount = 0;
        let skinnedMeshCount = 0;
        fbx.traverse((child) => {
          if (child.isBone) {
            boneCount++;
            if (boneCount <= 5) { // 처음 5개 본만 로그
              console.log(`🦴 본 발견: ${child.name}`);
            }
          }
          if (child.isSkinnedMesh) {
            skinnedMeshCount++;
            console.log(`🎭 SkinnedMesh 발견: ${child.name}`);
          }
        });
        console.log(`🦴 총 본 개수: ${boneCount}, SkinnedMesh 개수: ${skinnedMeshCount}`);
        
        sceneRef.current.add(fbx);
        modelRef.current = fbx;

        // 스켈레톤 헬퍼 생성 (한 번만)
        console.log('🦴 스켈레톤 헬퍼 생성 시작');
        
        // 원본 모델로 스켈레톤 헬퍼 생성 (애니메이션 연결을 위해)
        const skeletonHelper = new SkeletonHelper(fbx);
        skeletonHelper.material.linewidth = 2;
        skeletonHelper.material.color.set(0x00ff00);
        skeletonHelper.visible = true;  // FBX 애니메이션에서는 항상 스켈레톤 표시
        
        // top, end가 포함된 본들의 라인을 숨기기 위해 커스텀 처리
        const originalUpdate = skeletonHelper.update;
        skeletonHelper.update = function() {
          originalUpdate.call(this);
          
          // 스켈레톤 헬퍼의 라인들을 순회하면서 특정 본 숨기기
          const bones = this.bones;
          const geometry = this.geometry;
          const position = geometry.attributes.position;
          
          for (let i = 0; i < bones.length; i++) {
            const bone = bones[i];
            const boneName = bone.name.toLowerCase();
            
            if (boneName.includes('top') || boneName.includes('end')) {
              // 해당 본의 라인을 투명하게 만들기
              const boneIndex = i * 2;
              if (position.array[boneIndex * 3] !== undefined) {
                // 라인의 양 끝점을 같은 위치로 설정하여 사실상 숨기기
                position.array[boneIndex * 3] = bone.position.x;
                position.array[boneIndex * 3 + 1] = bone.position.y;
                position.array[boneIndex * 3 + 2] = bone.position.z;
                position.array[(boneIndex + 1) * 3] = bone.position.x;
                position.array[(boneIndex + 1) * 3 + 1] = bone.position.y;
                position.array[(boneIndex + 1) * 3 + 2] = bone.position.z;
              }
            }
          }
          
          position.needsUpdate = true;
        };
        
        console.log('🦴 스켈레톤 헬퍼 생성 완료:', skeletonHelper);
        console.log('🦴 스켈레톤 헬퍼 visible:', skeletonHelper.visible);
        
        sceneRef.current.add(skeletonHelper);
        skeletonHelperRef.current = skeletonHelper;
        console.log('🦴 스켈레톤 헬퍼 씬에 추가 완료');

        // FBX 애니메이션에서는 스켈레톤만 표시

        // 애니메이션 설정
        if (fbx.animations && fbx.animations.length > 0) {
          console.log('애니메이션 설정');
          
          mixerRef.current = new THREE.AnimationMixer(fbx);
          const action = mixerRef.current.clipAction(fbx.animations[0]);
          
          // Idle 또는 호흡 애니메이션일 때만 첫 프레임 데이터 저장
          if (filename === 'Idle' || filename === 'Breathing Idle') {
            // 첫 프레임 데이터 초기화
            firstFrameDataRef.current = {};
            
            // 하체 본의 첫 프레임 데이터 저장
            fbx.traverse((child) => {
              if (child.isBone && lowerBodyBones.includes(child.name)) {
                const worldQuaternion = new THREE.Quaternion();
                child.getWorldQuaternion(worldQuaternion);
                firstFrameDataRef.current[child.name] = {
                  quaternion: {
                    x: worldQuaternion.x,
                    y: worldQuaternion.y,
                    z: worldQuaternion.z,
                    w: worldQuaternion.w
                  }
                };
                console.log(`${child.name} 첫 프레임 데이터 저장:`, firstFrameDataRef.current[child.name]);
              }
            });
            console.log('Idle/Breathing Idle 하체 첫 프레임 데이터 저장 완료');
          } else {
            // 다른 애니메이션에서는 첫 프레임 데이터 초기화
            firstFrameDataRef.current = {};
            console.log('다른 애니메이션 - 첫 프레임 데이터 초기화');
          }
          
          // 애니메이션 설정
          if (filename === 'Idle') {
            action.setLoop(THREE.LoopRepeat);
            action.clampWhenFinished = false;
          } else {
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            
            // 애니메이션 완료 이벤트 리스너 추가
            action.getMixer().addEventListener('finished', () => {
              console.log('애니메이션 완료:', filename);
              if (filename !== 'Idle') {
                console.log('Idle로 전환');
                onAnimationChange('Idle');
              }
            });
          }
          
          action.play();
          mixerRef.current.update(0.016);
        }

        onLoadingChange(false);
    };

    // 실제 파일 로딩 시작 (대체 경로 포함)
    let fallbackPath = null;
    
    // Woman 모델의 경우만 대체 패턴 시도
    if (modelName === 'woman') {
      if (filename === 'Happy Idle') {
        // Happy Idle의 경우 언더스코어 패턴을 fallback으로
        fallbackPath = `/fbx/Woman/Woman_${actualFilename}.fbx`;
      } else {
        // 나머지는 공백 패턴을 fallback으로
        fallbackPath = `/fbx/Woman/Woman ${actualFilename}.fbx`;
      }
      console.log('Woman 모델 대체 경로 설정:', fallbackPath);
    }
    
    // 로딩 시작
    tryLoadFBX(filePath, fallbackPath);
  };

  // 하체 본 목록 (움직임을 고정할 본들)
  const lowerBodyBones = [
    'mixamorigLeftUpLeg', 'mixamorigRightUpLeg', // 대퇴
    'mixamorigLeftLeg', 'mixamorigRightLeg',     // 정강
    'mixamorigLeftFoot', 'mixamorigRightFoot',   // 발
    'mixamorigLeftToeBase', 'mixamorigRightToeBase', // 발가락
    'LeftUpLeg', 'RightUpLeg',                   // 표준 명명
    'LeftLeg', 'RightLeg',
    'LeftFoot', 'RightFoot',
    'LeftToeBase', 'RightToeBase',
    'Hips', 'mixamorigHips',                     // 엉덩이
    'Spine', 'mixamorigSpine',                   // 척추
    'Spine1', 'mixamorigSpine1',
    'Spine2', 'mixamorigSpine2'
  ];

  // 애니메이션 루프
  const animate = () => {
    animationFrameRef.current = requestAnimationFrame(animate);
    
    const delta = clockRef.current.getDelta();
    
    // 애니메이션 믹서 업데이트
    if (mixerRef.current) {
      mixerRef.current.update(delta);

      // FBX 애니메이션 업데이트
      
      // 애니메이션 데이터 추출 및 전송
      if (modelRef.current && onAnimationDataExtract) {
        const animationData = {};
        modelRef.current.traverse((child) => {
          if (child.isBone) {
            const worldQuaternion = new THREE.Quaternion();
            child.getWorldQuaternion(worldQuaternion);
            
            // Idle 또는 호흡 애니메이션일 때만 하체 본 고정
            if ((currentAnimation === 'Idle' || currentAnimation === 'Breathing Idle'|| currentAnimation === 'Happy Idle') && 
                lowerBodyBones.includes(child.name)) {
              // 첫 프레임 데이터가 있으면 사용
              if (firstFrameDataRef.current[child.name]) {
                animationData[child.name] = firstFrameDataRef.current[child.name];
              } else {
                // 첫 프레임 데이터가 없으면 현재 데이터를 그대로 사용 (첫 실행 시)
                animationData[child.name] = {
                  quaternion: {
                    x: worldQuaternion.x,
                    y: worldQuaternion.y,
                    z: worldQuaternion.z,
                    w: worldQuaternion.w
                  }
                };
              }
            } else {
              // 다른 애니메이션에서는 모든 본을 정상적으로 움직임
              animationData[child.name] = {
                quaternion: {
                  x: worldQuaternion.x,
                  y: worldQuaternion.y,
                  z: worldQuaternion.z,
                  w: worldQuaternion.w
                }
              };
            }
          }
        });
        onAnimationDataExtract(animationData);
      }
    }
    
    if (controlsRef.current) {
      controlsRef.current.update();
    }
    
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  // Floor 토글 함수
  const toggleFloor = (visible) => {
    if (floorRef.current) {
      floorRef.current.visible = visible;
    }
    if (shadowFloorRef.current) {
      shadowFloorRef.current.visible = visible;
    }
  };

  // 전역에서 floor 토글 가능하도록 설정
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.toggleFloor = toggleFloor;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.toggleFloor;
      }
    };
  }, []);

  // 리사이즈 핸들러
  const handleResize = () => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  };

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    initScene();
    animate();

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      // 스켈레톤 헬퍼 정리
      if (skeletonHelperRef.current && sceneRef.current) {
        sceneRef.current.remove(skeletonHelperRef.current);
        skeletonHelperRef.current.dispose?.();
        skeletonHelperRef.current = null;
      }


      
      // 모델 정리
      if (modelRef.current && sceneRef.current) {
        sceneRef.current.remove(modelRef.current);
        modelRef.current.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        modelRef.current = null;
      }
      
      // 믹서 정리
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      
      // 렌더러 정리
      if (containerRef.current && rendererRef.current?.domElement) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      
      // 씬 정리
      if (sceneRef.current) {
        sceneRef.current.clear();
        sceneRef.current = null;
      }
    };
  }, []);

  // currentAnimation 또는 currentModel 변경 시 모델 로드 (초기값 포함)
  useEffect(() => {
    if (currentAnimation && sceneRef.current) {
      console.log('useEffect 트리거 - currentAnimation:', currentAnimation, 'currentModel:', currentModel);
      loadFBXModel(currentAnimation, currentModel);
    }
  }, [currentAnimation, currentModel]);

  // FBX 애니메이션에서는 스켈레톤만 항상 표시됨

  return <div ref={containerRef} className="w-full h-full" />;
};

export default FBXViewer; 
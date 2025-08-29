import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { SkeletonHelper } from 'three';
import * as THREE from 'three';
import { BONE_MAPPING, MIXAMORIG_BONE_MAPPING } from '../constants/modelConstants';
import { MODEL_URLS, MODEL_MESH_NAMES } from '../constants/modelConstants';
import { getBlendshapeMapForModel } from '../constants/blendshapeConstants';

export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    
    // 🗑️ DRACO 설정 제거
    // this.setupDracoLoader(); // ❌ 제거
    
    this.currentBoneMapping = {};
  }

  // 🗑️ DRACO 설정 함수 제거
  // setupDracoLoader() { ... } // ❌ 제거



  // 동적 본 매핑 생성 함수
  createBoneMappingForModel(armature, modelName) {
    const mapping = {};
    const availableBones = new Set();
    
    // 모든 본 이름 수집
    armature.traverse((child) => {
      if (child.type === 'Bone') {
        availableBones.add(child.name);
      }
    });
    console.log('사용 가능한 본들:', Array.from(availableBones));

    // 기본 매핑 시도 (mixamorig 접두사 없는 표준 GLB 본 이름)
    Object.entries(BONE_MAPPING).forEach(([fbxBone, glbBone]) => {
      if (availableBones.has(glbBone)) {
        mapping[fbxBone] = glbBone;
      }
    });

    // 대체 매핑 시도 (mixamorig 접두사가 있는 경우)
    Object.entries(MIXAMORIG_BONE_MAPPING).forEach(([fbxBone, mixamorigGlbBone]) => {
      if (!mapping[fbxBone] && availableBones.has(mixamorigGlbBone)) {
        mapping[fbxBone] = mixamorigGlbBone;
      }
    });
  
    console.log('생성된 본 매핑:', mapping);
    this.currentBoneMapping = mapping;
    return mapping;
  }

  // 본 구조 분석 함수
  analyzeBoneStructure(armature) {
    armature.traverse((child) => {
      if (child.type === 'Bone') {
        console.log(`본: ${child.name}, 위치: [${child.position.x.toFixed(3)}, ${child.position.y.toFixed(3)}, ${child.position.z.toFixed(3)}]`);
      }
    });
  }

  // 모델 로드 함수
  async loadModel(modelName, scene, onProgress = null) {
    return new Promise((resolve, reject) => {
      if (!MODEL_URLS[modelName]) {
        console.error(`❌ [ModelLoader] 모델 URL을 찾을 수 없음: ${modelName}`);
        console.error('🔍 [ModelLoader] 사용 가능한 모델:', Object.keys(MODEL_URLS));
        reject(new Error(`모델을 찾을 수 없음: ${modelName}`));
        return;
      }

      // 🗜️ Draco 압축 파일 지원 상태 확인


      // 🚀 캐시 상태 확인 및 로깅
      if (THREE.Cache.enabled) {
        const cacheKeys = Object.keys(THREE.Cache.files);
        const modelCacheKeys = cacheKeys.filter(key => key.includes(modelName));
        console.log(`🚀 [ModelLoader] 캐시 상태: 전체 ${cacheKeys.length}개, ${modelName} 관련 ${modelCacheKeys.length}개`);
        
        if (modelCacheKeys.length > 0) {
          console.log(`🚀 [ModelLoader] 캐시된 ${modelName} 모델 발견 - 빠른 로딩 예상`);
        }
      }

      console.log('🚀 [ModelLoader] 모델 로딩 시작:', {
        modelName,
        url: MODEL_URLS[modelName],
        sceneExists: !!scene,
        loaderExists: !!this.loader,
        cacheEnabled: THREE.Cache.enabled
      });
      
      this.loader.load(
        MODEL_URLS[modelName],
        (gltf) => {
          console.log('✅ [ModelLoader] 모델 로드 성공:', {
            modelName,
            hasScene: !!gltf.scene,
            hasAnimations: gltf.animations?.length || 0,
            sceneChildren: gltf.scene?.children?.length || 0
          });
          
          const model = gltf.scene;
          model.position.set(0, 0, 0);
          model.scale.set(1, 1, 1);
          scene.add(model);

          // 스켈레톤 헬퍼 생성
          let skeletonHelper = null;
          const armature = model.getObjectByName('Armature');
          if (armature) {
            console.log('아마추어 찾음');
            
            // 동적 본 매핑 생성
            this.createBoneMappingForModel(armature, modelName);
            
            // 본 구조 분석 및 출력
            console.log('=== 본 구조 분석 시작 ===');
            this.analyzeBoneStructure(armature);
            console.log('=== 본 구조 분석 완료 ===');
            
            // 아마추어 크기 고정
            armature.scale.set(1, 1, 1);
            armature.position.set(0, 0, 0);
            armature.rotation.set(0, 0, 0);
            armature.updateMatrix();
            
            skeletonHelper = new SkeletonHelper(armature);
            skeletonHelper.material.linewidth = 2;
            skeletonHelper.material.color.set(0x00ff00);
            skeletonHelper.visible = false; // 기본적으로 숨김
            
            // 스켈레톤 크기 고정
            skeletonHelper.scale.set(1, 1, 1);
            skeletonHelper.position.set(0, 0, 0);
            skeletonHelper.rotation.set(0, 0, 0);
            skeletonHelper.updateMatrix();
            
            scene.add(skeletonHelper);
          }

          // 모델별 메시 찾기 (다중 메시 지원)
          const targetMeshNames = MODEL_MESH_NAMES[modelName];
          let avatarMeshes = [];
          
          model.traverse((child) => {
            if (child.isMesh) {
              if (targetMeshNames.includes(child.name)) {
                avatarMeshes.push(child);
                console.log(`대상 메시 발견: ${child.name}`);
              }
            }
          });
          
          // 메시 개수에 따른 로깅
          console.log(`총 ${avatarMeshes.length}개의 메시 발견:`, avatarMeshes.map(m => m.name));

          // 모프 타겟 설정
          let morphTargets = null;
          
          if (avatarMeshes.length > 0) {
            // 첫 번째 메시의 블렌드쉐이프 정보를 기준으로 사용
            const firstMesh = avatarMeshes[0];
            
            if (firstMesh.morphTargetDictionary) {
              console.log('아바타 메시 설정 완료');
              
              // 메시 개수에 따라 구조 결정
              if (avatarMeshes.length === 1) {
                // 단일 메시일 때 - 기존 구조 유지
                morphTargets = {
                  head: {
                    mesh: avatarMeshes[0],  // 단일 메시
                    dictionary: firstMesh.morphTargetDictionary,
                    influences: firstMesh.morphTargetInfluences || new Array(Object.keys(firstMesh.morphTargetDictionary).length).fill(0)
                  }
                };
              } else {
                // 다중 메시일 때 - 새로운 구조
                morphTargets = {
                  head: {
                    meshes: avatarMeshes,  // 메시 배열
                    mesh: avatarMeshes[0],  // 호환성을 위해 첫 번째 메시도 유지
                    dictionary: firstMesh.morphTargetDictionary,
                    influences: firstMesh.morphTargetInfluences || new Array(Object.keys(firstMesh.morphTargetDictionary).length).fill(0),
                    meshCount: avatarMeshes.length  // 메시 개수 정보 추가
                  }
                };
              }

              // 모든 메시의 블렌드쉐이프 초기화
              avatarMeshes.forEach(mesh => {
                if (mesh.morphTargetInfluences) {
                  mesh.morphTargetInfluences.fill(0);
                }
              });
            } else {
              console.error(`메시 또는 morphTargets를 찾을 수 없음`);
            }
          } else {
            console.error(`대상 메시를 찾을 수 없음`);
          }

          // 애니메이션 믹서 설정
          let mixer = null;
          if (gltf.animations && gltf.animations.length) {
            console.log('애니메이션 설정');
            mixer = new THREE.AnimationMixer(model);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
          }

          // 블렌드쉐입 매핑 가져오기
          const blendshapeMap = getBlendshapeMapForModel(modelName);

          // 🛡️ 메터리얼 로딩 완료 대기 및 안정화
          console.log('🛡️ [ModelLoader] 메터리얼 안정화 시작...');
          
          // 모든 메시의 메터리얼이 완전히 로드될 때까지 대기
          const waitForMaterials = () => {
            let allMaterialsReady = true;
            
            avatarMeshes.forEach(mesh => {
              if (mesh.material) {
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                materials.forEach(material => {
                  if (material && !material.isMaterial) {
                    allMaterialsReady = false;
                  }
                  // 메터리얼 기본값 강제 설정 (피부 날아가는 것 방지)
                  if (material) {
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
            
            return allMaterialsReady;
          };

          // 🛡️ 메터리얼 완전 로드 후 렌더링 시작 (피부 투명화 방지)
          let materialWaitCount = 0;
          const maxWaitCount = 200; // 200ms * 10 = 2초 (더 안전하게)
          
          const stabilizeMaterials = () => {
            if (waitForMaterials() || materialWaitCount >= maxWaitCount) {
              console.log(`🛡️ [ModelLoader] 메터리얼 안정화 완료 (대기: ${materialWaitCount * 10}ms)`);
              
              // 🚀 추가 안전장치: 피부 메쉬 메터리얼 강제 복구
              avatarMeshes.forEach(mesh => {
                if (mesh.material && mesh.name.toLowerCase().includes('skin')) {
                  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                  materials.forEach(material => {
                    if (material) {
                      // 피부 메쉬는 항상 불투명하게 설정
                      material.transparent = false;
                      material.alphaTest = 0.5;
                      material.alphaHash = false;
                      material.depthWrite = true;
                      material.needsUpdate = true;
                      
                      console.log(`🛡️ [ModelLoader] 피부 메쉬 ${mesh.name} 메터리얼 보호 완료`);
                    }
                  });
                }
              });
              
              // 메터리얼 안정화 후 resolve
              resolveModel();
            } else {
              materialWaitCount++;
              setTimeout(stabilizeMaterials, 10);
            }
          };

          // 모델 해결 함수
          const resolveModel = () => {
            resolve({
              model,
              skeletonHelper,
              morphTargets,
              mixer,
              blendshapeMap,
              boneMapping: this.currentBoneMapping
            });
          };

          // 메터리얼 안정화 시작
          stabilizeMaterials();
        },
        (xhr) => {
          const progress = (xhr.loaded / xhr.total * 100);
          console.log(progress + '% 로드됨');
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('❌ [ModelLoader] 모델 로드 에러:', {
            modelName,
            url: MODEL_URLS[modelName],
            error: error.message || error,
            stack: error.stack
          });
          reject(error);
        }
      );
    });
  }

  // 현재 본 매핑 반환
  getCurrentBoneMapping() {
    return this.currentBoneMapping;
  }
}
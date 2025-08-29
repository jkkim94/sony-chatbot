/**
 * PreloadManager.js
 * 백그라운드에서 모델을 미리 로드하여 캐시에 저장하는 매니저
 * - 사용자 경험 향상을 위한 프리로딩 시스템
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { MODEL_URLS } from '../constants/modelConstants';

export class PreloadManager {
  constructor() {
    this.loader = new GLTFLoader();
    this.preloadQueue = [];
    this.isPreloading = false;
    this.preloadedModels = new Set();
    this.onStart = null;
    this.onProgress = null;
    this.onComplete = null;
  }

  // 프리로딩 콜백 설정
  setCallbacks(onStart, onProgress, onComplete) {
    this.onStart = onStart;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
  }

  // 프리로딩 시작
  async startPreloading(targetModels = ['brunette', 'man']) {
    if (this.isPreloading) {
      console.log('🚀 [PreloadManager] 이미 프리로딩 중입니다');
      return;
    }

    console.log('🚀 [PreloadManager] 백그라운드 프리로딩 시작:', targetModels);
    this.isPreloading = true;
    
    // 🚀 프리로딩 시작 콜백 호출
    if (this.onStart) {
      this.onStart();
    }

    try {
      // 프리로딩할 모델들을 큐에 추가
      this.preloadQueue = targetModels.filter(model => 
        !this.preloadedModels.has(model) && MODEL_URLS[model]
      );

      if (this.preloadQueue.length === 0) {
        console.log('🚀 [PreloadManager] 프리로딩할 모델이 없습니다');
        this.isPreloading = false;
        return;
      }

      // 각 모델을 순차적으로 프리로딩
      for (let i = 0; i < this.preloadQueue.length; i++) {
        const modelName = this.preloadQueue[i];
        
        if (this.onProgress) {
          this.onProgress({
            current: i + 1,
            total: this.preloadQueue.length,
            modelName,
            progress: ((i + 1) / this.preloadQueue.length) * 100
          });
        }

        await this.preloadModel(modelName);
        this.preloadedModels.add(modelName);
        
        console.log(`🚀 [PreloadManager] ${modelName} 프리로딩 완료 (${i + 1}/${this.preloadQueue.length})`);
      }

      console.log('🚀 [PreloadManager] 모든 모델 프리로딩 완료!');
      
      if (this.onComplete) {
        this.onComplete({
          totalPreloaded: this.preloadedModels.size,
          models: Array.from(this.preloadedModels)
        });
      }

    } catch (error) {
      console.error('❌ [PreloadManager] 프리로딩 중 오류:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  // 개별 모델 프리로딩
  async preloadModel(modelName) {
    return new Promise((resolve, reject) => {
      if (!MODEL_URLS[modelName]) {
        console.warn(`⚠️ [PreloadManager] ${modelName} 모델 URL을 찾을 수 없음`);
        resolve();
        return;
      }

      console.log(`🚀 [PreloadManager] ${modelName} 프리로딩 시작...`);

      // 프리로딩용 임시 씬 생성 (실제 씬에는 추가하지 않음)
      const tempScene = new THREE.Scene();
      
      this.loader.load(
        MODEL_URLS[modelName],
        (gltf) => {
          try {
            // 모델을 임시 씬에 추가하여 캐시에 저장
            const model = gltf.scene;
            tempScene.add(model);
            
            // 캐시 상태 확인
            if (THREE.Cache.enabled) {
              const cacheKeys = Object.keys(THREE.Cache.files);
              const modelCacheKeys = cacheKeys.filter(key => key.includes(modelName));
              console.log(`🚀 [PreloadManager] ${modelName} 캐시 저장 완료: ${modelCacheKeys.length}개 리소스`);
            }
            
            // 임시 씬에서 모델 제거 (메모리 정리)
            tempScene.remove(model);
            
            console.log(`✅ [PreloadManager] ${modelName} 프리로딩 성공`);
            resolve();
            
          } catch (error) {
            console.error(`❌ [PreloadManager] ${modelName} 프리로딩 처리 중 오류:`, error);
            resolve(); // 오류가 있어도 다음 모델 진행
          }
        },
        (progress) => {
          // 프리로딩 진행률 로깅 (선택적)
          if (progress.lengthComputable) {
            const percentComplete = (progress.loaded / progress.total) * 100;
            console.log(`🚀 [PreloadManager] ${modelName} 로딩 진행률: ${percentComplete.toFixed(1)}%`);
          }
        },
        (error) => {
          console.error(`❌ [PreloadManager] ${modelName} 로딩 실패:`, error);
          resolve(); // 실패해도 다음 모델 진행
        }
      );
    });
  }

  // 특정 모델이 프리로딩되었는지 확인
  isModelPreloaded(modelName) {
    return this.preloadedModels.has(modelName);
  }

  // 프리로딩 상태 확인
  getPreloadStatus() {
    return {
      isPreloading: this.isPreloading,
      preloadedModels: Array.from(this.preloadedModels),
      queueLength: this.preloadQueue.length,
      totalPreloaded: this.preloadedModels.size,
      // 🚀 모델 선택 버튼 비활성화 여부
      shouldDisableModelSelection: this.isPreloading || this.preloadQueue.length > 0
    };
  }

  // 프리로딩 중단
  stopPreloading() {
    this.isPreloading = false;
    this.preloadQueue = [];
    console.log('🚀 [PreloadManager] 프리로딩 중단됨');
  }

  // 프리로딩된 모델 목록 반환
  getPreloadedModels() {
    return Array.from(this.preloadedModels);
  }

  // 리소스 정리
  dispose() {
    this.stopPreloading();
    this.preloadedModels.clear();
    this.loader = null;
  }
}

/**
 * AudioStateManager.js
 * 오디오 상태를 관리하는 매니저
 */

export class AudioStateManager {
  constructor() {
    // 오디오 상태 관리
    this.audioBase64 = null;
    this.blendshapeFrames = [];
    this.morphTargetNames = [];
    this.readyToPlay = false;
    this.motionData = null;
    
    this.callbacks = {
      onAudioStateChange: null
    };
    
    console.log('[AudioStateManager] 초기화됨');
  }

  // 콜백 등록
  setCallbacks(callbacks) {
    console.log('[AudioStateManager] 콜백 설정:', callbacks);
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // 오디오 설정
  setAudioBase64(audio) {
    console.log('[AudioStateManager] setAudioBase64 호출됨, 길이:', audio?.length);
    this.audioBase64 = audio;
    this.notifyStateChange();
  }

  // 블렌드셰이프 설정
  setBlendshapeData(frames, morphTargetNames) {
    console.log('[AudioStateManager] setBlendshapeData 호출됨:', {
      framesLength: frames?.length,
      morphTargetNamesLength: morphTargetNames?.length
    });
    this.blendshapeFrames = frames;
    this.morphTargetNames = morphTargetNames;
    this.notifyStateChange();
  }

  // 재생 준비 상태 설정
  setReadyToPlay(ready) {
    console.log('[AudioStateManager] setReadyToPlay 호출됨:', ready);
    this.readyToPlay = ready;
    this.notifyStateChange();
  }

  // 모션 데이터 설정
  setMotionData(data) {
    console.log('[AudioStateManager] setMotionData 호출됨:', data);
    this.motionData = data;
    this.notifyStateChange();
  }

  // 상태 초기화
  resetAudioState() {
    console.log('[AudioStateManager] resetAudioState 호출됨');
    this.audioBase64 = null;
    this.blendshapeFrames = [];
    this.morphTargetNames = [];
    this.readyToPlay = false;
    this.notifyStateChange();
  }

  // 현재 상태 반환
  getCurrentState() {
    const state = {
      audioBase64: this.audioBase64,
      blendshapeFrames: [...this.blendshapeFrames],
      morphTargetNames: [...this.morphTargetNames],
      readyToPlay: this.readyToPlay,
      motionData: this.motionData
    };
    console.log('[AudioStateManager] getCurrentState 호출됨:', state);
    return state;
  }

  // 상태 변경 알림
  notifyStateChange() {
    console.log('[AudioStateManager] notifyStateChange 호출됨, 콜백 존재:', !!this.callbacks.onAudioStateChange);
    if (this.callbacks.onAudioStateChange) {
      const currentState = this.getCurrentState();
      console.log('[AudioStateManager] 콜백 실행:', currentState);
      this.callbacks.onAudioStateChange(currentState);
    } else {
      console.warn('[AudioStateManager] 콜백이 설정되지 않음');
    }
  }
}

// 싱글톤 인스턴스
export const audioStateManager = new AudioStateManager();

/**
 * UIManager.js
 * UI 상태를 관리하는 매니저
 */

export class UIManager {
  constructor() {
    this.isUIVisible = false; // 기본적으로 UI 패널 숨김 (클릭하면 보임)
    this.activeTab = 'lighting';
    this.currentFBXAnimation = 'Idle';
    this.isFBXLoading = false;
    this.currentLanguage = 'korean'; // 'korean', 'japanese', 'english'
    this.toastMessage = null;
    
    // 패널 가시성 상태
    this.panelVisibility = {
      lighting: true,
      rendering: true,
      material: true,
      
      effects: true,
      facial: true
    };
    
    this.callbacks = {
      onUIStateChange: null,
      onTabChange: null,
      onToastShow: null
    };
  }

  // 콜백 등록
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // UI 가시성 토글
  toggleUIVisibility() {
    this.isUIVisible = !this.isUIVisible;
    this.notifyStateChange();
    return this.isUIVisible;
  }

  // 활성 탭 변경
  setActiveTab(tab) {
    this.activeTab = tab;
    if (this.callbacks.onTabChange) {
      this.callbacks.onTabChange(tab);
    }
    this.notifyStateChange();
    return this.activeTab;
  }

  // FBX 애니메이션 설정
  setCurrentFBXAnimation(animation) {
    this.currentFBXAnimation = animation;
    this.notifyStateChange();
    return this.currentFBXAnimation;
  }

  // FBX 로딩 상태 설정
  setIsFBXLoading(loading) {
    this.isFBXLoading = loading;
    this.notifyStateChange();
    return this.isFBXLoading;
  }

  // 언어 설정
  setLanguage(language) {
    if (['korean', 'japanese', 'english'].includes(language)) {
      this.currentLanguage = language;
      this.notifyStateChange();
    }
    return this.currentLanguage;
  }

  // 호환성을 위한 getter
  get isJapaneseMode() {
    return this.currentLanguage === 'japanese';
  }

  get isEnglishMode() {
    return this.currentLanguage === 'english';
  }

  get isKoreanMode() {
    return this.currentLanguage === 'korean';
  }

  // 토스트 메시지 표시
  showToast(message) {
    this.toastMessage = message;
    if (this.callbacks.onToastShow) {
      this.callbacks.onToastShow(message);
    }
    this.notifyStateChange();
    
    // 3초 후 자동 제거
    setTimeout(() => {
      this.toastMessage = null;
      this.notifyStateChange();
    }, 3000);
  }

  // 현재 상태 반환
  getCurrentState() {
    return {
      isUIVisible: this.isUIVisible,
      activeTab: this.activeTab,
      currentFBXAnimation: this.currentFBXAnimation,
      isFBXLoading: this.isFBXLoading,
      currentLanguage: this.currentLanguage,
      isJapaneseMode: this.isJapaneseMode,
      isEnglishMode: this.isEnglishMode,
      isKoreanMode: this.isKoreanMode,
      toastMessage: this.toastMessage,
      panelVisibility: { ...this.panelVisibility }
    };
  }

  // 상태 변경 알림
  notifyStateChange() {
    if (this.callbacks.onUIStateChange) {
      this.callbacks.onUIStateChange(this.getCurrentState());
    }
  }
}

// 싱글톤 인스턴스
export const uiManager = new UIManager();

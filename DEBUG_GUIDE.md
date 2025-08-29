# 🎭 Viseme & Blendshape 디버그 시스템 가이드

이 가이드는 오디오 분석부터 blendshape 변화까지의 전체 과정을 추적할 수 있는 디버그 시스템의 사용법을 설명합니다.

## 🚀 빠른 시작

**중요**: Next.js SSR 환경에서는 컴포넌트가 마운트된 후에 디버그 모드를 활성화해야 합니다.

### 1. 컴포넌트 마운트 후 활성화
브라우저 콘솔에서 다음 명령어를 실행하여 모든 디버그 모드를 활성화하세요:

```javascript
// 모든 디버그 모드 활성화
window.enableVisemeDebug(true);
window.enableAudioDebug(true);
window.enableBlendshapeDebug(true);

// 현재 상태 확인
window.showDebugStatus();
```

## 🔍 디버그 모드별 설명

### 1. Viseme 처리 디버그 (`window.enableVisemeDebug`)
- **기능**: 오디오 데이터에서 viseme 추출 과정 추적
- **로그 스팸 방지**: 0.8초마다 로그 허용
- **출력 예시**:
  ```
  🎤 [Viseme] 처리 결과: {
    viseme: "aa",
    intensity: 0.750,
    audioLength: 12345
  }
  ```

### 2. 오디오 분석 디버그 (`window.enableAudioDebug`)
- **기능**: AudioManager의 오디오 분석 과정 추적
- **로그 스팸 방지**: 1초마다 로그 허용
- **출력 예시**:
  ```
  🔊 [AudioManager] Viseme 변화 #5: aa → E
  🔊 [AudioManager] 분석 결과: {
    volume: 0.750,
    mouthOpen: 0.650,
    mouthSmile: 0.200,
    viseme: "E",
    intensity: 0.750
  }
  ```

### 3. Blendshape 적용 디버그 (`window.enableBlendshapeDebug`)
- **기능**: blendshape 값 적용 과정 추적
- **로그 스팸 방지**: 0.3초마다 로그 허용, 값 변화가 1% 이상일 때만
- **출력 예시**:
  ```
  🎭 [Blendshape] #12 적용: {
    mesh: "CC_Base_Body002_3",
    morphIndex: 15,
    oldValue: 0.000,
    newValue: 0.750,
    finalValue: 0.750,
    amplified: false
  }
  ```

## 🎯 전체 과정 추적

### 단계별 흐름:
1. **오디오 입력** → AudioManager.extractViseme()
2. **Viseme 추출** → { viseme, intensity } 반환
3. **가중치 계산** → optimizeMouthShape() 함수
4. **Blendshape 적용** → applyBlendshapeValue() 함수

### 로그 예시:
```
🔊 [AudioManager] Viseme 변화 #3: sil → aa
🔊 [AudioManager] 분석 결과: { viseme: "aa", intensity: 0.650 }
🎤 [Viseme] 처리 결과: { viseme: "aa", intensity: 0.650, audioLength: 12345 }
🎭 [Blendshape] #8 적용: { mesh: "CC_Base_Body002_3", morphIndex: 12, ... }
```

## ⚙️ 고급 설정

### 로그 스로틀링 조정:
```javascript
// Viseme 처리 로그 간격 조정 (밀리초)
window.__DEBUG_VISEME_PROCESS__.logThrottleMs = 500; // 0.5초

// Blendshape 로그 간격 조정
window.__blendshapeLogState.logThrottleMs = 200; // 0.2초
```

### 특정 모드만 비활성화:
```javascript
// 특정 디버그 모드만 비활성화
window.enableVisemeDebug(false);
window.enableAudioDebug(false);
window.enableBlendshapeDebug(false);
```

## 🐛 문제 해결

### AudioManager가 초기화되지 않은 경우:
```javascript
// TalkingHead 컴포넌트가 마운트된 후 다시 시도
setTimeout(() => {
  window.enableAudioDebug(true);
}, 1000);

// 또는 컴포넌트가 완전히 로드될 때까지 대기
const waitForAudioManager = () => {
  if (window.audioManagerRef && window.audioManagerRef.current) {
    window.enableAudioDebug(true);
  } else {
    setTimeout(waitForAudioManager, 100);
  }
};
waitForAudioManager();
```

### 로그가 너무 많은 경우:
```javascript
// 로그 간격을 늘려서 스팸 방지
window.__DEBUG_VISEME_PROCESS__.logThrottleMs = 2000; // 2초
window.__blendshapeLogState.logThrottleMs = 1000; // 1초
```

## 📊 성능 모니터링

### 디버그 상태 확인:
```javascript
window.showDebugStatus();
```

### AudioManager 상태 확인:
```javascript
if (window.audioManagerRef && window.audioManagerRef.current) {
  const status = window.audioManagerRef.current.getStatus();
  console.log('AudioManager 상태:', status);
}
```

## 🎨 커스터마이징

### 새로운 디버그 카테고리 추가:
```javascript
// 사용자 정의 디버그 시스템
window.__CUSTOM_DEBUG__ = {
  lastLogTime: 0,
  logThrottleMs: 1000,
  shouldLog() {
    const now = Date.now();
    if (now - this.lastLogTime > this.logThrottleMs) {
      this.lastLogTime = now;
      return true;
    }
    return false;
  }
};
```

## 🔧 개발자 팁

1. **프로덕션 환경**: 모든 디버그 모드를 비활성화하여 성능 최적화
2. **개발 환경**: 필요한 모드만 선택적으로 활성화
3. **문제 해결**: 로그 스팸이 발생하면 스로틀링 간격을 늘리기
4. **성능 모니터링**: `window.showDebugStatus()`로 현재 상태 확인
5. **SSR 환경**: `window` 객체 접근 전에 `typeof window !== 'undefined'` 체크 필수
6. **컴포넌트 마운트**: 디버그 모드는 컴포넌트가 완전히 로드된 후 활성화

---

**참고**: 이 디버그 시스템은 개발 및 테스트 목적으로 설계되었습니다. 프로덕션 환경에서는 성능을 위해 비활성화하는 것을 권장합니다.

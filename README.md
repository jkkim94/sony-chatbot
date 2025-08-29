# GPT Voice Agent Animation GenMotion

AI 음성 에이전트와 3D 디지털 휴먼 애니메이션을 결합한 Next.js 기반 웹 애플리케이션입니다. 실시간 음성 인식, AI 대화, 3D 캐릭터 애니메이션을 통합하여 인터랙티브한 디지털 휴먼 경험을 제공합니다.

## 🌟 주요 특징

### 🤖 AI 음성 에이전트
- **OpenAI GPT 통합**: 자연스러운 대화형 AI 에이전트
- **음성-텍스트 변환 (STT)**: 실시간 음성 입력 인식
- **텍스트-음성 변환 (TTS)**: 자연스러운 음성 출력
- **다국어 지원**: 한국어, 영어, 일본어 등
- **실시간 대화**: 지연 없는 자연스러운 대화

### 🎭 3D 디지털 휴먼
- **고품질 3D 모델**: GLB/GLTF 형식 지원
- **표정 애니메이션**: 블렌드셰이프 기반 얼굴 애니메이션
- **입술 동기화**: 음성과 완벽하게 동기화되는 립싱크
- **눈 깜빡임**: 자연스러운 눈 깜빡임 애니메이션
- **FBX 애니메이션**: 다양한 동작 애니메이션 지원

### 🎨 고급 렌더링 시스템
- **WebGL/WebGPU**: 최신 그래픽 API 지원
- **실시간 조명**: 동적 조명 및 그림자
- **후처리 효과**: FXAA, TAA 등 안티앨리어싱
- **성능 최적화**: 저/중/고 품질 모드 지원

## 🚀 핵심 기능

### 1. 실시간 음성 대화
- 마이크를 통한 음성 입력
- AI의 자연스러운 음성 응답
- 대화 내용의 실시간 표시
- 음성 상태 시각적 피드백

### 2. 3D 캐릭터 제어
- **5가지 캐릭터 모델**:
  - 👩 Anna (woman) - 클래식 여성 캐릭터
  - 👩‍🦰 Airi (brunette) - 브루넷 여성 캐릭터
  - 👨 Eren (man) - 남성 캐릭터
- 실시간 모델 전환
- 각 모델별 최적화된 설정

### 3. 고급 애니메이션 시스템
- **표정 애니메이션**: 기쁨, 슬픔, 놀람 등 7가지 감정
- **눈 추적**: 마우스 위치에 따른 자연스러운 시선
- **자동 깜빡임**: 생생한 생명감
- **FBX 애니메이션**: Idle, Simple_Blinking 등

### 4. 메터리얼 및 렌더링 제어
- **PBR 메터리얼**: 현실적인 재질 표현
- **카테고리별 조정**: 피부, 머리카락, 의상 등 세부 제어
- **조명 시스템**: 환경광, 포인트 라이트, 그림자
- **렌더링 품질**: 성능에 따른 동적 조정

## 🛠️ 기술 스택

### Frontend & Framework
- **Next.js 15**: 최신 App Router 기반
- **React 19**: 최신 React 기능 활용
- **Tailwind CSS 4**: 모던 CSS 프레임워크

### 3D Graphics & Animation
- **Three.js**: WebGL 기반 3D 렌더링
- **@react-three/fiber**: React용 Three.js 래퍼
- **@react-three/drei**: Three.js 유틸리티
- **Postprocessing**: 고급 후처리 효과

### AI & Audio
- **OpenAI GPT API**: AI 대화 엔진
- **Web Audio API**: 실시간 오디오 처리
- **음성 분석**: 비주엄(viseme) 기반 립싱크

### State Management & Architecture
- **React Context**: 전역 상태 관리
- **Custom Hooks**: 재사용 가능한 로직
- **Manager Pattern**: 모듈화된 기능 관리

## 📦 설치 및 실행

### 필수 요구사항
- Node.js 18.0.0 이상
- npm 또는 yarn
- OpenAI API 키

### 설치 과정
```bash
# 저장소 클론
git clone [repository-url]
cd gpt-voice-agent-animation-genmotion

# 의존성 설치
npm install

# Draco 압축 라이브러리 설정 (자동 실행)
npm run setup-draco

# 개발 서버 실행 (포트 30003)
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

### 환경 설정
`.env.local` 파일을 생성하고 다음 환경변수를 설정하세요:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## 📁 프로젝트 구조

```
gpt-voice-agent-animation-genmotion/
├── app/                          # Next.js App Router
│   ├── api/                     # API 라우트
│   ├── globals.css              # 전역 스타일
│   ├── layout.js                # 루트 레이아웃
│   └── page.js                  # 메인 페이지 (1358줄)
│
├── components/                   # React 컴포넌트
│   ├── TalkingHead.js           # 메인 3D 캐릭터 (1685줄)
│   ├── AnimatedFBX.js           # FBX 애니메이션
│   ├── Toast.js                 # 알림 컴포넌트
│   ├── panels/                  # 제어 패널들
│   │   ├── FacialAnimationPanel.js
│   │   ├── EffectPanel.js
│   │   ├── FBXAnimationPanel.js
│   │   ├── LightingPanel.js
│   │   ├── RenderingPanel.js
│   │   └── MaterialPanel.js
│   ├── ui/                      # UI 컴포넌트
│   └── layout/                  # 레이아웃 컴포넌트
│
├── managers/                     # 비즈니스 로직 매니저
│   ├── ModelManager.js          # 3D 모델 관리 (789줄)
│   ├── RenderingManager.js      # 렌더링 관리 (1030줄)
│   ├── AnimationManager.js      # 애니메이션 관리 (945줄)
│   ├── MaterialManager.js       # 메터리얼 관리 (529줄)
│   ├── LightingManager.js       # 조명 관리 (495줄)
│   ├── CameraManager.js         # 카메라 관리 (568줄)
│   ├── FacialAnimationManager.js # 표정 애니메이션 (508줄)
│   ├── LipSyncManager.js        # 립싱크 관리 (91줄)
│   ├── AudioManager.js          # 오디오 관리 (84줄)
│   ├── BackgroundManager.js     # 배경 관리 (203줄)
│   ├── HandTrailManager.js      # 손 움직임 추적 (631줄)
│   ├── BlinkingManager.js       # 깜빡임 관리 (547줄)
│   ├── ParticleTrailManager.js  # 파티클 효과 (702줄)
│   └── PreloadManager.js        # 사전 로딩 관리 (182줄)
│
├── contexts/                     # React Context
├── constants/                    # 상수 및 설정
├── utils/                        # 유틸리티 함수
│   ├── audioUtils.js            # 오디오 관련 유틸리티
│   ├── textUtils.js             # 텍스트 처리 유틸리티
│   └── audioAnalysis.js         # 오디오 분석
│
└── public/                       # 정적 파일
    ├── presets/                 # 설정 프리셋
    │   ├── {model}-material.json
    │   ├── {model}-individual-material.json
    │   ├── {model}-lighting.json
    │   └── {model}-rendering-{quality}.json
    ├── glb/                     # 3D 모델 파일
    ├── fbx/                     # FBX 애니메이션
    └── draco/                   # Draco 압축 라이브러리
```

## 🎯 사용법

### 1. 초기 설정
- OpenAI API 키 설정
- 브라우저에서 마이크 권한 허용
- 3D 모델 로딩 완료 대기

### 2. 캐릭터 선택
- 우측 상단의 캐릭터 선택기 사용
- 5가지 모델 중 선택 (Anna, Airi, Eren)
- 자동으로 최적화된 설정 로드

### 3. AI 대화
- **텍스트 입력**: 채팅창에 메시지 입력
- **음성 입력**: 마이크 버튼으로 음성 녹음
- **음성 출력**: AI 응답을 자연스러운 음성으로 청취
- **실시간 동기화**: 음성과 캐릭터 애니메이션 동기화

### 4. 3D 제어
- **표정 애니메이션**: 감정별 자동 표정 변화
- **메터리얼 조정**: 실시간 재질 및 색상 변경
- **조명 제어**: 동적 조명 및 그림자 설정
- **렌더링 품질**: 성능에 따른 품질 조정

### 5. 고급 기능
- **FBX 애니메이션**: 다양한 동작 애니메이션
- **카메라 제어**: 줌, 회전, 이동
- **배경 변경**: 다양한 환경 설정
- **효과 추가**: 파티클, 블러, 색조 등

## 🔧 개발자 가이드

### 아키텍처 패턴
- **Manager Pattern**: 각 기능별 독립적인 매니저 클래스
- **Context API**: React 상태 관리
- **Custom Hooks**: 재사용 가능한 로직
- **Event-Driven**: 매니저 간 이벤트 기반 통신

### 성능 최적화
- **Lazy Loading**: 필요시에만 리소스 로드
- **Level of Detail**: 거리에 따른 렌더링 품질 조정
- **Frustum Culling**: 화면 밖 객체 렌더링 제외
- **Texture Compression**: Draco 압축으로 메모리 절약

### 확장성
- **모듈화된 구조**: 새로운 기능 쉽게 추가
- **설정 기반**: JSON 프리셋으로 동작 제어
- **플러그인 방식**: 매니저 기반 기능 확장
- **크로스 브라우저**: 다양한 브라우저 지원

## 🐛 디버깅 및 문제 해결

### 일반적인 문제
1. **3D 모델이 로드되지 않음**
   - 브라우저 콘솔 확인
   - WebGL 지원 여부 체크
   - 파일 경로 및 권한 확인

2. **음성이 작동하지 않음**
   - 마이크 권한 확인
   - HTTPS 환경에서 실행 확인
   - OpenAI API 키 유효성 검증

3. **성능 문제**
   - 렌더링 품질 낮춤
   - 불필요한 효과 비활성화
   - 하드웨어 가속 확인

### 개발자 도구
- **브라우저 콘솔**: 상세한 로그 및 에러
- **React DevTools**: 컴포넌트 상태 모니터링
- **Three.js Inspector**: 3D 씬 디버깅
- **Performance Tab**: 성능 프로파일링

## 📊 성능 지표

### 권장 사양
- **CPU**: Intel i5 / AMD Ryzen 5 이상
- **RAM**: 8GB 이상
- **GPU**: WebGL 2.0 지원 그래픽카드
- **브라우저**: Chrome 90+, Firefox 88+, Safari 14+

### 최적화 모드
- **Low Quality**: 모바일 및 저사양 기기
- **Medium Quality**: 일반적인 데스크톱
- **High Quality**: 고사양 기기 및 최고 품질

## 🔮 향후 계획

### 단기 목표
- [ ] 더 많은 캐릭터 모델 추가
- [ ] 추가 언어 지원 확대
- [ ] 모바일 최적화 개선

### 장기 목표
- [ ] VR/AR 지원
- [ ] 실시간 멀티플레이어
- [ ] AI 감정 인식 통합
- [ ] 커스텀 캐릭터 생성

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

## 🤝 기여하기

프로젝트 개선에 기여하고 싶으시다면:

1. **Fork** the repository
2. **Feature branch** 생성 (`git checkout -b feature/AmazingFeature`)
3. **변경사항 커밋** (`git commit -m 'Add some AmazingFeature'`)
4. **브랜치 푸시** (`git push origin feature/AmazingFeature`)
5. **Pull Request** 생성

### 기여 가이드라인
- 코드 스타일 준수
- 테스트 코드 작성
- 문서 업데이트
- 이슈 먼저 논의

## 📞 지원 및 문의

- **GitHub Issues**: 버그 리포트 및 기능 요청
- **Discussions**: 일반적인 질문 및 토론
- **Wiki**: 상세한 사용법 및 개발 가이드

## 🙏 감사의 말

이 프로젝트는 다음 오픈소스 프로젝트들의 도움을 받았습니다:
- Three.js
- React Three Fiber
- OpenAI
- Next.js
- Tailwind CSS

---

**GPT Voice Agent Animation GenMotion**으로 놀라운 3D 디지털 휴먼 경험을 만들어보세요! 🚀✨

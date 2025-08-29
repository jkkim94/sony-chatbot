# GPT Voice Agent Animation GenMotion

AI 음성 에이전트와 3D 캐릭터 애니메이션을 결합한 Next.js 기반 웹 애플리케이션입니다.

## 🎨 새로운 메터리얼 시스템

### 구조 개선
- **전체 메터리얼 설정**: 모든 메터리얼에 공통으로 적용되는 기본값
- **개별 메터리얼 설정**: 카테고리별 세부 설정 (전체 설정을 덮어씀)
- **독립적인 JSON 파일**: 모델별로 전체/개별 메터리얼 설정을 분리하여 관리

### 파일 구조
```
public/presets/
├── {model}-material.json              # 전체 메터리얼 설정
├── {model}-individual-material.json    # 개별 메터리얼 설정
├── {model}-lighting.json              # 조명 설정
└── {model}-rendering-{quality}.json   # 렌더링 설정
```

### 메터리얼 우선순위
1. **전체 메터리얼 설정** (기본값)
2. **개별 메터리얼 설정** (카테고리별 세부 조정)
3. **실시간 UI 변경사항** (즉시 적용)

### 지원하는 모델
- `brunette` - 브루넷 여성 캐릭터
- `man` - 남성 캐릭터  
- `woman` - 여성 캐릭터

### 메터리얼 카테고리
- **피부 (Skin)**: 얼굴, 몸통, 팔, 다리
- **눈 (Eyes)**: 눈동자, 각막
- **머리카락 (Hair)**: 머리카락, 두피
- **의상 (Clothing)**: 셔츠, 바지, 드레스
- **치아 (Teeth)**: 위/아래 치아
- **눈썹 (Eyebrows)**: 눈썹
- **속눈썹 (Eyelashes)**: 속눈썹
- **손톱 (Nails)**: 손톱
- **입술 (Lips)**: 입술
- **혀 (Tongue)**: 혀
- **액세서리 (Accessories)**: 신발, 장신구

## 🚀 주요 기능

### 3D 캐릭터 애니메이션
- GLB/GLTF 모델 지원
- 블렌드셰이프 기반 표정 애니메이션
- FBX 애니메이션 지원
- 실시간 음성 동기화

### AI 음성 처리
- OpenAI GPT 통합
- 음성-텍스트 변환 (STT)
- 텍스트-음성 변환 (TTS)
- 다국어 지원 (한국어, 영어, 일본어)

### 고급 렌더링
- WebGL/WebGPU 지원
- 실시간 그림자 및 조명
- 후처리 효과 (FXAA, TAA)
- 성능 최적화 모드

### 메터리얼 시스템
- PBR 메터리얼 지원
- 카테고리별 세부 조정
- 프리셋 저장/불러오기
- 실시간 메터리얼 편집

## 🛠️ 기술 스택

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **3D Graphics**: Three.js, WebGL/WebGPU
- **AI**: OpenAI GPT API
- **Audio**: Web Audio API
- **State Management**: React Context + Custom Hooks

## 📦 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

## 🔧 환경 설정

`.env.local` 파일을 생성하고 다음 환경변수를 설정하세요:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## 📁 프로젝트 구조

```
├── app/                    # Next.js 앱 라우터
├── components/            # React 컴포넌트
│   ├── panels/           # UI 패널 컴포넌트
│   └── ui/               # 공통 UI 컴포넌트
├── managers/              # 비즈니스 로직 매니저
├── constants/             # 상수 및 설정
├── contexts/              # React Context
├── utils/                 # 유틸리티 함수
└── public/                # 정적 파일
    ├── presets/          # 설정 프리셋
    ├── fbx/              # FBX 애니메이션
    └── glb/              # 3D 모델
```

## 🎯 사용법

### 1. 모델 선택
- 우측 상단의 캐릭터 선택기를 사용하여 모델을 변경
- 각 모델은 자동으로 최적화된 설정을 로드

### 2. 메터리얼 조정
- **전체 메터리얼**: 모든 메터리얼에 공통 적용
- **개별 메터리얼**: 카테고리별 세부 조정
- 실시간으로 3D 모델에 반영

### 3. AI 채팅
- 텍스트 입력으로 AI와 대화
- 음성 입력/출력 지원
- 다국어 대화 가능

### 4. 애니메이션 제어
- 블렌드셰이프 기반 표정 애니메이션
- FBX 애니메이션 재생
- 실시간 음성 동기화

## 🔍 개발자 정보

### 디버깅
- 브라우저 콘솔에서 상세한 로그 확인
- 각 매니저의 상태 모니터링
- 성능 프로파일링 지원

### 확장성
- 모듈화된 매니저 구조
- 플러그인 방식의 기능 추가
- 설정 기반 동작 제어

## 📄 라이선스

MIT License

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.

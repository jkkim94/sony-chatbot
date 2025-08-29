// 표정 애니메이션 템플릿 (TalkingHead 프로젝트 참고)
export const FACIAL_ANIMATION_TEMPLATES = {
  // 기본 표정 (자연스러운 미소 포함)
  neutral: {
    duration: 1000,
    keyframes: [
      { time: 0, values: { mouthSmile: 0, eyeBlinkLeft: 0, eyeBlinkRight: 0, browInnerUp: 0 } },
      { time: 1, values: { mouthSmile: 0, eyeBlinkLeft: 0, eyeBlinkRight: 0, browInnerUp: 0 } }
    ]
  },

  // 행복한 표정
  happy: {
    duration: 2000,
    keyframes: [
      { time: 0, values: { mouthSmile: 0, eyeSquintLeft: 0, eyeSquintRight: 0, cheekPuff: 0 } },
      { time: 0.3, values: { mouthSmile: 0.8, eyeSquintLeft: 0.6, eyeSquintRight: 0.6, cheekPuff: 0.3 } },
      { time: 0.7, values: { mouthSmile: 0.9, eyeSquintLeft: 0.7, eyeSquintRight: 0.7, cheekPuff: 0.4 } },
      { time: 1, values: { mouthSmile: 0.6, eyeSquintLeft: 0.4, eyeSquintRight: 0.4, cheekPuff: 0.2 } }
    ]
  },

  // 슬픈 표정
  sad: {
    duration: 2500,
    keyframes: [
      { time: 0, values: { mouthFrownLeft: 0, mouthFrownRight: 0, browDownLeft: 0, browDownRight: 0, eyeSquintLeft: 0, eyeSquintRight: 0 } },
      { time: 0.4, values: { mouthFrownLeft: 0.7, mouthFrownRight: 0.7, browDownLeft: 0.6, browDownRight: 0.6, eyeSquintLeft: 0.3, eyeSquintRight: 0.3 } },
      { time: 0.8, values: { mouthFrownLeft: 0.8, mouthFrownRight: 0.8, browDownLeft: 0.8, browDownRight: 0.8, eyeSquintLeft: 0.4, eyeSquintRight: 0.4 } },
      { time: 1, values: { mouthFrownLeft: 0.5, mouthFrownRight: 0.5, browDownLeft: 0.5, browDownRight: 0.5, eyeSquintLeft: 0.2, eyeSquintRight: 0.2 } }
    ]
  },

  // 놀란 표정
  surprised: {
    duration: 1500,
    keyframes: [
      { time: 0, values: { mouthOpen: 0, eyeWideLeft: 0, eyeWideRight: 0, browInnerUp: 0, browOuterUpLeft: 0, browOuterUpRight: 0 } },
      { time: 0.2, values: { mouthOpen: 0.8, eyeWideLeft: 0.9, eyeWideRight: 0.9, browInnerUp: 0.8, browOuterUpLeft: 0.7, browOuterUpRight: 0.7 } },
      { time: 0.6, values: { mouthOpen: 0.6, eyeWideLeft: 0.8, eyeWideRight: 0.8, browInnerUp: 0.7, browOuterUpLeft: 0.6, browOuterUpRight: 0.6 } },
      { time: 1, values: { mouthOpen: 0.2, eyeWideLeft: 0.3, eyeWideRight: 0.3, browInnerUp: 0.2, browOuterUpLeft: 0.2, browOuterUpRight: 0.2 } }
    ]
  },

  // 화난 표정
  angry: {
    duration: 2000,
    keyframes: [
      { time: 0, values: { mouthFrownLeft: 0, mouthFrownRight: 0, browDownLeft: 0, browDownRight: 0, eyeSquintLeft: 0, eyeSquintRight: 0, noseSneerLeft: 0, noseSneerRight: 0 } },
      { time: 0.3, values: { mouthFrownLeft: 0.6, mouthFrownRight: 0.6, browDownLeft: 0.8, browDownRight: 0.8, eyeSquintLeft: 0.7, eyeSquintRight: 0.7, noseSneerLeft: 0.5, noseSneerRight: 0.5 } },
      { time: 0.7, values: { mouthFrownLeft: 0.8, mouthFrownRight: 0.8, browDownLeft: 0.9, browDownRight: 0.9, eyeSquintLeft: 0.8, eyeSquintRight: 0.8, noseSneerLeft: 0.7, noseSneerRight: 0.7 } },
      { time: 1, values: { mouthFrownLeft: 0.4, mouthFrownRight: 0.4, browDownLeft: 0.5, browDownRight: 0.5, eyeSquintLeft: 0.4, eyeSquintRight: 0.4, noseSneerLeft: 0.3, noseSneerRight: 0.3 } }
    ]
  },

  // 두려움 표정
  fearful: {
    duration: 2200,
    keyframes: [
      { time: 0, values: { mouthOpen: 0, eyeWideLeft: 0, eyeWideRight: 0, browInnerUp: 0, browOuterUpLeft: 0, browOuterUpRight: 0, mouthStretchLeft: 0, mouthStretchRight: 0 } },
      { time: 0.2, values: { mouthOpen: 0.4, eyeWideLeft: 0.9, eyeWideRight: 0.9, browInnerUp: 0.9, browOuterUpLeft: 0.8, browOuterUpRight: 0.8, mouthStretchLeft: 0.3, mouthStretchRight: 0.3 } },
      { time: 0.5, values: { mouthOpen: 0.6, eyeWideLeft: 1.0, eyeWideRight: 1.0, browInnerUp: 1.0, browOuterUpLeft: 0.9, browOuterUpRight: 0.9, mouthStretchLeft: 0.5, mouthStretchRight: 0.5 } },
      { time: 0.8, values: { mouthOpen: 0.5, eyeWideLeft: 0.8, eyeWideRight: 0.8, browInnerUp: 0.8, browOuterUpLeft: 0.7, browOuterUpRight: 0.7, mouthStretchLeft: 0.4, mouthStretchRight: 0.4 } },
      { time: 1, values: { mouthOpen: 0.2, eyeWideLeft: 0.4, eyeWideRight: 0.4, browInnerUp: 0.4, browOuterUpLeft: 0.3, browOuterUpRight: 0.3, mouthStretchLeft: 0.1, mouthStretchRight: 0.1 } }
    ]
  },

  // 사랑 표정
  love: {
    duration: 3000,
    keyframes: [
      { time: 0, values: { mouthSmile: 0, eyeSquintLeft: 0, eyeSquintRight: 0, cheekPuff: 0, mouthPucker: 0, browInnerUp: 0 } },
      { time: 0.2, values: { mouthSmile: 0.6, eyeSquintLeft: 0.4, eyeSquintRight: 0.4, cheekPuff: 0.2, mouthPucker: 0.1, browInnerUp: 0.2 } },
      { time: 0.4, values: { mouthSmile: 0.8, eyeSquintLeft: 0.6, eyeSquintRight: 0.6, cheekPuff: 0.4, mouthPucker: 0.3, browInnerUp: 0.3 } },
      { time: 0.6, values: { mouthSmile: 0.9, eyeSquintLeft: 0.7, eyeSquintRight: 0.7, cheekPuff: 0.5, mouthPucker: 0.5, browInnerUp: 0.4 } },
      { time: 0.8, values: { mouthSmile: 0.7, eyeSquintLeft: 0.5, eyeSquintRight: 0.5, cheekPuff: 0.3, mouthPucker: 0.2, browInnerUp: 0.2 } },
      { time: 1, values: { mouthSmile: 0.5, eyeSquintLeft: 0.3, eyeSquintRight: 0.3, cheekPuff: 0.1, mouthPucker: 0, browInnerUp: 0.1 } }
    ]
  },

  // 잠자는 표정
  sleep: {
    duration: 4000,
    keyframes: [
      { time: 0, values: { eyeBlinkLeft: 0, eyeBlinkRight: 0, mouthOpen: 0, browDownLeft: 0, browDownRight: 0 } },
      { time: 0.1, values: { eyeBlinkLeft: 0.3, eyeBlinkRight: 0.3, mouthOpen: 0.1, browDownLeft: 0.1, browDownRight: 0.1 } },
      { time: 0.3, values: { eyeBlinkLeft: 0.8, eyeBlinkRight: 0.8, mouthOpen: 0.2, browDownLeft: 0.2, browDownRight: 0.2 } },
      { time: 0.5, values: { eyeBlinkLeft: 1.0, eyeBlinkRight: 1.0, mouthOpen: 0.3, browDownLeft: 0.3, browDownRight: 0.3 } },
      { time: 0.7, values: { eyeBlinkLeft: 1.0, eyeBlinkRight: 1.0, mouthOpen: 0.2, browDownLeft: 0.2, browDownRight: 0.2 } },
      { time: 0.9, values: { eyeBlinkLeft: 0.9, eyeBlinkRight: 0.9, mouthOpen: 0.1, browDownLeft: 0.1, browDownRight: 0.1 } },
      { time: 1, values: { eyeBlinkLeft: 0.8, eyeBlinkRight: 0.8, mouthOpen: 0.1, browDownLeft: 0.1, browDownRight: 0.1 } }
    ]
  },

  // 윙크
  wink: {
    duration: 800,
    keyframes: [
      { time: 0, values: { eyeBlinkLeft: 0, mouthSmile: 0 } },
      { time: 0.3, values: { eyeBlinkLeft: 1.0, mouthSmile: 0.4 } },
      { time: 0.6, values: { eyeBlinkLeft: 1.0, mouthSmile: 0.5 } },
      { time: 1, values: { eyeBlinkLeft: 0, mouthSmile: 0.2 } }
    ]
  },

  // 말하기 (강조)
  speaking: {
    duration: 1000,
    keyframes: [
      { time: 0, values: { mouthOpen: 0, browInnerUp: 0, eyeWideLeft: 0, eyeWideRight: 0 } },
      { time: 0.2, values: { mouthOpen: 0.4, browInnerUp: 0.3, eyeWideLeft: 0.2, eyeWideRight: 0.2 } },
      { time: 0.5, values: { mouthOpen: 0.6, browInnerUp: 0.4, eyeWideLeft: 0.3, eyeWideRight: 0.3 } },
      { time: 0.8, values: { mouthOpen: 0.3, browInnerUp: 0.2, eyeWideLeft: 0.1, eyeWideRight: 0.1 } },
      { time: 1, values: { mouthOpen: 0, browInnerUp: 0, eyeWideLeft: 0, eyeWideRight: 0 } }
    ]
  },

  // 혐오 표정
  disgusted: {
    duration: 1800,
    keyframes: [
      { time: 0, values: { noseSneerLeft: 0, noseSneerRight: 0, mouthFrownLeft: 0, mouthFrownRight: 0, eyeSquintLeft: 0, eyeSquintRight: 0, mouthUpperUpLeft: 0, mouthUpperUpRight: 0 } },
      { time: 0.3, values: { noseSneerLeft: 0.8, noseSneerRight: 0.8, mouthFrownLeft: 0.6, mouthFrownRight: 0.6, eyeSquintLeft: 0.5, eyeSquintRight: 0.5, mouthUpperUpLeft: 0.4, mouthUpperUpRight: 0.4 } },
      { time: 0.7, values: { noseSneerLeft: 1.0, noseSneerRight: 1.0, mouthFrownLeft: 0.8, mouthFrownRight: 0.8, eyeSquintLeft: 0.7, eyeSquintRight: 0.7, mouthUpperUpLeft: 0.6, mouthUpperUpRight: 0.6 } },
      { time: 1, values: { noseSneerLeft: 0.4, noseSneerRight: 0.4, mouthFrownLeft: 0.3, mouthFrownRight: 0.3, eyeSquintLeft: 0.2, eyeSquintRight: 0.2, mouthUpperUpLeft: 0.1, mouthUpperUpRight: 0.1 } }
    ]
  },

  // 의심 표정
  suspicious: {
    duration: 2000,
    keyframes: [
      { time: 0, values: { eyeSquintLeft: 0, eyeSquintRight: 0, browDownLeft: 0, browDownRight: 0, mouthFrownLeft: 0, mouthFrownRight: 0 } },
      { time: 0.3, values: { eyeSquintLeft: 0.6, eyeSquintRight: 0.3, browDownLeft: 0.4, browDownRight: 0.2, mouthFrownLeft: 0.3, mouthFrownRight: 0.1 } },
      { time: 0.6, values: { eyeSquintLeft: 0.8, eyeSquintRight: 0.4, browDownLeft: 0.6, browDownRight: 0.3, mouthFrownLeft: 0.5, mouthFrownRight: 0.2 } },
      { time: 1, values: { eyeSquintLeft: 0.4, eyeSquintRight: 0.2, browDownLeft: 0.3, browDownRight: 0.1, mouthFrownLeft: 0.2, mouthFrownRight: 0.1 } }
    ]
  },

  // 경멸 표정
  contempt: {
    duration: 1600,
    keyframes: [
      { time: 0, values: { mouthLeft: 0, mouthRight: 0, eyeSquintLeft: 0, eyeSquintRight: 0, noseSneerLeft: 0, noseSneerRight: 0, mouthSmileLeft: 0, mouthSmileRight: 0 } },
      { time: 0.3, values: { mouthLeft: 0.4, mouthRight: -0.2, eyeSquintLeft: 0.3, eyeSquintRight: 0.6, noseSneerLeft: 0.2, noseSneerRight: 0.5, mouthSmileLeft: 0.2, mouthSmileRight: 0.5 } },
      { time: 0.6, values: { mouthLeft: 0.6, mouthRight: -0.3, eyeSquintLeft: 0.4, eyeSquintRight: 0.8, noseSneerLeft: 0.3, noseSneerRight: 0.7, mouthSmileLeft: 0.3, mouthSmileRight: 0.7 } },
      { time: 1, values: { mouthLeft: 0.3, mouthRight: -0.1, eyeSquintLeft: 0.2, eyeSquintRight: 0.4, noseSneerLeft: 0.1, noseSneerRight: 0.3, mouthSmileLeft: 0.1, mouthSmileRight: 0.3 } }
    ]
  }
};

// 애니메이션 타입에 따른 표정 매핑
export const ANIMATION_TO_FACIAL_MAP = {
  'Happy Idle': 'happy',
  'Sad Idle': 'sad',
  'Standing Arguing': 'angry',
  'Standing Greeting': 'happy',
  'Sitting': 'neutral',
  'Samba Dancing': 'happy',
  'Breathing Idle': 'neutral',
  'Fear': 'fearful',
  'Love': 'love',
  'Sleep': 'sleep',
  'Disgust': 'disgusted',
  'Suspicious': 'suspicious',
  'Contempt': 'contempt'
}; 
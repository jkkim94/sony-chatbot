import { NextResponse } from 'next/server';

// ElevenLabs API 설정
const ELEVENLABS_CONFIG = {
  baseUrl: 'https://api.elevenlabs.io/v1/text-to-speech',
  voiceIds: {
    // 여성 목소리 (기본)
    female: 'AW5wrnG1jVizOYY7R1Oo', // 여성 영어
    femaleJapanese: 'RBnMinrYKeccY3vaUxlZ', // 여성 일본어
    
    // 남성 목소리 (MAN 모델용)
    male: 'ZJCNdZEjYwkOElxugmW2', // 남성 영어
    maleJapanese: 'ZJCNdZEjYwkOElxugmW2', // 남성 일본어 (영어 남성 목소리 사용 - multilingual 지원)
    
    // 하위 호환성을 위한 기존 이름들
    default: 'AW5wrnG1jVizOYY7R1Oo',
    japanese: 'RBnMinrYKeccY3vaUxlZ',
    alternative1: 'ZJCNdZEjYwkOElxugmW2',
    alternative2: 'xi3rF0t7dg7uN2M0WUhr'
  },
  model: 'eleven_multilingual_v2',
  defaultSettings: {
    stability: 0.5,
    similarity_boost: 0.5
  }
};

// 언어 감지 함수
const detectLanguage = (text) => {
  // 일본어 문자 패턴 (히라가나, 카타카나, 한자)
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  return japanesePattern.test(text);
};

// 보이스 ID 선택 함수 (모델 타입과 언어에 따른 선택)
const selectVoiceId = (text, isJapaneseMode = false, currentModel = '') => {
  const isJapanese = isJapaneseMode || detectLanguage(text);
  const isMaleModel = currentModel.toLowerCase() === 'man';
  
  // 모델과 언어에 따른 목소리 선택
  if (isJapanese) {
    if (isMaleModel) {
      return ELEVENLABS_CONFIG.voiceIds.maleJapanese;
      //return ELEVENLABS_CONFIG.voiceIds.femaleJapanese;
    } else {
      return ELEVENLABS_CONFIG.voiceIds.femaleJapanese;
    }
  } else {
    if (isMaleModel) {
      return ELEVENLABS_CONFIG.voiceIds.male;
      //return ELEVENLABS_CONFIG.voiceIds.female;
    } else {
      return ELEVENLABS_CONFIG.voiceIds.female;
    }
  }
};

// 이모티콘 제거 함수
const removeEmojis = (text) => {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE0F}]|[\u{200D}]/gu;
  return text.replace(emojiRegex, '').trim();
};

// 텍스트 검증 함수
const validateText = (text) => {
  if (!text || !text.trim()) {
    return { isValid: false, error: '텍스트가 비어있습니다' };
  }
  
  const cleanText = removeEmojis(text);
  if (!cleanText || !cleanText.trim()) {
    return { isValid: false, error: '이모티콘 제거 후 텍스트가 비어있습니다' };
  }
  
  return { isValid: true, cleanText };
};

// 음성 설정 최적화 함수
const optimizeVoiceSettings = (textLength) => {
  return {
    stability: textLength < 50 ? 0.3 : ELEVENLABS_CONFIG.defaultSettings.stability,
    similarity_boost: ELEVENLABS_CONFIG.defaultSettings.similarity_boost
  };
};

// ElevenLabs API 호출 함수
const callElevenLabsAPI = async (text, voiceId = ELEVENLABS_CONFIG.voiceIds.default) => {
  const apiUrl = `${ELEVENLABS_CONFIG.baseUrl}/${voiceId}`;
  
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY가 설정되지 않았습니다');
  }
  
  const voiceSettings = optimizeVoiceSettings(text.length);
  
  console.log('API 요청:', {
    url: apiUrl,
    textLength: text.length,
    voiceId,
    settings: voiceSettings
  });
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_CONFIG.model,
      voice_settings: voiceSettings
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ElevenLabs API 응답 오류:', response.status, errorText);
    throw new Error(`ElevenLabs API 요청 실패: ${response.status} - ${errorText}`);
  }

  return response;
};

// 오디오 데이터 처리 함수
const processAudioResponse = async (response) => {
  const audioArrayBuffer = await response.arrayBuffer();
  const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');
  
  console.log('음성 합성 성공:', {
    audioSize: audioArrayBuffer.byteLength,
    base64Length: audioBase64.length
  });
  
  return {
    audio: audioBase64,
    success: true,
    byteLength: audioArrayBuffer.byteLength,
    timestamp: new Date().toISOString()
  };
};

// 메인 POST 핸들러
export async function POST(request) {
  console.log('🔍 Text-to-Speech API 호출됨');
  
  try {
    // API 키 확인
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error('❌ ELEVENLABS_API_KEY가 설정되지 않음');
      return NextResponse.json({ 
        audio: '', 
        success: false, 
        error: 'ElevenLabs API 키가 설정되지 않았습니다.' 
      }, { status: 500 });
    }
    
    const { text, isJapaneseMode, currentModel } = await request.json();
    console.log('📨 TTS 요청 데이터:', { textLength: text?.length, isJapaneseMode, currentModel });
    
    // 텍스트 검증
    const validation = validateText(text);
    if (!validation.isValid) {
      console.log(validation.error);
      return NextResponse.json({ 
        audio: '', 
        success: false, 
        error: validation.error 
      });
    }
    
    const { cleanText } = validation;
    
    // 적절한 보이스 ID 선택 (모델 타입에 따라)
    const selectedVoiceId = selectVoiceId(cleanText, isJapaneseMode, currentModel);
    
    console.log('🎙️ 음성 합성 요청:', {
      originalLength: text.length,
      cleanLength: cleanText.length,
      isJapaneseMode,
      currentModel,
      selectedVoiceId,
      voiceType: currentModel?.toLowerCase() === 'man' ? 'male' : 'female',
      language: isJapaneseMode ? 'Japanese' : 'English',
      expectedVoice: currentModel?.toLowerCase() === 'man' 
        ? (isJapaneseMode ? 'maleJapanese' : 'male')
        : (isJapaneseMode ? 'femaleJapanese' : 'female'),
      preview: cleanText.substring(0, 50) + (cleanText.length > 50 ? '...' : '')
    });
    
    // ElevenLabs API 호출
    const response = await callElevenLabsAPI(cleanText, selectedVoiceId);
    
    // 오디오 데이터 처리
    const result = await processAudioResponse(response);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('음성 합성 오류:', error);
    
    // 에러 타입별 처리
    let errorMessage = '음성 합성 중 오류가 발생했습니다';
    let statusCode = 500;
    
    if (error.message.includes('API 키')) {
      errorMessage = 'API 키 설정 오류';
      statusCode = 500;
    } else if (error.message.includes('429')) {
      errorMessage = 'API 요청 한도 초과. 잠시 후 다시 시도해주세요';
      statusCode = 429;
    } else if (error.message.includes('401')) {
      errorMessage = 'API 키가 유효하지 않습니다';
      statusCode = 401;
    }
    
    return NextResponse.json(
      { 
        error: `${errorMessage}: ${error.message}`,
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
} 
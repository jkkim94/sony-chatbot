import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 시스템 메시지 상수
const SYSTEM_MESSAGE = `당신은 사용자의 요청을 처리하는 AI 어시스턴트입니다.
사용자의 요청을 분석하여 적절한 응답을 제공해야 합니다.

응답 언어 규칙:
- 한국어 입력: 한국어로 응답
- 일본어 입력: 일본어로 응답  
- 영어 입력: 영어로 응답
- 번역 요청: 요청된 언어로 응답

응답 규칙:
{
  "response": "사용자 언어에 맞는 친절하고 자연스러운 대화 응답"
}

중요한 규칙:
- 반드시 위의 JSON 형식으로만 응답하세요
- JSON 외의 다른 텍스트는 절대 포함하지 마세요
- response 필드에는 사용자에게 보여질 친절한 대화 내용만 포함하세요
- 이모지나 특수문자는 사용하지 마세요

예시:
사용자: "안녕하세요"
응답: {"response": "안녕하세요! 무엇을 도와드릴까요?"}

사용자: "こんにちは"
응답: {"response": "こんにちは！何かお手伝いできることはありますか？"}

사용자: "Hello"
응답: {"response": "Hello! How can I help you?"}`;

// 기본 응답 생성 함수
const createDefaultResponse = (message = '죄송합니다. 다시 말씀해 주세요.') => ({
  response: message
});

// 일본어 번역 함수
const translateToJapanese = async (text) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a professional Korean to Japanese translator. Translate the following Korean text to natural Japanese. Only output the Japanese translation, nothing else. Do not translate to Chinese or any other language - only Japanese." 
        },
        { role: "user", content: `한국어 텍스트: "${text}"\n\n위 텍스트를 일본어로 번역해주세요. 중국어나 다른 언어가 아닌 일본어로만 번역하세요.` }
      ],
      temperature: 0.1,
    });

    const translatedText = response.choices[0].message.content.trim();
    console.log('일본어 번역 완료:', { original: text, translated: translatedText });
    return translatedText;
  } catch (error) {
    console.error('일본어 번역 오류:', error);
    return text;
  }
};

// 영어 번역 함수
const translateToEnglish = async (text) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a professional Korean to English translator. Translate the following Korean text to natural English. Only output the English translation, nothing else. Do not translate to any other language - only English." 
        },
        { role: "user", content: `한국어 텍스트: "${text}"\n\n위 텍스트를 영어로 번역해주세요. 다른 언어가 아닌 영어로만 번역하세요.` }
      ],
      temperature: 0.1,
    });

    const translatedText = response.choices[0].message.content.trim();
    console.log('영어 번역 완료:', { original: text, translated: translatedText });
    return translatedText;
  } catch (error) {
    console.error('영어 번역 오류:', error);
    return text;
  }
};

// JSON 추출 및 파싱 함수
const extractAndParseJSON = (content) => {
  try {
    let jsonString = content.trim();
    
    // JSON 블록 패턴 확인
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1].trim();
    } else {
      // JSON 객체 패턴 찾기
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonString = objectMatch[0];
      }
    }
    
    // JSON 부분만 추출
    if (jsonString.includes('{') && jsonString.includes('}')) {
      const startIndex = jsonString.indexOf('{');
      const endIndex = jsonString.lastIndexOf('}') + 1;
      jsonString = jsonString.substring(startIndex, endIndex);
    }
    
    console.log('추출된 JSON 문자열:', jsonString);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON 파싱 실패:', error);
    throw error;
  }
};

// 언어 감지 함수
const detectLanguage = (text) => {
  // 일본어 문자 패턴 (히라가나, 카타카나, 한자)
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  // 영어 문자 패턴 (기본 라틴 문자)
  const englishPattern = /^[a-zA-Z0-9\s.,!?'"()-]+$/;
  
  if (japanesePattern.test(text)) {
    return 'japanese';
  } else if (englishPattern.test(text.trim())) {
    return 'english';
  } else {
    return 'korean'; // 기본값
  }
};

// 응답 데이터 검증 및 정리 함수
const validateAndCleanResponse = (parsedContent, originalContent) => {
  // response 필드 처리
  if (!parsedContent.response) {
    const textBeforeJson = originalContent.substring(0, originalContent.indexOf('{')).trim();
    const textAfterJson = originalContent.substring(originalContent.lastIndexOf('}') + 1).trim();
    parsedContent.response = textBeforeJson || textAfterJson || '죄송합니다. 다시 말씀해 주세요.';
  }
  
  // response 필드에서 JSON 문자열 제거
  if (parsedContent.response.includes('{') || parsedContent.response.includes('}')) {
    parsedContent.response = parsedContent.response.replace(/\{[\s\S]*\}/g, '').trim();
    if (!parsedContent.response) {
      parsedContent.response = '죄송합니다. 다시 말씀해 주세요.';
    }
  }

  // 언어별 특수문자 처리
  const detectedLanguage = detectLanguage(parsedContent.response);
  
  if (detectedLanguage === 'japanese') {
    // 일본어인 경우: 이모지만 제거하고 일반 특수문자(！？등)는 보존
    parsedContent.response = parsedContent.response.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '');
  } else if (detectedLanguage === 'english') {
    // 영어인 경우: 이모지만 제거하고 영어 특수문자는 보존
    parsedContent.response = parsedContent.response.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '');
  } else {
    // 한국어인 경우: 기존처럼 이모지 및 특수문자 제거
    parsedContent.response = parsedContent.response.replace(/[\p{Emoji}\p{So}\p{Sk}\p{Cn}\u200d\uFE0F\u2069\u2066\u2068\u2067\u202a-\u202e\u00a9\u00ae\u203c-\u3299\ud83c-\ud83e][\ufe00-\ufe0f]?/gu, '');
    parsedContent.response = parsedContent.response.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  }

  return parsedContent;
};

// 메인 POST 핸들러
export async function POST(request) {
  console.log('🔍 Chat API 호출됨');
  
  try {
    // API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY가 설정되지 않음');
      return NextResponse.json(
        createDefaultResponse('OpenAI API 키가 설정되지 않았습니다.'),
        { status: 500 }
      );
    }
    
    const { messages, translateToJapanese: shouldTranslateJapanese, translateToEnglish: shouldTranslateEnglish } = await request.json();
    console.log('📨 요청 데이터:', { messagesCount: messages?.length, shouldTranslateJapanese, shouldTranslateEnglish });

    // 입력 검증
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        createDefaultResponse('잘못된 요청입니다.'),
        { status: 400 }
      );
    }

    let processedMessages = [...messages];

    // 번역 처리
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        let translatedContent = lastMessage.content;
        
        // 일본어 번역
        if (shouldTranslateJapanese) {
          console.log('일본어 번역 요청:', lastMessage.content);
          translatedContent = await translateToJapanese(lastMessage.content);
          console.log('일본어 번역 결과:', translatedContent);
        }
        // 영어 번역
        else if (shouldTranslateEnglish) {
          console.log('영어 번역 요청:', lastMessage.content);
          translatedContent = await translateToEnglish(lastMessage.content);
          console.log('영어 번역 결과:', translatedContent);
        }
        
        // 번역된 내용으로 메시지 업데이트
        if (translatedContent !== lastMessage.content) {
          processedMessages[processedMessages.length - 1] = {
            ...lastMessage,
            content: translatedContent
          };
        }
      }
    }

    // OpenAI API 호출
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_MESSAGE },
        ...processedMessages
      ],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    console.log('GPT 원본 응답:', content);
    
    let parsedContent;
    
    try {
      // JSON 추출 및 파싱
      parsedContent = extractAndParseJSON(content);
      
      // 응답 검증 및 정리
      parsedContent = validateAndCleanResponse(parsedContent, content);
      
      console.log('파싱된 응답:', parsedContent);
      
    } catch (parseError) {
      console.error('JSON 파싱 실패:', parseError);
      console.log('원본 내용:', content);
      
      // 파싱 실패 시 기본 응답 생성
      let cleanResponse = content
        .replace(/```json|```/g, '')
        .replace(/\{[\s\S]*\}/g, '')
        .trim();
      
      parsedContent = createDefaultResponse(cleanResponse || undefined);
      console.log('기본 응답 생성:', parsedContent);
    }

    return NextResponse.json(parsedContent);
    
  } catch (error) {
    console.error('Chat API 에러:', error);
    
    // 에러 타입별 처리
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        createDefaultResponse('API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.'),
        { status: 429 }
      );
    }
    
    if (error.code === 'rate_limit_exceeded') {
      return NextResponse.json(
        createDefaultResponse('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'),
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      createDefaultResponse('죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.'),
      { status: 500 }
    );
  }
} 
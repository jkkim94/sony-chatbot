import { NextResponse } from 'next/server';

// 공통 에러 응답 생성 함수
export const createErrorResponse = (message, statusCode = 500, additionalData = {}) => {
  return NextResponse.json(
    {
      error: message,
      success: false,
      timestamp: new Date().toISOString(),
      ...additionalData
    },
    { status: statusCode }
  );
};

// 성공 응답 생성 함수
export const createSuccessResponse = (data, statusCode = 200) => {
  return NextResponse.json(
    {
      success: true,
      timestamp: new Date().toISOString(),
      ...data
    },
    { status: statusCode }
  );
};

// 요청 검증 함수
export const validateRequest = (request, requiredFields = []) => {
  const errors = [];
  
  if (!request || typeof request !== 'object') {
    errors.push('잘못된 요청 형식입니다');
    return { isValid: false, errors };
  }
  
  for (const field of requiredFields) {
    if (!(field in request) || request[field] === undefined || request[field] === null) {
      errors.push(`필수 필드가 누락되었습니다: ${field}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// API 키 검증 함수
export const validateApiKey = (keyName) => {
  const apiKey = process.env[keyName];
  if (!apiKey) {
    throw new Error(`환경 변수 ${keyName}가 설정되지 않았습니다`);
  }
  return apiKey;
};

// 요청 제한 체크 (간단한 메모리 기반)
const requestCounts = new Map();
const REQUEST_LIMIT = 100; // 분당 요청 제한
const TIME_WINDOW = 60 * 1000; // 1분

export const checkRateLimit = (identifier) => {
  const now = Date.now();
  const userRequests = requestCounts.get(identifier) || [];
  
  // 시간 윈도우 밖의 요청들 제거
  const recentRequests = userRequests.filter(time => now - time < TIME_WINDOW);
  
  if (recentRequests.length >= REQUEST_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.min(...recentRequests) + TIME_WINDOW
    };
  }
  
  // 새 요청 추가
  recentRequests.push(now);
  requestCounts.set(identifier, recentRequests);
  
  return {
    allowed: true,
    remaining: REQUEST_LIMIT - recentRequests.length,
    resetTime: now + TIME_WINDOW
  };
};

// 로깅 유틸리티
export const logRequest = (endpoint, method, data = {}) => {
  console.log(`[${new Date().toISOString()}] ${method} ${endpoint}`, {
    ...data,
    timestamp: new Date().toISOString()
  });
};

// 응답 시간 측정 데코레이터
export const withTiming = (handler) => {
  return async (request) => {
    const startTime = Date.now();
    try {
      const result = await handler(request);
      const duration = Date.now() - startTime;
      console.log(`요청 처리 시간: ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`요청 실패 (${duration}ms):`, error);
      throw error;
    }
  };
};

// 캐시 유틸리티 (간단한 메모리 기반)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5분

export const getCached = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

export const setCache = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

export const clearCache = (pattern) => {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

// 텍스트 정제 유틸리티
export const sanitizeText = (text, options = {}) => {
  if (!text || typeof text !== 'string') return '';
  
  let cleaned = text.trim();
  
  // HTML 태그 제거
  if (options.removeHtml !== false) {
    cleaned = cleaned.replace(/<[^>]*>/g, '');
  }
  
  // 특수 문자 제거
  if (options.removeSpecialChars) {
    cleaned = cleaned.replace(/[^\w\s가-힣]/g, '');
  }
  
  // 연속된 공백 정리
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // 길이 제한
  if (options.maxLength && cleaned.length > options.maxLength) {
    cleaned = cleaned.substring(0, options.maxLength).trim();
  }
  
  return cleaned;
}; 
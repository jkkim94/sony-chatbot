/**
 * 텍스트를 문장 단위로 분할합니다.
 * @param {string} text - 분할할 텍스트
 * @param {number} maxLength - 문장 최대 길이 (선택적)
 * @returns {string[]} 문장 배열
 */
export function splitIntoSentences(text, maxLength = 200) {
  if (!text) return [];
  
  // 문장 구분 패턴: 마침표 + 공백 또는 문장 끝
  const sentenceEndPattern = /\.(?:\s|$)/g;
  
  // 문장 구분 패턴: 마침표, 물음표, 느낌표 + 공백 또는 문장 끝
  //const sentenceEndPattern = /[.!?](?:\s|$)/g;

  let sentences = [];
  let lastIndex = 0;
  let match;
  
  // 문장 구분 패턴으로 텍스트 분할
  while ((match = sentenceEndPattern.exec(text)) !== null) {
    sentences.push(text.substring(lastIndex, match.index + 1).trim());
    lastIndex = match.index + 1;
  }
  
  // 남은 텍스트가 있으면 추가
  if (lastIndex < text.length) {
    sentences.push(text.substring(lastIndex).trim());
  }
  
  // 빈 문장 제거 및 너무 긴 문장 분할
  const result = [];
  for (const sentence of sentences) {
    if (!sentence) continue;
    
    // 문장이 너무 길면 분할
    if (sentence.length > maxLength) {
      // 구두점이나 접속사를 기준으로 분할
      const chunks = splitLongSentence(sentence, maxLength);
      result.push(...chunks);
    } else {
      result.push(sentence);
    }
  }
  
  return result;
}

/**
 * 긴 문장을 적절한 길이로 분할합니다.
 * @param {string} sentence - 분할할 문장
 * @param {number} maxLength - 최대 길이
 * @returns {string[]} 분할된 문장 배열
 */
function splitLongSentence(sentence, maxLength) {
  const result = [];
  let current = '';
  
  // 쉼표, 세미콜론 등으로 분할 시도
  const parts = sentence.split(/([,;:])/);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (current.length + part.length < maxLength) {
      current += part;
    } else {
      if (current) result.push(current.trim());
      current = part;
    }
  }
  
  if (current) result.push(current.trim());
  
  // 여전히 너무 긴 부분이 있으면 강제 분할
  return result.flatMap(part => 
    part.length > maxLength
      ? forceSplitText(part, maxLength)
      : part
  );
}

/**
 * 텍스트를 강제로 지정된 길이로 분할합니다.
 * @param {string} text - 분할할 텍스트
 * @param {number} maxLength - 최대 길이
 * @returns {string[]} 분할된 텍스트 배열
 */
function forceSplitText(text, maxLength) {
  const result = [];
  
  for (let i = 0; i < text.length; i += maxLength) {
    result.push(text.substring(i, i + maxLength));
  }
  
  return result;
}

/**
 * 짧은 문장들을 적절히 병합합니다.
 * @param {string[]} sentences - 문장 배열
 * @param {number} minLength - 최소 문장 길이
 * @param {number} optimalLength - 최적 문장 길이
 * @returns {string[]} 병합된 문장 배열
 */
export function mergeSentences(sentences, minLength = 30, optimalLength = 100) {
  if (!sentences || sentences.length === 0) return [];
  
  const result = [];
  let current = '';
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    
    // 현재 문장이 충분히 길거나 마지막 문장인 경우
    if (current.length + sentence.length > optimalLength || 
        (current.length >= minLength && i === sentences.length - 1)) {
      if (current) result.push(current);
      current = sentence;
    }
    // 현재 병합 중인 문장이 너무 짧은 경우 계속 병합
    else if (current.length < minLength || sentence.length < minLength) {
      current = current ? `${current} ${sentence}` : sentence;
    }
    // 적정 길이에 도달한 경우
    else {
      if (current) result.push(current);
      current = sentence;
    }
  }
  
  // 남은 텍스트가 있으면 추가
  if (current) result.push(current);
  
  return result;
} 
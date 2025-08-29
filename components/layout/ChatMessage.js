"use client";

import { useState, useEffect } from 'react';
import { playAudio } from '../../utils/audioUtils';
import { splitIntoSentences, mergeSentences } from '../../utils/textUtils';

export default function ChatMessage({ message, onPlayAudio, onMotionRequest, currentLanguage = 'korean', isChatInputActive = false }) {
  const isUser = message.role === 'user';
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState([]);
  const [isProcessingMotion, setIsProcessingMotion] = useState(false);
  const [error, setError] = useState(null);
  
  // 🚀 전역 음성 플레이 상태 관리 (중복 방지)
  useEffect(() => {
    // 전역 음성 플레이 상태 설정
    if (typeof window !== 'undefined') {
      if (!window.globalAudioState) {
        window.globalAudioState = { isPlaying: false, currentMessageId: null };
      }
    }
  }, []);
  
  // 🌏 다국어 텍스트 정의
  const getLocalizedText = (key) => {
    const texts = {
      motionGenerating: {
        korean: '모션 생성 중...',
        japanese: 'モーション生成中...',
        english: 'Generating motion...'
      },
      voiceTooltip: {
        korean: '음성으로 듣기',
        japanese: '音声で聞く',
        english: 'Listen with voice'
      },
      otherVoicePlaying: {
        korean: '다른 음성이 재생 중입니다',
        japanese: '他の音声が再生中です',
        english: 'Another voice is playing'
      },
      chatInputActive: {
        korean: '채팅 입력 중 - 음성 재생이 비활성화됩니다',
        japanese: 'チャット入力中 - 音声再生が無効化されています',
        english: 'Chat input active - Voice playback is disabled'
      }
    };
    
    return texts[key]?.[currentLanguage] || texts[key]?.korean || key;
  };
  
  useEffect(() => {
    if (!isUser) {
      // 메시지가 로드될 때 문장으로 분할하여 저장
      const rawSentences = splitIntoSentences(message.content);
      // 짧은 문장들 병합
      setSentences(mergeSentences(rawSentences));

      // 모션 생성 요청인지 확인
      try {
        const parsedContent = JSON.parse(message.content);
        // isMotionRequest 플래그가 있는 경우에만 처리
        if (parsedContent.isMotionRequest && parsedContent.prompt && !message.isMotionRequest) {
          handleMotionRequest(parsedContent.prompt);
        }
      } catch (e) {
        // JSON 파싱 실패 시 일반 메시지로 처리
      }


    }
  }, [message.content, isUser, message.isMotionRequest]);
  
  const handleMotionRequest = async (prompt) => {
    if (isProcessingMotion) return;
    
    setIsProcessingMotion(true);
    try {
      const response = await fetch('/api/generate-motion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      // 응답이 null이거나 undefined인 경우 처리
      if (!data) {
        throw new Error('API 응답이 없습니다.');
      }

      // 429 상태 코드 (Too Many Requests) 처리
      if (response.status === 429) {
        console.log('이전 요청이 처리 중입니다.');
        return;
      }

      // 에러 응답 처리
      if (data.error) {
        throw new Error(data.error);
      }

      // 성공적인 응답 처리
      if (data.result) {
        // 애니메이션 데이터 전달
        if (typeof window !== 'undefined') {
          window.animationData = {
            result: data.result,
            timestamp: Date.now()
          };
      }

      if (onMotionRequest) {
        console.log('생성된 모션 데이터:', {
          type: typeof data,
          hasResult: !!data.result,
          resultLength: data.result?.length,
          requestId: data.request_id
        });

        if (data.result) {
          try {
            const animationData = JSON.parse(data.result);
            const sampleBone = animationData.bones ? Object.entries(animationData.bones)[0] : null;
            
            console.log('애니메이션 데이터 상세:', {
              type: typeof animationData,
              keys: Object.keys(animationData),
              duration: animationData.duration,
              bonesType: typeof animationData.bones,
              bonesKeys: animationData.bones ? Object.keys(animationData.bones) : null,
              sampleBone: sampleBone ? {
                name: sampleBone[0],
                position: sampleBone[1].position,
                rotation: sampleBone[1].rotation
              } : null
            });

            // 모든 본의 첫 번째 프레임 데이터 로깅
            if (animationData.bones) {
              console.log('모든 본의 첫 번째 프레임 데이터:');
              Object.entries(animationData.bones).forEach(([boneName, boneData]) => {
                console.log(`${boneName}:`, {
                  position: boneData.position,
                  rotation: boneData.rotation
                });
              });
            }
          } catch (e) {
            console.error('애니메이션 데이터 파싱 실패:', e);
          }
        }

        onMotionRequest(data);
        }
      } else {
        throw new Error('애니메이션 데이터가 없습니다.');
      }
    } catch (error) {
      console.error('모션 생성 에러:', error);
      // 에러 메시지를 상태로 저장하여 UI에 표시
      setError(error.message || '모션 생성 중 오류가 발생했습니다.');
    } finally {
      setIsProcessingMotion(false);
    }
  };
  
  const handlePlayAudio = async () => {
    // 🚀 전역 음성 플레이 상태 확인 (중복 방지)
    if (typeof window !== 'undefined' && window.globalAudioState) {
      if (window.globalAudioState.isPlaying) {
        console.log('🚫 [ChatMessage] 다른 음성이 재생 중입니다. 중복 재생 차단.');
        return;
      }
    }
    
    if (!isUser && !isPlaying && sentences.length > 0) {
      // 🚀 전역 음성 플레이 상태 설정 (즉시)
      if (typeof window !== 'undefined') {
        window.globalAudioState = { 
          isPlaying: true, 
          currentMessageId: message.id || Date.now() 
        };
        
        // 🎵 음성 재생 시작 즉시 전역 상태 업데이트
        if (window.onAudioStateChange) {
          window.onAudioStateChange(true);
        }
      }
      
      setIsPlaying(true);
      
      try {
        // 전체 텍스트를 재생하는 동안 시각적 피드백 제공 가능
        await onPlayAudio(message.content);
      } finally {
        setIsPlaying(false);
        
        // 🚀 전역 음성 플레이 상태 해제
        if (typeof window !== 'undefined' && window.globalAudioState) {
          window.globalAudioState.isPlaying = false;
          window.globalAudioState.currentMessageId = null;
        }
        
        // 🎵 음성 재생 완료 즉시 전역 상태 업데이트
        if (window.onAudioStateChange) {
          window.onAudioStateChange(false);
        }
      }
    }
  };
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-8`}>
      <div className={`max-w-3/4 p-6 rounded-lg ${
        isUser 
          ? 'text-white' 
          : 'text-gray-800'
      }`} style={{
        backgroundColor: isUser ? '#91A0FB' : '#E5EAEC'
      }}>
        <div className="flex items-start">
          {!isUser && (
                                        <button 
                              onClick={handlePlayAudio}
                              disabled={isPlaying || isProcessingMotion || isChatInputActive || (typeof window !== 'undefined' && window.globalAudioState && window.globalAudioState.isPlaying)}
                              className="mr-4 text-sm rounded-full p-2 hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={
                                isChatInputActive 
                                  ? getLocalizedText('chatInputActive')
                                  : typeof window !== 'undefined' && window.globalAudioState && window.globalAudioState.isPlaying 
                                    ? getLocalizedText('otherVoicePlaying') 
                                    : getLocalizedText('voiceTooltip')
                              }
                            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
          )}
          <div className="flex-1">
            <p className="text-xl leading-relaxed">
              {isProcessingMotion ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {getLocalizedText('motionGenerating')}
                </span>
              ) : (
                message.content
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
import React, { useState, useEffect } from 'react';

const ViewerCharacterSelector = ({ 
  currentModel, 
  onModelChange, 
  isLoading = false, 
  isAnimationRunning = false,
  isChatLoading = false,
  isPreloading = false,
  isAudioPlaying = false,
  currentLanguage = 'korean',
  isVisible = true
}) => {
  // 🔒 더블클릭 방지를 위한 상태
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 🕒 채팅 전송 완료 후 3초간 더 비활성화
  const [chatMessageDelay, setChatMessageDelay] = useState(false);
  const [hasChatStarted, setHasChatStarted] = useState(false); // 🚀 채팅 시작 여부 추적
  
  // 채팅 전송 상태 변화 감지 및 지연 처리
  useEffect(() => {
    if (isChatLoading) {
      setChatMessageDelay(false);
      setHasChatStarted(true); // 🚀 채팅이 시작되었음을 표시
    } else if (chatMessageDelay && hasChatStarted) {
      // 채팅 전송이 완료되면 3초 후에 메시지 숨김 (채팅이 시작된 경우에만)
      const timer = setTimeout(() => {
        setChatMessageDelay(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isChatLoading, chatMessageDelay, hasChatStarted]);
  
  // 채팅 전송 완료 감지 (채팅이 시작된 경우에만)
  useEffect(() => {
    if (!isChatLoading && hasChatStarted && chatMessageDelay === false) {
      setChatMessageDelay(true);
    }
  }, [isChatLoading, hasChatStarted]);
  
  // 🕒 채팅 메시지 표시 여부 (전송 중이거나 3초 지연, 단 채팅이 시작된 경우에만)
  const shouldShowChatMessage = (isChatLoading || chatMessageDelay) && hasChatStarted;
  
  // 🔒 모든 로딩/애니메이션/채팅/프리로딩/오디오 재생 상태를 통합하여 모델 변경 차단
  const isModelChangeBlocked = isLoading || isProcessing || isAnimationRunning || shouldShowChatMessage || isPreloading || isAudioPlaying;
  
  // 🌏 다국어 텍스트 정의
  const getLocalizedText = (key) => {
    const texts = {
      characterSelection: {
        korean: '캐릭터 선택',
        japanese: 'キャラクター選択',
        english: 'Character Selection'
      },
      loading: {
        korean: '🔄 로딩 중',
        japanese: '🔄 読み込み中',
        english: '🔄 Loading...'
      },
      animationRunning: {
        korean: '🎭 애니메이션 실행 중',
        japanese: '🎭 アニメーション実行中',
        english: '🎭 Animation Running'
      },
      chatSending: {
        korean: '⚠️ 채팅 전송 중 - 모델 전환이 비활성화됩니다',
        japanese: '⚠️ チャット送信中 - モデル切り替えが無効化されています',
        english: '⚠️ Chat sending - Model switching is disabled'
      },
      preloading: {
        korean: '🚀 서비스를 준비하고 있습니다',
        japanese: '🚀 サービスを準備中です',
        english: '🚀 We are currently preparing the service.'
      },

      audioPlaying: {
        korean: '🎵 음성 재생 중 - 모델 전환이 비활성화됩니다',
        japanese: '🎵 音声再生中 - モデル切り替えが無効化されています',
        english: '🎵 Audio playing - Model switching is disabled'
      },
      modelSwitching: {
        korean: '⚠️ 모델 전환 중 - 모든 조작이 비활성화됩니다',
        japanese: '⚠️ モデル切り替え中 - すべての操作が無効化されています',
        english: '⚠️ Model switching - All operations are disabled'
      },
      animationOnly: {
        korean: '⚠️ 애니메이션 실행 중 - 단순 눈 애니메이션만 모델 전환 가능',
        japanese: '⚠️ アニメーション実行中 - シンプルな目のアニメーションのみモデル切り替え可能',
        english: '⚠️ Animation running - Only simple eye animation can switch models'
      }
    };
    
    return texts[key]?.[currentLanguage] || texts[key]?.korean || key;
  };
  
  // 주요 3개 캐릭터만 선택 (woman을 첫 번째로)
  const mainCharacters = [
    { key: 'woman', label: 'Anna', emoji: '👩' },
    { key: 'brunette', label: 'Airi', emoji: '👩‍🦰' },
    { key: 'man', label: 'Eren', emoji: '👨' }
  ];

  // 🔒 모델 변경 핸들러에 더블클릭 방지 로직 추가
  const handleModelChange = (modelName) => {
    if (isModelChangeBlocked) {
      console.log(`🚫 [ViewerCharacterSelector] 모델 변경 차단: ${modelName}`, {
        isLoading,
        isProcessing,
        isAnimationRunning,
        isChatLoading
      });
      return;
    }
    
    // 처리 시작
    setIsProcessing(true);
    
    try {
      onModelChange(modelName);
    } finally {
      // 500ms 후에 처리 상태 해제 (더블클릭 방지)
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
    }
  };

  return (
    <>
      {!isPreloading && (
        <div className="absolute top-4 right-4 z-50">
          <div className={`rounded-lg p-3 shadow-xl border transition-all duration-300 relative ${
            isLoading || isProcessing || isAnimationRunning
              ? isLoading || isProcessing
                ? 'border-yellow-400 bg-yellow-50/95'
                : 'border-purple-400 bg-purple-50/95'
              : 'border-gray-300 bg-white/95'
          }`}>
            {/* 🔒 애니메이션 중 완전 오버레이 */}
            {isAnimationRunning && (
              <div className="absolute inset-0 bg-purple-900/30 border-2 border-purple-400/50 rounded-lg z-20 flex items-center justify-center">
                <div className="text-center text-purple-700">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                  <div className="text-xs font-medium">🎭 애니메이션 실행 중</div>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-medium ${
                isLoading || isProcessing || isAnimationRunning
                  ? isLoading || isProcessing ? 'text-yellow-800' : 'text-purple-800'
                  : 'text-gray-800'
              }`}>
                {getLocalizedText('characterSelection')}
                {(isLoading || isProcessing) && (
                  <span className="ml-2 text-xs text-yellow-600 animate-pulse">
                    {getLocalizedText('loading')}
                  </span>
                )}
                {isAnimationRunning && (
                  <span className="ml-2 text-xs text-purple-600 animate-pulse">
                    {getLocalizedText('animationRunning')}
                  </span>
                )}
              </span>
              {(isLoading || isProcessing || isAnimationRunning) && (
                <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                  isAnimationRunning ? 'border-purple-500' : 'border-yellow-500'
                }`}></div>
              )}
            </div>
            
            <div className="flex gap-2">
              {mainCharacters.map(character => (
                <button
                  key={character.key}
                  onClick={() => handleModelChange(character.key)}
                  disabled={isModelChangeBlocked}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                    isModelChangeBlocked
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-50'
                      : currentModel === character.key
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                  }`}
                >
                  <span className="text-lg">{character.emoji}</span>
                  <span>{character.label}</span>
                  {currentModel === character.key && (
                    <span className="text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
            
            {/* 🔒 강화된 로딩 상태 표시 (버튼 아래로 이동) */}
            {(isLoading || isProcessing || isAnimationRunning || shouldShowChatMessage || isPreloading || isAudioPlaying) && (
              <div className={`mt-2 p-2 rounded text-xs border ${
                isPreloading
                  ? 'bg-green-100 border-green-300 text-green-800'
                  : shouldShowChatMessage
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : isAudioPlaying
                      ? 'bg-purple-100 border-purple-300 text-purple-800'
                      : isLoading || isProcessing
                        ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                        : 'bg-purple-100 border-purple-300 text-purple-800'
              }`}>
                <div className="flex items-center gap-2">
                  <span>
                    {isPreloading
                      ? '🚀 서비스를 시작중입니다...'
                      : shouldShowChatMessage 
                        ? getLocalizedText('chatSending')
                        : isAudioPlaying
                          ? getLocalizedText('audioPlaying')
                          : isLoading || isProcessing
                            ? getLocalizedText('modelSwitching')
                            : getLocalizedText('animationOnly')
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ViewerCharacterSelector;

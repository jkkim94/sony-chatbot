import React, { useState, useEffect } from 'react';

const ModelSelector = ({ 
  currentModel, 
  onModelChange, 
  models, 
  isLoading = false, 
  isAnimationRunning = false,
  isChatLoading = false, // 채팅 전송 상태 추가
  isSkeletonVisible = false, // 스켈레톤 상태 추가
  onToggleSkeleton = () => {}, // 스켈레톤 토글 함수 추가

  isInitialLoading = false // 게임 시작 시점부터 서비스 시작 상태
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 🕒 채팅 전송 완료 후 메시지 3초간 유지
  const [chatMessageDelay, setChatMessageDelay] = useState(false);
  
  // 채팅 전송 상태 변화 감지 및 지연 처리
  useEffect(() => {
    if (isChatLoading) {
      setChatMessageDelay(false);
    } else if (chatMessageDelay) {
      // 채팅 전송이 완료되면 3초 후에 메시지 숨김
      const timer = setTimeout(() => {
        setChatMessageDelay(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isChatLoading, chatMessageDelay]);
  
  // 채팅 전송 완료 감지
  useEffect(() => {
    if (!isChatLoading && chatMessageDelay === false) {
      setChatMessageDelay(true);
    }
  }, [isChatLoading]);
  
  // 🔒 모든 로딩/애니메이션/채팅 상태를 통합하여 모델 변경 차단
  // isInitialLoading이 true면 무조건 차단
  const isModelChangeBlocked = isInitialLoading || isLoading || isProcessing || isAnimationRunning || isChatLoading;
  
  // 디버깅: 현재 상태 로깅 (로그 스팸 방지)
  // console.log('🔍 [ModelSelector] 상태:', {
  //   isLoading,
  //   isInitialLoading,
  //   isProcessing,
  //   isAnimationRunning,
  //   isChatLoading,
  //   isModelChangeBlocked
  // });
  
  // 🕒 채팅 메시지 표시 여부 (전송 중이거나 3초 지연)
  const shouldShowChatMessage = isChatLoading || chatMessageDelay;
  
  const handleModelChange = (modelName) => {
    if (isModelChangeBlocked) {
      console.log(`🚫 [ModelSelector] 모델 변경 차단: ${modelName}`, {
        isLoading,
        isProcessing,
        isAnimationRunning,
        isChatLoading
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      onModelChange(modelName);
    } finally {
      setTimeout(() => setIsProcessing(false), 500);
    }
  };


  return (
    <div className="space-y-4">
      {/* 기본 제어 섹션 */}
      <div>
        <h3 className="text-base font-medium text-white mb-3">🎮 기본 제어</h3>
        
        {/* 스켈레톤 토글 */}
        <div className="mb-3">
          <label className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isSkeletonVisible}
                onChange={onToggleSkeleton}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-gray-300">🦴 스켈레톤 표시</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              isSkeletonVisible 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {isSkeletonVisible ? 'ON' : 'OFF'}
            </span>
          </label>
        </div>

        {/* 모델 선택 */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            📱 모델 선택
            {(isLoading || isInitialLoading) && (
              <span className="ml-2 text-xs text-yellow-400 animate-pulse">
                🚀 서비스를 시작중입니다...
              </span>
            )}
            {isAnimationRunning && (
              <span className="ml-2 text-xs text-purple-400 animate-pulse">
                🎭 애니메이션 실행 중...
              </span>
            )}
            {isChatLoading && (
              <span className="ml-2 text-xs text-blue-400 animate-pulse">
                💬 채팅 전송 중...
              </span>
            )}
          </label>
          <select
            value={currentModel || ''}
            onChange={(e) => handleModelChange(e.target.value)}
            disabled={isModelChangeBlocked}
            className={`w-full px-3 py-2 text-sm border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
              isModelChangeBlocked
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            {models.map(model => (
              <option key={model.key} value={model.key}>
                {model.label}
              </option>
            ))}
          </select>
          
          {/* 🔒 강화된 로딩 상태 표시 */}
          {isModelChangeBlocked && (
            <div className={`mt-2 p-2 rounded text-xs border ${
              shouldShowChatMessage 
                ? 'bg-blue-900/20 border-blue-600/30 text-blue-400'
                : isAnimationRunning 
                  ? 'bg-purple-900/20 border-purple-600/30 text-purple-400'
                  : 'bg-yellow-900/20 border-yellow-600/30 text-yellow-400'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ${
                  shouldShowChatMessage 
                    ? 'border-blue-400'
                    : isAnimationRunning 
                      ? 'border-purple-400' 
                      : 'border-yellow-400'
                }`}></div>
                <span>
                  {shouldShowChatMessage 
                    ? '💬 채팅 전송 중 - 모델 전환이 비활성화됩니다'
                    : isAnimationRunning 
                      ? '🎭 애니메이션 실행 중 - 단순 눈 애니메이션만 모델 전환 가능'
                      : '🚀 서비스를 시작중입니다 - 모델 전환이 비활성화됩니다'
                  }
                </span>
              </div>
            </div>
          )}
        </div>



        {/* 로딩 상태 */}
        {isLoading && (
          <div className="mt-3 text-center text-blue-400 text-xs flex items-center justify-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span>모델 전환 중...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelSelector;
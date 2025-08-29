import React from 'react';

const FacialAnimationPanel = ({ onPlayAnimation, disabled = false }) => {
  const animations = [
    { id: 'neutral', name: '중립', emoji: '😐' },
    { id: 'happy', name: '행복', emoji: '😊' },
    { id: 'sad', name: '슬픔', emoji: '😢' },
    { id: 'angry', name: '화남', emoji: '😠' },
    { id: 'surprised', name: '놀람', emoji: '😲' },
    { id: 'disgusted', name: '혐오', emoji: '🤢' },
    { id: 'fearful', name: '두려움', emoji: '😨' },
    { id: 'contempt', name: '경멸', emoji: '😤' },
    { id: 'love', name: '사랑', emoji: '😍' },
    { id: 'sleep', name: '잠자기', emoji: '😴' },
    { id: 'wink', name: '윙크', emoji: '😉' },
    { id: 'speaking', name: '말하기', emoji: '🗣️' },
    { id: 'suspicious', name: '의심', emoji: '🤨' }
  ];

  return (
    <div>
      <h3 className="text-base font-medium text-white mb-3">
        🎭 표정 애니메이션
        {disabled && (
          <span className="ml-2 text-xs text-yellow-400 animate-pulse">
            🔄 로딩 중
          </span>
        )}
      </h3>
      
      <div className="grid grid-cols-3 gap-2">
        {animations.map(animation => (
          <button
            key={animation.id}
            onClick={() => !disabled && onPlayAnimation?.(animation.id)}
            disabled={disabled}
            className={`flex items-center justify-center space-x-1 px-2 py-1 rounded-lg transition-all duration-200 text-xs ${
              disabled
                ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
            }`}
          >
            <span className="text-base">{animation.emoji}</span>
            <span className={disabled ? 'text-gray-500' : 'text-gray-300'}>{animation.name}</span>
          </button>
        ))}
      </div>
      
      {/* 🔒 로딩 중 비활성화 안내 */}
      {disabled && (
        <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded text-xs text-yellow-400">
          <div className="flex items-center gap-2">
            <span>⚠️ 모델 전환 중 - 표정 애니메이션이 비활성화됩니다</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacialAnimationPanel;
import React from 'react';

const FBXAnimationPanel = ({ 
  currentAnimation, 
  onAnimationSelect, 
  isLoading
}) => {
  const animations = [
    { key: 'Idle', emoji: '😐', label: '기본 대기' },
    { key: 'Happy Idle', emoji: '😊', label: '행복' },
    { key: 'Sad Idle', emoji: '😢', label: '슬픔' },
    { key: 'Breathing Idle', emoji: '😌', label: '호흡' },
    { key: 'Standing Arguing', emoji: '😠', label: '논쟁' },
    { key: 'Standing Greeting', emoji: '👋', label: '인사' },
    // { key: 'Sitting', emoji: '🪑', label: '앉기' },
    { key: 'Samba Dancing', emoji: '💃', label: '춤' }
  ];

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-base font-medium text-white mb-3">🎭 FBX 애니메이션</h3>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {animations.map(animation => (
          <button
            key={animation.key}
            onClick={() => onAnimationSelect(animation.key)}
            disabled={isLoading}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${
              currentAnimation === animation.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="text-lg">{animation.emoji}</span>
            <span className="flex-1 text-left">{animation.label}</span>
            {currentAnimation === animation.key && (
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            )}
          </button>
        ))}
      </div>
      
      {isLoading && (
        <div className="text-center text-blue-400 text-xs flex items-center justify-center gap-2">
          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span>애니메이션 로딩 중...</span>
        </div>
      )}
    </div>
  );
};

export default FBXAnimationPanel;
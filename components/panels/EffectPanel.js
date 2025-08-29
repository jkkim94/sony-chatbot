import React from 'react';

const EffectPanel = ({ effectStates, onEffectToggle, disabled = false }) => {
  const effects = [
    { id: 'handTrail', name: '손 궤적', emoji: '✋' },
    { id: 'particle', name: '파티클', emoji: '✨' },
    { id: 'eyeTracking', name: '눈동자 추적', emoji: '👁️' }
  ];

  return (
    <div>
      <h3 className="text-base font-medium text-white mb-3">
        ✨ 효과
        {disabled && (
          <span className="ml-2 text-xs text-yellow-400 animate-pulse">
            🔄 로딩 중
          </span>
        )}
      </h3>
      
      <div className="space-y-3">
        {effects.map(effect => (
          <label key={effect.id} className={`flex items-center justify-between ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}>
            <div className="flex items-center space-x-2">
              <span className="text-lg">{effect.emoji}</span>
              <span className="text-sm text-white">{effect.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={effectStates?.[effect.id] || false}
                onChange={() => !disabled && onEffectToggle?.(effect.id)}
                disabled={disabled}
                className={`w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 ${
                  disabled ? 'cursor-not-allowed opacity-50' : ''
                }`}
              />
              <span className={`text-xs px-2 py-1 rounded ${
                effectStates?.[effect.id] 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {effectStates?.[effect.id] ? 'ON' : 'OFF'}
              </span>
            </div>
          </label>
        ))}
      </div>
      
      {/* 🔒 로딩 중 비활성화 안내 */}
      {disabled && (
        <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded text-xs text-yellow-400">
          <div className="flex items-center gap-2">
            <span>⚠️ 모델 전환 중 - 효과 설정이 비활성화됩니다</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EffectPanel;
import React, { useState, useEffect } from 'react';

// 슬라이더 스타일 CSS
const sliderStyles = `
  .rendering-slider::-webkit-slider-thumb {
    appearance: none;
    height: 18px;
    width: 18px;
    border-radius: 50%;
    background: #ef4444;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
    transition: all 0.2s ease;
  }
  
  .rendering-slider::-webkit-slider-thumb:hover {
    background: #dc2626;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
  }
  
  .rendering-slider::-moz-range-thumb {
    height: 18px;
    width: 18px;
    border-radius: 50%;
    background: #ef4444;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
    transition: all 0.2s ease;
  }
  
  .rendering-slider::-webkit-slider-track {
    height: 6px;
    border-radius: 3px;
    background: transparent;
  }
  
  .rendering-slider::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: transparent;
  }
`;

const RenderingPanel = ({
  // 렌더링 품질 설정
  pixelRatio = 1.0,
  onPixelRatioChange,
  
  // 그림자 품질 설정 (1024로 고정)
  shadowMapSize = 1024,
  onShadowMapSizeChange,
  
  // 기본 안티앨리어싱 설정
  antialias = true,
  onAntialiasChange,
  
  // 후처리 안티앨리어싱 설정
  taaEnabled = true,
  onTAAEnabledChange,
  taaSampleLevel = 2,
  onTAASampleLevelChange,
  fxaaEnabled = true,
  onFXAAEnabledChange,
  
  // 렌더링 모드 (표준/성능/고품질만)
  renderingMode = 'standard',
  onRenderingModeChange,
  
  // WebGPU 관련 (우선 사용)
  preferWebGPU = true,
  onPreferWebGPUChange,
  rendererType = 'WebGL',
  
  // 패널 표시 여부
  isVisible = true
}) => {
  const [activeTab, setActiveTab] = useState('basic');

  // JSON에서 프리셋 데이터 로드
  useEffect(() => {
    if (window.renderingManager) {
      // 렌더링 모드 로드
      const modes = window.renderingManager.getRenderingModes();
      if (modes.length > 0) {
        setRenderingModes(modes);
      }

      // 후처리 프리셋 로드
      const presets = window.renderingManager.getPostProcessingPresets();
      if (presets.length > 0) {
        setPostProcessingPresets(presets);
      }
    }
  }, []);

  // JSON에서 렌더링 모드 옵션 가져오기 (표준/성능/고품질만)
  const [renderingModes, setRenderingModes] = useState([
    {
      id: 'standard',
      name: '표준',
      emoji: '🎯',
      description: '균형잡힌 렌더링 품질'
    },
    {
      id: 'performance',
      name: '성능',
      emoji: '⚡',
      description: '빠른 렌더링 (낮은 품질)'
    },
    {
      id: 'quality',
      name: '고품질',
      emoji: '💎',
      description: '최고 품질 (느린 렌더링)'
    }
  ]);

  // 후처리 프리셋 가져오기
  const [postProcessingPresets, setPostProcessingPresets] = useState([
    {
      id: 'cinema',
      name: '영화급',
      emoji: '🎬',
      description: '최고 품질 (성능 85%)',
      taaEnabled: true,
      taaSampleLevel: 5,
      fxaaEnabled: true
    },
    {
      id: 'game',
      name: '게임',
      emoji: '🎮',
      description: '균형 설정 (성능 90%)',
      taaEnabled: true,
      taaSampleLevel: 2,
      fxaaEnabled: true
    },
    {
      id: 'performance',
      name: '성능',
      emoji: '⚡',
      description: '후처리 없음 (성능 100%)',
      taaEnabled: false,
      taaSampleLevel: 0,
      fxaaEnabled: false
    }
  ]);

  // 픽셀 비율 라벨
  const getPixelRatioLabel = (ratio) => {
    if (ratio <= 0.5) return '매우 낮음';
    if (ratio <= 1.0) return '보통';
    if (ratio <= 1.5) return '높음';
    if (ratio <= 2.0) return '최고';
    if (ratio <= 3.0) return '극고해상도';
    return '슈퍼샘플링';
  };

  if (!isVisible) return null;

  return (
    <>
      <style>{sliderStyles}</style>
      <div className="p-4 space-y-4">
        <h3 className="text-base font-medium text-white mb-3">🎮 렌더링 제어</h3>
        
        {/* 탭 네비게이션 */}
        <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg mb-4">
          {[
            { key: 'basic', label: '기본', emoji: '🎯' },
            { key: 'postprocessing', label: '후처리', emoji: '🎭' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center space-x-1 px-2 py-1 rounded-md text-xs transition-colors ${
                activeTab === tab.key 
                  ? 'bg-red-600 text-white' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 기본 렌더링 탭 */}
        {activeTab === 'basic' && (
        <div>
            {/* 렌더러 정보 */}
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-500/30">
              <h4 className="text-white text-xs font-medium mb-2 text-center">
                🚀 렌더러 정보
              </h4>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">현재 렌더러:</span>
                <span className={`px-2 py-1 rounded ${
                  rendererType === 'WebGPU' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 text-white'
                }`}>
                  {rendererType}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-gray-300">WebGPU 우선:</span>
                <button
                  onClick={() => onPreferWebGPUChange?.(!preferWebGPU)}
                  className={`w-8 h-4 rounded-full transition-all duration-300 ${
                    preferWebGPU
                      ? 'bg-green-500 shadow-lg shadow-green-500/50'
                      : 'bg-gray-600 shadow-lg shadow-gray-600/50'
                  }`}
                >
                  <div
                    className={`w-3 h-3 bg-white rounded-full transition-all duration-300 ${
                      preferWebGPU ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              <div className="text-xs text-green-400 mt-2 text-center">
                🚀 WebGPU 사용 시 성능이 크게 향상됩니다!
              </div>
            </div>

            {/* 렌더링 모드 선택 */}
            <div className="mb-4">
              <h4 className="text-white text-xs font-medium mb-2 text-center">
                🎨 렌더링 모드
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {renderingModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      onRenderingModeChange?.(mode.id);
                      
                      // JSON 프리셋 적용
                      if (window.renderingManager) {
                        window.renderingManager.applyRenderingModePreset(mode.id);
                      }
                    }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-all duration-300 ${
                      renderingMode === mode.id
                        ? 'bg-red-600 text-white ring-2 ring-red-400 transform scale-105'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white hover:scale-102'
                    }`}
                  >
                    <span className="text-lg">{mode.emoji}</span>
                    <span>{mode.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 픽셀 비율 설정 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white text-xs font-medium">📐 픽셀 비율</h4>
                <span className="text-red-400 text-xs bg-red-900/30 px-2 py-1 rounded">
                  {pixelRatio.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={pixelRatio}
                onChange={(e) => {
                  const newValue = parseFloat(e.target.value);
                  onPixelRatioChange?.(newValue);
                }}
                className="w-full h-2 bg-gradient-to-r from-red-900 to-red-400 rounded-lg appearance-none cursor-pointer rendering-slider"
              />
              <div className="text-xs text-red-300/70 mt-1 text-center">
                {getPixelRatioLabel(pixelRatio)}
              </div>
            </div>

            {/* 후처리 안티앨리어싱 설정 */}
            <div className="mb-4">
              <h4 className="text-white text-xs font-medium mb-3 text-center">
                ✨ 후처리 안티앨리어싱
              </h4>
              
              {/* TAA (Temporal Anti-Aliasing) */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white text-xs">🕒 TAA (시간적 안티앨리어싱)</label>
                  <button
                    onClick={() => {
                      const newValue = !taaEnabled;
                      onTAAEnabledChange?.(newValue);
                    }}
                    className={`w-10 h-5 rounded-full transition-all duration-300 ${
                      taaEnabled
                        ? 'bg-green-500 shadow-lg shadow-green-500/50'
                        : 'bg-gray-600 shadow-lg shadow-gray-600/50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                        taaEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                
                {/* TAA Sample Level */}
                {taaEnabled && (
                  <div className="ml-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-300">샘플 레벨</span>
                      <span className="text-xs text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded">
                        {taaSampleLevel}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="1"
                      value={taaSampleLevel}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value);
                        onTAASampleLevelChange?.(newValue);
                      }}
                      className="w-full h-1.5 bg-gradient-to-r from-red-900 to-red-400 rounded-lg appearance-none cursor-pointer rendering-slider"
                    />
                    <div className="text-xs text-red-300/60 mt-1 text-center">
                      {taaSampleLevel === 0 ? '비활성화' : 
                       taaSampleLevel <= 2 ? '부드러움' : 
                       taaSampleLevel <= 4 ? '매우 부드러움' : '최고 품질'}
                    </div>
                  </div>
                )}
              </div>
              
              {/* FXAA (Fast Approximate Anti-Aliasing) */}
              <div className="mb-2">
                <div className="flex items-center justify-between">
                  <label className="text-white text-xs">⚡ FXAA (빠른 안티앨리어싱)</label>
                  <button
                    onClick={() => {
                      const newValue = !fxaaEnabled;
                      onFXAAEnabledChange?.(newValue);
                    }}
                    className={`w-10 h-5 rounded-full transition-all duration-300 ${
                      fxaaEnabled
                        ? 'bg-green-500 shadow-lg shadow-green-500/50'
                        : 'bg-gray-600 shadow-lg shadow-gray-600/50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                        fxaaEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-1 text-center">
                  {(taaEnabled || fxaaEnabled) ? '안티앨리어싱 활성화됨' : '안티앨리어싱 비활성화됨'}
                </div>
              </div>
            </div>

            {/* 그림자 품질 설정 (1024로 고정) */}
            <div className="mb-4">
              <h4 className="text-white text-xs font-medium mb-2 text-center">
                🌫️ 그림자 품질 (고정)
              </h4>
              <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-700/30">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">🌤️</span>
                  <span className="text-white text-sm font-medium">보통 (1024)</span>
                  <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
                    고정됨
                  </span>
                </div>
                <div className="text-xs text-blue-400/70 mt-2 text-center">
                  성능 최적화를 위해 그림자 품질이 1024로 고정되었습니다
                </div>
              </div>
            </div>

            {/* 기본 안티앨리어싱 */}
            <div className="mb-4">
              <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-700/30">
                <div>
                  <span className="text-green-300 text-sm font-medium">💫 기본 안티앨리어싱</span>
                  <div className="text-xs text-green-400/70 mt-1">MSAA (항상 활성화)</div>
                </div>
                <div className="px-3 py-1 bg-green-600 text-white text-xs rounded">
                  항상 ON
                </div>
              </div>
            </div>

            {/* 하단 정보 */}
            <div className="mt-4 pt-3 border-t border-red-500/20">
              <div className="text-center">
                <div className="text-xs text-red-400/80 mb-1">
                  🎮 렌더링 제어
                </div>
                <div className="text-xs text-white/60">
                  WebGPU 우선 사용으로 성능을 극대화하세요
                </div>
              </div>
            </div>
            </div>
            )}

        {/* 후처리 탭 */}
        {activeTab === 'postprocessing' && (
        <div>
          <h4 className="text-sm font-medium text-white mb-3">🎭 후처리 프리셋</h4>
          <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-700/30 space-y-4">
                <div className="text-xs text-gray-400 mb-3">
                  JSON 설정에서 정의된 후처리 프리셋을 적용합니다
                </div>
                
                {/* 후처리 프리셋 선택 */}
                <div className="space-y-4">
                  {postProcessingPresets.map((preset) => (
                    <div key={preset.id} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{preset.emoji}</span>
                          <span className="text-sm font-medium text-white">{preset.name}</span>
                        </div>
                        <button
                          onClick={() => {
                            // UI 콜백 호출
                            if (onTAAEnabledChange) onTAAEnabledChange(preset.taaEnabled);
                            if (onTAASampleLevelChange) onTAASampleLevelChange(preset.taaSampleLevel);
                            if (onFXAAEnabledChange) onFXAAEnabledChange(preset.fxaaEnabled);
                            
                            // JSON 프리셋 적용
                            if (window.renderingManager) {
                              window.renderingManager.applyPostProcessingPreset(preset.id);
                            }
                          }}
                          className={`px-3 py-1 text-xs rounded transition-all duration-300 ${
                            preset.id === 'cinema' ? 'bg-green-600 text-white hover:bg-green-700' :
                            preset.id === 'game' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                            'bg-gray-600 text-white hover:bg-gray-700'
                          }`}
                        >
                          적용
                        </button>
                      </div>
                      <div className="text-xs text-gray-400 mb-2">{preset.description}</div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>TAA: {preset.taaEnabled ? 'ON' : 'OFF'} {preset.taaEnabled && `(Level: ${preset.taaSampleLevel})`}</div>
                        <div>FXAA: {preset.taaEnabled ? 'ON' : 'OFF'}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* JSON 설정 정보 */}
                <div className="pt-3 border-t border-gray-700">
                  <div className="text-xs text-gray-300 mb-2">📁 JSON 설정 정보:</div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>• 프리셋은 <code>rendering-default.json</code>에서 정의됩니다</div>
                    <div>• 프리셋 적용 시 모든 관련 설정이 자동으로 조정됩니다</div>
                  </div>
                </div>
              </div>
            </div>
            )}
      </div>
    </>
  );
};

export default RenderingPanel;
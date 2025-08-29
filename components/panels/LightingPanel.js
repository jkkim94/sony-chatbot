"use client";

import { useState, useEffect } from 'react';

/**
 * LightingPanel.js
 * 단순화된 조명 제어 패널 - 직관적이고 쉬운 조명 조정
 */

export default function LightingPanel({ 
  lightingSettings, 
  onLightingPreset, 
  onLightChange,
  onAdvancedLightChange // 새로운 4가지 조명 제어용 콜백
}) {
  const [activeTab, setActiveTab] = useState('overall');
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => { setMounted(true); }, []);

  // 🎯 개별 조명 제어 컴포넌트
  const LightControl = ({ lightType, lightConfig, title, icon }) => {
    if (!lightConfig) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
            <span>{icon}</span>
            <span>{title}</span>
          </h4>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={lightConfig.enabled}
              onChange={(e) => onAdvancedLightChange(lightType, 'enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {lightConfig.enabled && (
          <div className="space-y-2 pl-4">
            {/* 강도 조절 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">강도</label>
                <span className="text-xs text-gray-400">
                  {mounted ? lightConfig.intensity.toFixed(1) : ''}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={mounted ? lightConfig.intensity : 0}
                onChange={(e) => onAdvancedLightChange(lightType, 'intensity', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 색상 조절 (RGB 슬라이더) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">색상</label>
                <div 
                  className="w-4 h-4 rounded border border-gray-600"
                  style={{ 
                    backgroundColor: `rgb(${Math.round(lightConfig.color[0] * 255)}, ${Math.round(lightConfig.color[1] * 255)}, ${Math.round(lightConfig.color[2] * 255)})` 
                  }}
                />
              </div>
              <div className="space-y-1">
                {['R', 'G', 'B'].map((channel, index) => (
                  <div key={channel} className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 w-3">{channel}</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={mounted ? lightConfig.color[index] : 0}
                      onChange={(e) => {
                        const newColor = [...lightConfig.color];
                        newColor[index] = parseFloat(e.target.value);
                        onAdvancedLightChange(lightType, 'color', newColor);
                      }}
                      className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs text-gray-400 w-8">
                      {mounted ? Math.round(lightConfig.color[index] * 255) : 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 위치 조절 (Spot Light와 Ambient Light가 아닌 경우) */}
            {lightType !== 'spot' && lightType !== 'ambient' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">위치</label>
                </div>
                <div className="space-y-1">
                  {['X', 'Y', 'Z'].map((axis, index) => (
                    <div key={axis} className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-3">{axis}</span>
                      <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.1"
                        value={mounted ? lightConfig.position[index] : 0}
                        onChange={(e) => {
                          const newPosition = [...lightConfig.position];
                          newPosition[index] = parseFloat(e.target.value);
                          onAdvancedLightChange(lightType, 'position', newPosition);
                        }}
                        className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs text-gray-400 w-8">
                        {mounted ? lightConfig.position[index].toFixed(1) : 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spot Light 전용 설정 */}
            {lightType === 'spot' && (
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-400">각도</label>
                    <span className="text-xs text-gray-400">
                      {mounted ? Math.round((lightConfig.angle * 180) / Math.PI) : 0}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="1"
                    value={mounted ? (lightConfig.angle * 180) / Math.PI : 0}
                    onChange={(e) => onAdvancedLightChange(lightType, 'angle', (parseFloat(e.target.value) * Math.PI) / 180)}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-400">부드러움</label>
                    <span className="text-xs text-gray-400">
                      {mounted ? lightConfig.penumbra.toFixed(1) : 0}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={mounted ? lightConfig.penumbra : 0}
                    onChange={(e) => onAdvancedLightChange(lightType, 'penumbra', parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 🎯 전체 조정 컴포넌트
  const OverallControl = ({ property, label, icon, min = 0, max = 3, step = 0.1 }) => {
    const value = lightingSettings?.overall?.[property] || 1;
    
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm text-gray-300 flex items-center space-x-1">
            <span>{icon}</span>
            <span>{label}</span>
          </label>
          <span className="text-xs text-gray-400">
            {mounted ? value.toFixed(1) : ''}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={mounted ? value : 1}
          onChange={(e) => onLightChange(property, parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 탭 네비게이션 */}
      <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
        {[
          { id: 'overall', label: '전체', icon: '🎨' },
          { id: 'directional', label: '주광', icon: '☀️' },
          { id: 'point', label: '점광', icon: '💡' },
          { id: 'spot', label: '스팟', icon: '🔦' },
          { id: 'ambient', label: '환경', icon: '🌅' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div className="space-y-4">
        {activeTab === 'overall' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-300">🎨 전체 조명 조정</h4>
            <div className="space-y-3">
              <OverallControl 
                property="contrast" 
                label="대비" 
                icon="🔆" 
                min={0.5} 
                max={2.0} 
              />
              <OverallControl 
                property="brightness" 
                label="밝기" 
                icon="💡" 
                min={0.3} 
                max={2.0} 
              />
              <OverallControl 
                property="warmth" 
                label="색온도" 
                icon="🌡️" 
                min={0.5} 
                max={1.5} 
              />
              <OverallControl 
                property="exposure" 
                label="노출" 
                icon="📸" 
                min={0.5} 
                max={2.0} 
              />
            </div>
          </div>
        )}

        {activeTab === 'directional' && (
          <LightControl 
            lightType="directional"
            lightConfig={lightingSettings?.directional}
            title="방향광 (주광원)"
            icon="☀️"
          />
        )}

        {activeTab === 'point' && (
          <LightControl 
            lightType="point"
            lightConfig={lightingSettings?.point}
            title="점광원"
            icon="💡"
          />
        )}

        {activeTab === 'spot' && (
          <LightControl 
            lightType="spot"
            lightConfig={lightingSettings?.spot}
            title="스팟 조명"
            icon="🔦"
          />
        )}

        {activeTab === 'ambient' && (
          <LightControl 
            lightType="ambient"
            lightConfig={lightingSettings?.ambient}
            title="환경광"
            icon="🌅"
          />
        )}
      </div>

      {/* 프리셋 버튼들 */}
      <div className="pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-3">🎭 조명 프리셋</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'outdoor', label: '야외', icon: '🌞' },
            { name: 'indoor', label: '실내', icon: '🏠' },
            { name: 'studio', label: '스튜디오', icon: '🎬' },
            { name: 'dramatic', label: '드라마틱', icon: '🎭' }
          ].map(preset => (
            <button
              key={preset.name}
              onClick={() => onLightingPreset(preset.name)}
              className="flex items-center justify-center space-x-2 px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

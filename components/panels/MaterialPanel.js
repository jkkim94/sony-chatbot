/**
 * MaterialPanel.js
 * 개별 메터리얼 설정을 위한 통합 패널
 */

import React, { useState, useEffect } from 'react';

export default function MaterialPanel({ materialManager, talkingHeadRef, currentModel, disabled }) {
  const [selectedCategory, setSelectedCategory] = useState('skin');
  const [localSettings, setLocalSettings] = useState({});

  // 사용 가능한 카테고리 목록
  const availableCategories = materialManager ? materialManager.getAllCategories() : [];
  
  // 디버깅 정보
  console.log('[MaterialPanel] Debug Info:', {
    materialManager: !!materialManager,
    availableCategories,
    selectedCategory,
    currentModel
  });

  // JSON 동기화 확인을 위한 디버깅
  useEffect(() => {
    if (materialManager && selectedCategory) {
      const currentSettings = materialManager.getCurrentSettings();
      console.log('[MaterialPanel] JSON 동기화 확인:', {
        category: selectedCategory,
        currentSettings: currentSettings.individualMaterial?.[selectedCategory] || {},
        localSettings
      });
    }
  }, [materialManager, selectedCategory, localSettings]);

  // 선택된 카테고리의 현재 설정 가져오기
  useEffect(() => {
    if (materialManager && selectedCategory) {
      const currentSettings = materialManager.getCurrentSettings();
      const categorySettings = currentSettings.individualMaterial?.[selectedCategory] || {};
      setLocalSettings(categorySettings);
    }
  }, [materialManager, selectedCategory]);

  // 카테고리 변경 시 설정 로드
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    if (materialManager) {
      const currentSettings = materialManager.getCurrentSettings();
      const categorySettings = currentSettings.individualMaterial?.[category] || {};
      setLocalSettings(categorySettings);
      
      // JSON 로드 확인
      console.log(`[MaterialPanel] 카테고리 변경: ${category}`);
      console.log('[MaterialPanel] JSON에서 로드된 설정:', {
        category,
        categorySettings,
        allSettings: currentSettings.individualMaterial
      });
    }
  };

  // 개별 메터리얼 설정 변경
  const handleCategorySettingChange = (property, value) => {
    if (!materialManager) return;

    const newSettings = { ...localSettings, [property]: value };
    setLocalSettings(newSettings);
    
    // MaterialManager에 즉시 적용
    materialManager.updateIndividualSetting(selectedCategory, property, value);
    
    // JSON 동기화 확인
    console.log(`[MaterialPanel] 설정 변경: ${selectedCategory}.${property} = ${value}`);
    console.log('[MaterialPanel] JSON 동기화 상태:', {
      category: selectedCategory,
      property,
      value,
      localSettings: newSettings,
      materialManagerSettings: materialManager.getCurrentSettings().individualMaterial?.[selectedCategory] || {}
    });
  };



  if (!materialManager) {
    return (
      <div className="p-4 text-center text-gray-400">
        <div className="mb-2">Material Manager가 로드되지 않았습니다.</div>
        <div className="text-xs text-gray-500">
          materialManager prop이 전달되지 않았습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">🎨 메터리얼 설정</h3>
        <div className="text-sm text-gray-400">
          {currentModel ? `현재: ${currentModel}` : '모델 없음'}
        </div>
      </div>

      {/* JSON 동기화 상태 표시 */}
      <div className="p-2 bg-blue-900/20 border border-blue-700/30 rounded text-center">
        <div className="text-xs text-blue-300">📊 JSON 동기화 상태</div>
        <div className="text-xs text-blue-400 mt-1">
          카테고리: {selectedCategory} | 
          설정된 속성: {Object.keys(localSettings).length}개
        </div>
        {Object.keys(localSettings).length > 0 && (
          <div className="text-xs text-blue-500 mt-1">
            {Object.entries(localSettings).map(([key, value]) => 
              `${key}: ${typeof value === 'number' ? value.toFixed(2) : value}`
            ).join(' | ')}
          </div>
        )}
      </div>

      {/* 카테고리 선택 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">카테고리 선택</label>
        {availableCategories.length > 0 ? (
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {availableCategories.map(category => (
              <option key={category} value={category}>
                {category === 'skin' ? '피부' :
                 category === 'eyes' ? '눈' :
                 category === 'teeth' ? '치아' :
                 category === 'tongue' ? '혀' :
                 category === 'nails' ? '손톱' :
                 category === 'eyelashes' ? '속눈썹' :
                 category === 'hair' ? '머리카락' :
                 category === 'eyebrows' ? '눈썹' :
                 category === 'lips' ? '입술' :
                 category === 'clothing' ? '의상' :
                 category === 'accessories' ? '액세서리' :
                 category}
              </option>
            ))}
          </select>
        ) : (
          <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded text-center">
            <div className="text-yellow-300 text-sm">카테고리를 찾을 수 없습니다</div>
            <div className="text-yellow-500 text-xs mt-1">
              모델이 로드되지 않았거나 MaterialManager가 초기화되지 않았습니다.
            </div>
          </div>
        )}
      </div>

      {/* 선택된 카테고리의 메터리얼 설정 */}
      {selectedCategory && (
        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-300">
            {selectedCategory === 'skin' ? '피부' :
             selectedCategory === 'eyes' ? '눈' :
             selectedCategory === 'teeth' ? '치아' :
             selectedCategory === 'tongue' ? '혀' :
             selectedCategory === 'nails' ? '손톱' :
             selectedCategory === 'eyelashes' ? '속눈썹' :
             selectedCategory === 'hair' ? '머리카락' :
             selectedCategory === 'eyebrows' ? '눈썹' :
             selectedCategory === 'lips' ? '입술' :
             selectedCategory === 'clothing' ? '의상' :
             selectedCategory === 'accessories' ? '액세서리' :
             selectedCategory} 메터리얼 설정
          </div>

          {/* JSON에 정의된 메터리얼 속성들 (정확한 순서) */}
          <div className="space-y-3">
            {/* 1. Metalness */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-xs text-gray-300">Metalness</label>
                <span className="text-xs text-gray-400">{localSettings.metalness?.toFixed(2) || '0.00'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localSettings.metalness || 0}
                onChange={(e) => handleCategorySettingChange('metalness', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-gray-500">0: 비금속 | 1: 완전 금속</div>
            </div>

            {/* 2. Roughness */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-xs text-gray-300">Roughness</label>
                <span className="text-xs text-gray-400">{localSettings.roughness?.toFixed(2) || '0.80'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localSettings.roughness || 0.8}
                onChange={(e) => handleCategorySettingChange('roughness', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-gray-500">0: 매끄러움 | 1: 거칠음</div>
            </div>

            {/* 3. Clearcoat */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-xs text-gray-300">Clearcoat</label>
                <span className="text-xs text-gray-400">{localSettings.clearcoat?.toFixed(2) || '0.00'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localSettings.clearcoat || 0}
                onChange={(e) => handleCategorySettingChange('clearcoat', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-gray-500">0: 없음 | 1: 강한 코팅</div>
            </div>

            {/* 4. Environment Map Intensity */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-xs text-gray-300">Environment Map Intensity</label>
                <span className="text-xs text-gray-400">{localSettings.envMapIntensity?.toFixed(2) || '0.00'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={localSettings.envMapIntensity || 0}
                onChange={(e) => handleCategorySettingChange('envMapIntensity', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-gray-500">환경 반사 강도</div>
            </div>

            {/* 5. Specular Intensity */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-xs text-gray-300">Specular Intensity</label>
                <span className="text-xs text-gray-400">{localSettings.specularIntensity?.toFixed(2) || '0.00'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localSettings.specularIntensity || 0}
                onChange={(e) => handleCategorySettingChange('specularIntensity', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-gray-500">반사광 강도</div>
            </div>

            {/* 6. Sheen */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-xs text-gray-300">Sheen</label>
                <span className="text-xs text-gray-400">{localSettings.sheen?.toFixed(2) || '0.00'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localSettings.sheen || 0}
                onChange={(e) => handleCategorySettingChange('sheen', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-gray-500">광택 효과</div>
            </div>

            {/* 7. Reflectivity */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-xs text-gray-300">Reflectivity</label>
                <span className="text-xs text-gray-400">{localSettings.reflectivity?.toFixed(2) || '0.00'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localSettings.reflectivity || 0}
                onChange={(e) => handleCategorySettingChange('reflectivity', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-gray-500">반사율</div>
            </div>
          </div>

          {/* JSON 동기화 상태 표시 */}
          <div className="text-xs text-gray-500 mt-2 p-2 bg-blue-700/30 rounded border border-blue-600/30">
            💡 JSON 파일과 완벽 동기화: {Object.keys(localSettings).length}개 속성
            <div className="text-xs text-blue-400 mt-1">
              순서: Metalness → Roughness → Clearcoat → EnvMap → Specular → Sheen → Reflectivity
            </div>
          </div>

          {/* Alpha Hash (머리카락, 속눈썹 전용) */}
          {['hair', 'eyelashes'].includes(selectedCategory) && (
            <>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300">Alpha Hash 활성화</label>
                  <input
                    type="checkbox"
                    checked={localSettings.alphaHash || false}
                    onChange={(e) => handleCategorySettingChange('alphaHash', e.target.checked)}
                    disabled={disabled}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
              {localSettings.alphaHash && (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-xs text-gray-300">Alpha Hash Scale</label>
                    <span className="text-xs text-gray-400">{localSettings.alphaHashScale?.toFixed(2) || '0.30'}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={localSettings.alphaHashScale || 0.3}
                    onChange={(e) => handleCategorySettingChange('alphaHashScale', parseFloat(e.target.value))}
                    disabled={disabled}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-500">낮을수록 부드러운 투명도, 높을수록 선명한 투명도</div>
                </div>
              )}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-gray-300">Alpha Test</label>
                  <span className="text-xs text-gray-400">{localSettings.alphaTest?.toFixed(2) || '0.00'}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={localSettings.alphaTest || 0}
                  onChange={(e) => handleCategorySettingChange('alphaTest', parseFloat(e.target.value))}
                  disabled={disabled}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="text-xs text-gray-500">0: 투명도 없음 | 0.5: 표준 | 1.0: 완전 투명</div>
              </div>
            </>
          )}


        </div>
      )}
    </div>
  );
}

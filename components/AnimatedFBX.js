import { useEffect, useState } from 'react';
import { receiveAnimationData } from './TalkingHead';
import FBXViewer from './ui/FBXViewer';
// FBXAnimationPanel은 더 이상 사용하지 않음 (왼쪽 사이드바에서 제어)

const AnimatedFBX = ({ 
  currentAnimation: externalCurrentAnimation, 
  currentModel: externalCurrentModel,
  onAnimationChange, 
  onLoadingChange,
  isModelLoading
}) => {
  const [currentAnimation, setCurrentAnimation] = useState(externalCurrentAnimation || 'Idle');
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState(externalCurrentModel || 'brunette');

  // 애니메이션 데이터 전달 함수
  const handleAnimationDataExtract = (data) => {
    // API 응답이 있는지 확인
    if (typeof window !== 'undefined' && window.animationData?.result) {
      return; // API 응답이 있으면 FBX 애니메이션 중단
    }
    receiveAnimationData(data);
  };

  // 외부 애니메이션 상태 동기화
  useEffect(() => {
    if (externalCurrentAnimation && externalCurrentAnimation !== currentAnimation) {
      setCurrentAnimation(externalCurrentAnimation);
    }
  }, [externalCurrentAnimation]);

  // 외부 모델 상태 동기화 (모델 로딩 완료 후에만 실행)
  useEffect(() => {
    if (externalCurrentModel && externalCurrentModel !== currentModel && !isModelLoading) {
      console.log('FBX 뷰어 모델 동기화 (로딩 완료 후):', externalCurrentModel);
      setCurrentModel(externalCurrentModel);
    }
  }, [externalCurrentModel, isModelLoading]);

  // 애니메이션 선택 핸들러
  const handleAnimationSelect = (animationName) => {
    if (animationName !== currentAnimation && !isLoading) {
      console.log('애니메이션 변경:', animationName);
      setCurrentAnimation(animationName);
      // 외부로 상태 전달
      if (onAnimationChange) {
        onAnimationChange(animationName);
      }
    }
  };

  // 애니메이션 변경 핸들러 (자동 전환용)
  const handleAnimationChange = (animationName) => {
    setCurrentAnimation(animationName);
  };

  // 로딩 상태 변경 핸들러
  const handleLoadingChange = (loading) => {
    setIsLoading(loading);
    // 외부로 로딩 상태 전달
    if (onLoadingChange) {
      onLoadingChange(loading);
    }
  };

  // 모델 변경 핸들러
  const handleModelChange = (modelName) => {
    console.log('모델 변경:', modelName);
    setCurrentModel(modelName);
  };

  // 전역에서 모델 변경 가능하도록 설정
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.changeModel = handleModelChange;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.changeModel;
      }
    };
  }, []);

  // 애니메이션 타입 변경 감지 (외부에서 오는 이벤트)
  useEffect(() => {
    const handleAnimationChangeEvent = (event) => {
      const { animationType } = event.detail;
      if (animationType && animationType !== currentAnimation) {
        console.log('외부에서 새로운 애니메이션 타입 감지:', animationType);
        setCurrentAnimation(animationType);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('animationChange', handleAnimationChangeEvent);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('animationChange', handleAnimationChangeEvent);
      }
    };
  }, [currentAnimation]);

  return (
    <div className="relative w-full h-full">
      <FBXViewer
        currentAnimation={currentAnimation}
        currentModel={currentModel}
        onAnimationChange={handleAnimationChange}
        onLoadingChange={handleLoadingChange}
        onAnimationDataExtract={handleAnimationDataExtract}
      />
      
      {/* FBX 애니메이션 제어는 왼쪽 사이드바에서 처리됨 */}
    </div>
  );
};

export default AnimatedFBX; 
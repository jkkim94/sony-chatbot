import { useEffect, useState } from 'react';

const Toast = ({ message, duration = 3000, onClose }) => {
  const [show, setShow] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 컴포넌트가 마운트되면 즉시 표시
    setShow(true);

    // 지정된 시간 후 페이드 아웃 시작
    const timer = setTimeout(() => {
      setIsExiting(true);
      // 페이드 아웃 애니메이션 후 컴포넌트 제거
      setTimeout(() => {
        setShow(false);
        onClose?.();
      }, 300);
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, onClose]);

  if (!show) return null;

  return (
    <div 
      className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-50 w-full px-4"
      style={{
        animation: !isExiting ? 'fadeIn 0.3s ease-out' : 'fadeOut 0.3s ease-in'
      }}
    >
      <div className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 max-w-md mx-auto border border-indigo-400">
        <div className="flex-1 font-medium">{message}</div>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => {
              setShow(false);
              onClose?.();
            }, 300);
          }}
          className="text-indigo-200 hover:text-white transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Toast; 
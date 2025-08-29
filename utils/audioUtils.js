export const playAudio = (base64Audio) => {
  return new Promise((resolve, reject) => {
    if (!base64Audio) {
      console.error('오디오 데이터가 없습니다');
      return resolve();
    }
    
    try {
      // base64 데이터를 디코딩
      const audioData = atob(base64Audio);
      
      // 바이너리 데이터를 Uint8Array로 변환
      const arrayBuffer = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        arrayBuffer[i] = audioData.charCodeAt(i);
      }
      
      // 오디오 컨텍스트 생성
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      console.log('오디오 디코딩 시작...');
      
      // 오디오 디코딩
      audioContext.decodeAudioData(
        arrayBuffer.buffer,
        (buffer) => {
          console.log('오디오 디코딩 성공, 재생 시작');
          
          // 소스 노드 생성 및 버퍼 연결
          const source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContext.destination);
          
          // 재생 완료 이벤트
          source.onended = () => {
            console.log('오디오 재생 완료');
            resolve();
          };
          
          // 오류 처리
          source.onerror = (err) => {
            console.error('오디오 재생 오류:', err);
            reject(err);
          };
          
          // 재생 시작
          source.start(0);
        },
        (err) => {
          console.error('오디오 디코딩 오류:', err);
          reject(err);
        }
      );
    } catch (error) {
      console.error('오디오 처리 오류:', error);
      reject(error);
    }
  });
};

export const playAudioWithElement = (base64Audio) => {
  return new Promise((resolve, reject) => {
    if (!base64Audio) {
      console.error('오디오 데이터가 없습니다');
      return resolve();
    }
    
    try {
      // base64 데이터로 데이터 URL 생성
      const audioSrc = `data:audio/mp3;base64,${base64Audio}`;
      
      // 오디오 엘리먼트 생성
      const audio = new Audio(audioSrc);
      
      // 이벤트 리스너 설정
      audio.onended = () => {
        console.log('오디오 재생 완료 (엘리먼트 방식)');
        resolve();
      };
      
      audio.onerror = (err) => {
        console.error('오디오 재생 오류 (엘리먼트 방식):', err);
        reject(err);
      };
      
      // 재생 시작
      console.log('오디오 재생 시작 (엘리먼트 방식)');
      audio.play().catch(err => {
        console.error('오디오 재생 실패 (엘리먼트 방식):', err);
        reject(err);
      });
    } catch (error) {
      console.error('오디오 처리 오류 (엘리먼트 방식):', error);
      reject(error);
    }
  });
};

// 전역 AudioContext를 미리 생성하여 초기화 지연 방지
let globalAudioContext = null;

// AudioContext 초기화 함수
const initAudioContext = () => {
  if (!globalAudioContext) {
    try {
      // AudioContext 생성
      globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('AudioContext 초기화 완료');
    } catch (error) {
      console.error('AudioContext 초기화 실패:', error);
    }
  }
  return globalAudioContext;
};

// 오디오 볼륨 분석을 위한 전역 변수
let audioAnalyser = null;
let audioDataArray = null;
let audioVolume = 1.0;

// 현재 오디오 볼륨 값 가져오기
export const getCurrentAudioVolume = () => {
  if (audioAnalyser && audioDataArray) {
    audioAnalyser.getByteFrequencyData(audioDataArray);
    
    // 주파수 데이터 평균 계산
    let sum = 0;
    for (let i = 0; i < audioDataArray.length; i++) {
      sum += audioDataArray[i];
    }
    const average = sum / audioDataArray.length;
    
    // 0-255 범위를 0-1 범위로 정규화
    audioVolume = average / 255;
    
    return audioVolume;
  }
  
  // 분석기가 없으면 기본값 반환
  return 1.0;
};

// 볼륨 분석 기능이 포함된 개선된 오디오 재생 함수
export const playAudioWithAnalysis = (base64Audio) => {
  return new Promise(async (resolve, reject) => {
    if (!base64Audio) {
      console.error('오디오 데이터가 없습니다');
      return resolve();
    }
    
    try {
      // 기존 오디오 요소가 있다면 제거
      const existingAudio = document.querySelector('audio[data-audio-analysis]');
      if (existingAudio) {
        existingAudio.remove();
      }
      
      // base64 데이터로 데이터 URL 생성
      const audioSrc = `data:audio/mp3;base64,${base64Audio}`;
      
      // 오디오 엘리먼트 생성 및 DOM에 추가
      const audio = document.createElement('audio');
      audio.src = audioSrc;
      audio.setAttribute('data-audio-analysis', 'true');
      audio.style.display = 'none'; // 숨김 처리
      
      // 페이지에 추가
      document.body.appendChild(audio);
      
      console.log('🎵 [AudioUtils] 오디오 요소 DOM에 추가됨:', audio);
      
      // 페이지 로드 시 미리 AudioContext 초기화
      const audioContext = initAudioContext();
      
      // AudioContext가 중단된 상태인 경우 다시 시작
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('AudioContext 재시작됨');
      }
      
      // base64 데이터를 디코딩
      const audioData = atob(base64Audio);
      
      // 바이너리 데이터를 Uint8Array로 변환
      const arrayBuffer = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        arrayBuffer[i] = audioData.charCodeAt(i);
      }
      
      console.log('오디오 디코딩 시작...');
      
      // 오디오 디코딩
      const buffer = await audioContext.decodeAudioData(arrayBuffer.buffer);
      console.log('오디오 디코딩 성공');
      
      // 지연 시간 설정 (초기 부분이 잘리지 않도록)
      const startDelay = 0.05; // 50ms의 지연
      const startTime = audioContext.currentTime + startDelay;
      
      // 소스 노드 생성 및 버퍼 연결
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      
      // 분석기 노드 생성
      audioAnalyser = audioContext.createAnalyser();
      audioAnalyser.fftSize = 256;
      
      // 데이터 배열 생성
      const bufferLength = audioAnalyser.frequencyBinCount;
      audioDataArray = new Uint8Array(bufferLength);
      
      // 게인 노드 생성 (볼륨 조절용)
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0; // 기본 볼륨
      
      // 오디오 그래프 연결: source -> analyser -> gain -> destination
      source.connect(audioAnalyser);
      audioAnalyser.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 재생 완료 이벤트
      source.onended = () => {
        console.log('🎵 [AudioUtils] 오디오 재생 완료');
        // 오디오 요소 제거
        if (audio && audio.parentNode) {
          audio.remove();
        }
        resolve();
      };
      
      // 오류 처리
      source.onerror = (err) => {
        console.error('🎵 [AudioUtils] 오디오 재생 오류:', err);
        // 오디오 요소 제거
        if (audio && audio.parentNode) {
          audio.remove();
        }
        reject(err);
      };
      
      // 약간의 지연 후 재생 시작 (초기 잘림 방지)
      console.log(`🎵 [AudioUtils] 오디오 재생 시작 (${startDelay}초 후)`);
      source.start(startTime);
      
      // 오디오 요소도 함께 재생 (AudioAnalyzer 연결을 위해)
      audio.play().catch(err => {
        console.warn('🎵 [AudioUtils] audio.play() 실패 (정상적인 경우):', err);
        // audio.play() 실패는 정상적인 경우일 수 있음 (사용자 상호작용 필요 등)
      });
      
    } catch (error) {
      console.error('🎵 [AudioUtils] 오디오 처리 오류:', error);
      reject(error);
    }
  });
}; 
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { audio_base64 } = await request.json();
    if (!audio_base64) {
      return NextResponse.json({ error: 'audio_base64 is required' }, { status: 400 });
    }

    // 내부 분석 서버로 전달
    const response = await fetch('http://172.30.1.11:8080/inference', {  //http://220.72.221.176:3002/inference
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_base64 }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: 500 });
    }

    const result = await response.json();
    // 분석 결과를 콘솔에 출력
    console.log('[inference API 응답]', JSON.stringify(result, null, 2));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
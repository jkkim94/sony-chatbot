import { Geist, Geist_Mono } from "next/font/google";
import { AudioProvider } from "../contexts/AudioContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "3D Digital Human + AI Agent",
  description: "Interactive 3D digital human with AI-powered voice and animation capabilities",
  keywords: ["3D", "Digital Human", "AI Agent", "Animation", "Voice", "Three.js"],
  authors: [{ name: "3D Digital Human + AI Agent Team" }],
  creator: "3D Digital Human + AI Agent",
  publisher: "3D Digital Human + AI Agent",
  robots: "index, follow",
  openGraph: {
    title: "3D Digital Human + AI Agent",
    description: "AI 음성 에이전트와 3D 아바타 애니메이션을 결합한 인터랙티브 챗봇",
    type: "website",
    locale: "ko_KR",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="dark:bg-gray-900 min-h-screen antialiased" suppressHydrationWarning={true}>
        <AudioProvider>
          <main className="min-h-screen">
            {children}
          </main>
        </AudioProvider>
      </body>
    </html>
  );
}

import { useState } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const [showTime, setShowTime] = useState(false);

  const isUser = role === 'user';
  const formattedTime = timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser
              ? 'bg-blue-500 text-white ml-2'
              : 'bg-gray-200 text-gray-700 mr-2'
          }`}
        >
          {isUser ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          )}
        </div>

        <div className="flex flex-col">
          <div
            className={`px-4 py-2 rounded-lg ${
              isUser
                ? 'bg-blue-500 text-white rounded-tr-none'
                : 'bg-gray-100 text-gray-900 rounded-tl-none'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          </div>

          {showTime && (
            <span
              className={`text-xs text-gray-500 mt-1 ${
                isUser ? 'text-right' : 'text-left'
              }`}
            >
              {formattedTime}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
'use client';

interface MicrophoneButtonProps {
  isListening: boolean;
  onPress: () => void;
  onRelease?: () => void;
  disabled?: boolean;
  size?: 'large' | 'medium';
  label?: string;
}

export default function MicrophoneButton({
  isListening,
  onPress,
  disabled = false,
  size = 'large',
  label,
}: MicrophoneButtonProps) {
  const sizeClasses = size === 'large'
    ? 'w-32 h-32 text-5xl'
    : 'w-24 h-24 text-4xl';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Pulse ring when listening */}
        {isListening && (
          <div
            className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring"
            style={{ margin: '-8px' }}
          />
        )}
        <button
          onClick={onPress}
          disabled={disabled}
          className={`
            ${sizeClasses}
            rounded-full flex items-center justify-center
            transition-all duration-200
            ${isListening
              ? 'bg-danger text-white shadow-lg scale-105'
              : disabled
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-primary text-white shadow-md hover:bg-primary-dark hover:shadow-lg active:scale-95'
            }
          `}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? '⏹' : '🎙️'}
        </button>
      </div>
      <span className="text-lg font-medium text-muted">
        {label || (isListening ? 'Listening...' : 'Tap to speak')}
      </span>
    </div>
  );
}

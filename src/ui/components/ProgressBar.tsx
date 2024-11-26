interface PropsBarra {
  value: number;
  max?: number;
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  className = "",
}: PropsBarra) {
  // Aseguramos que el valor esté entre 0 y max
  const progress = Math.min(max, Math.max(0, value));

  return (
    <div className={`w-full ${className}`}>
      <progress
        value={progress}
        max={max}
        className="w-full h-1 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-gray-800 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-white [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-white"
      />
      <span className="sr-only">{`${Math.round(
        (progress / max) * 100
      )}% Completado`}</span>
    </div>
  );
}

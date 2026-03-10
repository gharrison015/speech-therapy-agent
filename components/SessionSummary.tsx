'use client';

interface SessionSummaryProps {
  summary: {
    totalExercises: number;
    completed: number;
    skipped: number;
    averageAccuracy: number;
    averageConfidence: number;
    averageLatencyMs: number;
    averageSelfReport: number;
  };
  onDone: () => void;
}

export default function SessionSummary({ summary, onDone }: SessionSummaryProps) {
  const completionRate = Math.round((summary.completed / summary.totalExercises) * 100);

  return (
    <div className="flex flex-col items-center gap-6 text-center py-4">
      <h2 className="text-3xl font-bold">Great work, Fred!</h2>

      <p className="text-lg text-muted">Here&apos;s how today&apos;s session went:</p>

      <div className="w-full grid grid-cols-2 gap-4">
        <StatCard
          label="Completed"
          value={`${summary.completed}/${summary.totalExercises}`}
          sub={`${completionRate}%`}
        />
        <StatCard
          label="Speech Accuracy"
          value={`${summary.averageAccuracy}%`}
          sub={summary.averageAccuracy >= 80 ? 'Strong' : summary.averageAccuracy >= 60 ? 'Good progress' : 'Keep at it'}
        />
        {summary.averageSelfReport > 0 && (
          <StatCard
            label="Motor Comfort"
            value={`${summary.averageSelfReport}/5`}
            sub={summary.averageSelfReport >= 4 ? 'Feeling good' : summary.averageSelfReport >= 3 ? 'Getting there' : 'Tough today'}
          />
        )}
        {summary.skipped > 0 && (
          <StatCard
            label="Skipped"
            value={`${summary.skipped}`}
            sub="That's okay"
          />
        )}
      </div>

      {summary.averageAccuracy >= 80 && (
        <p className="text-lg text-success font-medium">
          Excellent session! Your speech is coming along well.
        </p>
      )}

      {summary.averageAccuracy >= 60 && summary.averageAccuracy < 80 && (
        <p className="text-lg text-primary font-medium">
          Good progress today. Every session makes a difference.
        </p>
      )}

      {summary.averageAccuracy < 60 && summary.averageAccuracy > 0 && (
        <p className="text-lg text-foreground font-medium">
          The swelling makes this tough, but showing up is what matters. You&apos;re doing great.
        </p>
      )}

      <button
        onClick={onDone}
        className="w-full py-4 px-6 bg-primary text-white text-xl font-semibold rounded-2xl shadow-md hover:bg-primary-dark active:scale-[0.98] transition-all mt-4"
      >
        Done
      </button>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-sm text-muted mt-1">{sub}</p>
    </div>
  );
}

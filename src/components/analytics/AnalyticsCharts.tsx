"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useThemeColors } from "@/hooks/useThemeColors";

interface DailyBucket {
  date: string;
  accuracy: number;
  studyMinutes: number;
  questionCount: number;
}

interface TopicMastery {
  topicName: string;
  score: number;
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Recharts takes actual color values, not Tailwind classes, so it can't
// pick up dark mode via className the way the rest of the app does — see
// useThemeColors.ts for why these are read from the live CSS variables
// instead of hardcoded, and why they update on a theme toggle without a
// page reload.

export function AccuracyTrendChart({ data }: { data: DailyBucket[] }) {
  const { cobalt, line, ink } = useThemeColors();
  const hasActivity = data.some((d) => d.questionCount > 0);
  if (!hasActivity) {
    return <p className="py-8 text-center text-sm text-ink/40">No practice activity in the last 14 days yet.</p>;
  }

  const tickStyle = { fontSize: 11, fill: ink, fillOpacity: 0.5 };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={line} vertical={false} />
        <XAxis dataKey="date" tickFormatter={formatDateShort} tick={tickStyle} interval={Math.ceil(data.length / 7)} />
        <YAxis domain={[0, 100]} tick={tickStyle} />
        <Tooltip
          labelFormatter={(d) => formatDateShort(d as string)}
          formatter={(value: number) => [`${value}%`, "Accuracy"]}
          contentStyle={{ fontSize: 12, borderRadius: 6, border: `1px solid ${line}` }}
        />
        <Line type="monotone" dataKey="accuracy" stroke={cobalt} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StudyTimeTrendChart({ data }: { data: DailyBucket[] }) {
  const { signal, line, ink } = useThemeColors();
  const hasActivity = data.some((d) => d.studyMinutes > 0);
  if (!hasActivity) {
    return <p className="py-8 text-center text-sm text-ink/40">No study time logged in the last 14 days yet.</p>;
  }

  const tickStyle = { fontSize: 11, fill: ink, fillOpacity: 0.5 };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={line} vertical={false} />
        <XAxis dataKey="date" tickFormatter={formatDateShort} tick={tickStyle} interval={Math.ceil(data.length / 7)} />
        <YAxis tick={tickStyle} />
        <Tooltip
          labelFormatter={(d) => formatDateShort(d as string)}
          formatter={(value: number) => [`${value} min`, "Study time"]}
          contentStyle={{ fontSize: 12, borderRadius: 6, border: `1px solid ${line}` }}
        />
        <Bar dataKey="studyMinutes" fill={signal} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MasteryByTopicChart({ data }: { data: TopicMastery[] }) {
  const { cobalt, line, ink } = useThemeColors();
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-ink/40">No mastery data yet — start practicing to see this.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={line} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: ink, fillOpacity: 0.5 }} />
        <YAxis dataKey="topicName" type="category" width={110} tick={{ fontSize: 12, fill: ink, fillOpacity: 0.75 }} />
        <Tooltip
          formatter={(value: number) => [`${value}%`, "Mastery"]}
          contentStyle={{ fontSize: 12, borderRadius: 6, border: `1px solid ${line}` }}
        />
        <Bar dataKey="score" fill={cobalt} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function EngagementChart({ media }: { media: any[] }) {
  const data = [...media]
    .slice(0, 12)
    .reverse()
    .map((m, i) => ({
      nome: `Post ${i + 1}`,
      curtidas: m.like_count ?? 0,
      comentarios: m.comments_count ?? 0,
    }));

  if (data.length === 0) return null;

  return (
    <div className="card" style={{ padding: 20 }}>
      <p className="card-title" style={{ marginBottom: 12 }}>Curtidas por post (mais recentes)</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#272C46" />
          <XAxis dataKey="nome" tick={{ fill: "#8B90AC", fontSize: 11 }} axisLine={{ stroke: "#272C46" }} />
          <YAxis tick={{ fill: "#8B90AC", fontSize: 11 }} axisLine={{ stroke: "#272C46" }} />
          <Tooltip
            contentStyle={{ background: "#171B2E", border: "1px solid #272C46", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#E8E9F3" }}
          />
          <Bar dataKey="curtidas" fill="#F2A93B" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

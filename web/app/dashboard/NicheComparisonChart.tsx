"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function NicheComparisonChart({ insights }: { insights: any[] }) {
  const data = insights
    .filter((i) => typeof i.insight?.score_potencial === "number")
    .map((i) => ({
      perfil: `@${i.scraped_profiles?.username ?? "?"}`,
      score: i.insight.score_potencial,
    }))
    .slice(0, 15);

  if (data.length === 0) return null;

  return (
    <div className="card" style={{ padding: 20, marginTop: 12 }}>
      <p className="card-title" style={{ marginBottom: 12 }}>Score de potencial por perfil analisado</p>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#272C46" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#8B90AC", fontSize: 11 }} axisLine={{ stroke: "#272C46" }} />
          <YAxis type="category" dataKey="perfil" tick={{ fill: "#E8E9F3", fontSize: 12 }} width={110} axisLine={{ stroke: "#272C46" }} />
          <Tooltip
            contentStyle={{ background: "#171B2E", border: "1px solid #272C46", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#E8E9F3" }}
          />
          <Bar dataKey="score" fill="#5EEAD4" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

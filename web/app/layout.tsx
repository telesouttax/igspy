import "./globals.css";

export const metadata = {
  title: "Nicho Insights",
  description: "Análise de perfis do Instagram por nicho, com IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand">
              <span className="brand-mark" />
              Nicho Insights
            </div>
            <nav className="nav-group">
              <div className="nav-label">Painel</div>
              <a href="/dashboard">Visão geral</a>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}

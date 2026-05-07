// App shell — orchestrates layout + API data + Tweaks state + Auth.
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import Sidebar from './Sidebar.jsx';
import ProjectView from './ProjectView.jsx';
import ChatView from './ChatView.jsx';
import KnowledgePanel from './KnowledgePanel.jsx';
import { TweaksPanel, TweakSection, TweakRadio, TweakSelect, useTweaks } from './TweaksPanel.jsx';
import { listProjects, getProject, createProject, createChat, patchProject, deleteProject, deleteFile, getSettings } from './api.js';
import SettingsModal from './SettingsModal.jsx';
import WelcomePage from './WelcomePage.jsx';
import ArtifactPanel from './ArtifactPanel.jsx';
import LoginPage from './LoginPage.jsx';
import AdminPanel from './AdminPanel.jsx';
import ShareModal from './ShareModal.jsx';

const TWEAK_DEFAULTS = {
  theme: "light",
  knowledgePosition: "right",
  density: "default",
  accent: "coral",
};

const ACCENTS = {
  coral:   { accent: "oklch(0.68 0.18 35)",  soft: "oklch(0.94 0.04 35)",  ink: "oklch(0.42 0.18 35)",  daccent: "oklch(0.74 0.16 35)",  dsoft: "oklch(0.32 0.08 35)",  dink: "oklch(0.86 0.14 35)" },
  iris:    { accent: "oklch(0.62 0.18 290)", soft: "oklch(0.94 0.04 290)", ink: "oklch(0.40 0.18 290)", daccent: "oklch(0.72 0.16 290)", dsoft: "oklch(0.32 0.08 290)", dink: "oklch(0.86 0.14 290)" },
  forest:  { accent: "oklch(0.58 0.14 155)", soft: "oklch(0.94 0.04 155)", ink: "oklch(0.38 0.14 155)", daccent: "oklch(0.72 0.13 155)", dsoft: "oklch(0.30 0.06 155)", dink: "oklch(0.86 0.12 155)" },
  cobalt:  { accent: "oklch(0.58 0.18 245)", soft: "oklch(0.94 0.04 245)", ink: "oklch(0.40 0.18 245)", daccent: "oklch(0.70 0.15 245)", dsoft: "oklch(0.30 0.08 245)", dink: "oklch(0.86 0.13 245)" },
  amber:   { accent: "oklch(0.74 0.15 70)",  soft: "oklch(0.94 0.05 70)",  ink: "oklch(0.46 0.15 70)",  daccent: "oklch(0.80 0.14 70)",  dsoft: "oklch(0.34 0.08 70)",  dink: "oklch(0.88 0.14 70)" },
};

function applyAccent(name, theme) {
  const a = ACCENTS[name] || ACCENTS.coral;
  const r = document.documentElement.style;
  if (theme === "dark") {
    r.setProperty("--accent", a.daccent);
    r.setProperty("--accent-soft", a.dsoft);
    r.setProperty("--accent-ink", a.dink);
  } else {
    r.setProperty("--accent", a.accent);
    r.setProperty("--accent-soft", a.soft);
    r.setProperty("--accent-ink", a.ink);
  }
}

function AppInner() {
  const { user, loading: authLoading, isAdmin, logout } = useAuth();
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [viewportW, setViewportW] = useState(window.innerWidth);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 820);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [viewedArtifact, setViewedArtifact] = useState(null);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(null);

  // Load projects from API on mount
  useEffect(() => {
    if (!user) return;
    Promise.all([
      listProjects(),
      getSettings().catch(() => null),
    ]).then(([projectsData, settingsData]) => {
      setProjects(projectsData);
      setSettings(settingsData);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load:', err);
      setLoading(false);
    });
  }, [user]);

  const toggleSidebar = () => setSidebarOpen(o => !o);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeChat = activeChatId && activeProject?.chats?.find(c => c.id === activeChatId);
  const inChat = !!activeChat;

  // Theme + density + accent application
  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
    applyAccent(tweaks.accent, tweaks.theme);
  }, [tweaks.theme, tweaks.density, tweaks.accent]);

  // Track viewport width
  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const NARROW_KB = 1100;
  const NARROW_SB = 820;
  const isNarrowKB = viewportW < NARROW_KB;
  const isNarrowSB = viewportW < NARROW_SB;

  const refreshProject = async (pid) => {
    try {
      const updated = await getProject(pid || activeProjectId);
      setProjects(ps => ps.map(p => p.id === updated.id ? updated : p));
    } catch {}
  };

  const onSelectProject = (pid) => {
    setActiveProjectId(pid);
    setActiveChatId(null);
  };

  const onSelectChat = (pid, cid) => {
    setActiveProjectId(pid);
    setActiveChatId(cid);
  };

  const onOpenChat = (cid) => setActiveChatId(cid);

  const onNewChat = async () => {
    if (!activeProjectId) return;
    try {
      const newChat = await createChat(activeProjectId);
      setActiveChatId(newChat.id);
      await refreshProject(activeProjectId);
    } catch (err) { console.error('Failed to create chat:', err); }
  };

  const onNewProject = async () => {
    try {
      const newProject = await createProject();
      await refreshProjects();
      setActiveProjectId(newProject.id);
      setActiveChatId(null); // land on project page, not in a chat
    } catch (err) { console.error('Failed to create project:', err); }
  };

  const onGoHome = () => {
    setActiveProjectId(null);
    setActiveChatId(null);
  };

  const onRenameProject = async (pid, currentName) => {
    const name = prompt("Rename project", currentName);
    if (!name || name === currentName) return;
    try {
      await patchProject(pid, { name });
      await refreshProjects();
    } catch (err) { console.error("Rename failed:", err); }
  };

  const onDeleteProject = async (pid) => {
    if (!confirm("Delete this project and all its chats?")) return;
    try {
      await deleteProject(pid);
      if (activeProjectId === pid) setActiveProjectId(null);
      await refreshProjects();
    } catch (err) { console.error("Delete failed:", err); }
  };

  const refreshProjects = async () => {
    try {
      const data = await listProjects();
      setProjects(data);
    } catch {}
  };

  const onViewArtifact = (artifact) => setViewedArtifact(artifact);

  const onUpload = (newFile) => {
    setProjects(ps => ps.map(p => p.id === activeProjectId
      ? { ...p, files: [newFile, ...(p.files || [])] }
      : p
    ));
  };

  const onRemove = (fid) => {
    setProjects(ps => ps.map(p => p.id === activeProjectId
      ? { ...p, files: (p.files || []).filter(f => f.id !== fid) }
      : p
    ));
  };

  const cyclePosition = () => {
    const order = ["right", "left", "inline"];
    const next = order[(order.indexOf(tweaks.knowledgePosition) + 1) % order.length];
    setTweak("knowledgePosition", next);
  };

  const knowledgePos = tweaks.knowledgePosition;
  const effectivePos = isNarrowKB ? "inline" : knowledgePos;
  const showSidePanel = knowledgeOpen && (effectivePos === "left" || effectivePos === "right");

  // Show login page if not authenticated
  if (authLoading) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--ink-3)" }} className="mono">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--ink-3)" }} className="mono">
        Loading…
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div style={{ display: "flex", height: "100%", width: "100%" }}>
        {sidebarOpen ? (
          isNarrowSB ? (
            <>
              <div style={sbOverlay} onClick={() => setSidebarOpen(false)} />
              <div style={sbDrawer}>
                <Sidebar
                  projects={projects}
                  activeProjectId={null}
                  activeChatId={null}
                  onSelectProject={(pid) => { setActiveProjectId(pid); setActiveChatId(null); }}
                  onSelectChat={(pid, cid) => { setActiveProjectId(pid); setActiveChatId(cid); }}
                  onNewChat={onNewChat}
                  onNewProject={onNewProject}
                  theme={tweaks.theme}
                  onToggleTheme={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")}
                  onOpenSettings={() => setSettingsOpen(true)}
                  settings={settings}
                  onRefreshProjects={refreshProjects}
                  onRefreshProject={refreshProject}
                  onGoHome={onGoHome}
                  user={user}
                  onOpenShare={setShareModalOpen}
                  onClose={() => setSidebarOpen(false)}
                />
              </div>
            </>
          ) : (
            <Sidebar
              projects={projects}
              activeProjectId={null}
              activeChatId={null}
              onSelectProject={(pid) => { setActiveProjectId(pid); setActiveChatId(null); }}
              onSelectChat={(pid, cid) => { setActiveProjectId(pid); setActiveChatId(cid); }}
              onNewChat={onNewChat}
              onNewProject={onNewProject}
              theme={tweaks.theme}
              onToggleTheme={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")}
              onOpenSettings={() => setSettingsOpen(true)}
              settings={settings}
              onRefreshProjects={refreshProjects}
              onRefreshProject={refreshProject}
              onGoHome={onGoHome}
              user={user}
              onOpenShare={setShareModalOpen}
              onCollapse={() => setSidebarOpen(false)}
            />
          )
        ) : !isNarrowSB && (
          <MiniSidebar
            theme={tweaks.theme}
            onToggleTheme={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")}
            onToggleSidebar={toggleSidebar}
          />
        )}
        <WelcomePage
          projects={projects}
          onNewProject={onNewProject}
          onSelectProject={(pid) => setActiveProjectId(pid)}
          narrowSidebar={isNarrowSB}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
        />
        {settingsOpen && (
          <SettingsModal
            onClose={() => setSettingsOpen(false)}
            onSaved={() => getSettings().then(setSettings).catch(() => {})}
            isAdmin={isAdmin}
            onOpenAdmin={() => setAdminPanelOpen(true)}
            logout={logout}
            user={user}
          />
        )}
        {adminPanelOpen && (
          <AdminPanel onClose={() => setAdminPanelOpen(false)} />
        )}
      </div>
    );
  }

  const knowledgeEl = showSidePanel ? (
    <KnowledgePanel
      project={activeProject}
      files={activeProject.files || []}
      onUpload={onUpload}
      onRemove={onRemove}
      onClose={() => setKnowledgeOpen(false)}
      position={effectivePos}
    />
  ) : null;

  return (
    <div style={{ display: "flex", height: "100%", width: "100%", position: "relative" }}>
      {sidebarOpen ? (
        isNarrowSB ? (
          <>
            <div style={sbOverlay} onClick={() => setSidebarOpen(false)} />
            <div style={sbDrawer}>
              <Sidebar
                projects={projects}
                activeProjectId={activeProjectId}
                activeChatId={activeChatId}
                onSelectProject={(pid) => { onSelectProject(pid); setSidebarOpen(false); }}
                onSelectChat={(pid, cid) => { onSelectChat(pid, cid); setSidebarOpen(false); }}
                onNewChat={onNewChat}
                onNewProject={onNewProject}
                theme={tweaks.theme}
                onToggleTheme={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")}
                onOpenSettings={() => setSettingsOpen(true)}
                settings={settings}
                onRefreshProjects={refreshProjects}
                onRefreshProject={refreshProject}
                onGoHome={onGoHome}
                user={user}
                onOpenShare={setShareModalOpen}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          </>
        ) : (
          <Sidebar
            projects={projects}
            activeProjectId={activeProjectId}
            activeChatId={activeChatId}
            onSelectProject={onSelectProject}
            onSelectChat={onSelectChat}
            onNewChat={onNewChat}
            onNewProject={onNewProject}
            theme={tweaks.theme}
            onToggleTheme={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")}
            onOpenSettings={() => setSettingsOpen(true)}
            settings={settings}
            onRefreshProjects={refreshProjects}
            onRefreshProject={refreshProject}
            onGoHome={onGoHome}
            user={user}
            onOpenShare={setShareModalOpen}
            onCollapse={() => setSidebarOpen(false)}
          />
        )
      ) : !isNarrowSB && (
        <MiniSidebar
          theme={tweaks.theme}
          onToggleTheme={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")}
          onToggleSidebar={toggleSidebar}
        />
      )}
      {effectivePos === "left" && knowledgeEl}
      {inChat ? (
        <ChatView
          project={activeProject}
          chat={activeChat}
          knowledgeOpen={knowledgeOpen}
          onToggleKnowledge={() => setKnowledgeOpen(o => !o)}
          knowledgePosition={effectivePos}
          onCyclePosition={cyclePosition}
          narrow={isNarrowKB}
          onBackToProject={() => setActiveChatId(null)}
          settings={settings}
          onOpenSettings={() => setSettingsOpen(true)}
          onRefreshProject={refreshProject}
          onViewArtifact={onViewArtifact}
          isAdmin={isAdmin}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
          narrowSidebar={isNarrowSB}
          user={user}
        />
      ) : (
        <ProjectView
          project={activeProject}
          onOpenChat={onOpenChat}
          onNewChat={onNewChat}
          onEnterInstructions={() => setKnowledgeOpen(true)}
          knowledgeOpen={knowledgeOpen}
          onToggleKnowledge={() => setKnowledgeOpen(o => !o)}
          knowledgePosition={effectivePos}
          onCyclePosition={cyclePosition}
          narrow={isNarrowKB}
          onRenameProject={onRenameProject}
          onDeleteProject={onDeleteProject}
          onRefreshProject={refreshProject}
          onOpenShare={() => setShareModalOpen(activeProject)}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
          narrowSidebar={isNarrowSB}
        />
      )}
      {viewedArtifact && (
        <ArtifactPanel artifact={viewedArtifact} onClose={() => setViewedArtifact(null)} />
      )}
      {effectivePos === "right" && knowledgeEl}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onSaved={() => getSettings().then(setSettings).catch(() => {})}
          isAdmin={isAdmin}
          onOpenAdmin={() => setAdminPanelOpen(true)}
          logout={logout}
          user={user}
        />
      )}

      {adminPanelOpen && (
        <AdminPanel onClose={() => setAdminPanelOpen(false)} />
      )}

      {shareModalOpen && (
        <ShareModal project={shareModalOpen} onClose={() => setShareModalOpen(null)} />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakRadio
            value={tweaks.theme}
            options={[{ label: "Light", value: "light" }, { label: "Dark", value: "dark" }]}
            onChange={(v) => setTweak("theme", v)}
          />
        </TweakSection>
        <TweakSection title="Accent">
          <TweakSelect
            value={tweaks.accent}
            options={[
              { label: "Coral", value: "coral" },
              { label: "Iris", value: "iris" },
              { label: "Forest", value: "forest" },
              { label: "Cobalt", value: "cobalt" },
              { label: "Amber", value: "amber" },
            ]}
            onChange={(v) => setTweak("accent", v)}
          />
        </TweakSection>
        <TweakSection title="Knowledge panel position">
          <TweakRadio
            value={tweaks.knowledgePosition}
            options={[{ label: "Left", value: "left" }, { label: "Right", value: "right" }, { label: "Inline", value: "inline" }]}
            onChange={(v) => setTweak("knowledgePosition", v)}
          />
        </TweakSection>
        <TweakSection title="Density">
          <TweakRadio
            value={tweaks.density}
            options={[{ label: "Compact", value: "compact" }, { label: "Default", value: "default" }, { label: "Spacious", value: "spacious" }]}
            onChange={(v) => setTweak("density", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

function MiniSidebar({ theme, onToggleTheme, onToggleSidebar }) {
  return (
    <div style={msStyles.wrap}>
      <div style={msStyles.top}>
        <button style={msStyles.btn} onClick={onToggleSidebar} title="Expand sidebar">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
      </div>
      <div style={msStyles.mid}>
        <button style={msStyles.btn} onClick={onToggleTheme} title="Toggle theme">
          {theme === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="10" cy="10" r="3"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.5 4.5l1.4 1.4M14.1 14.1l1.4 1.4M4.5 15.5l1.4-1.4M14.1 5.9l1.4-1.4"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 12.5A6.5 6.5 0 0 1 7.5 4 6.5 6.5 0 1 0 16 12.5z"/>
            </svg>
          )}
        </button>
      </div>
      <div style={msStyles.bot} />
    </div>
  );
}

const msStyles = {
  wrap: {
    width: 50, flexShrink: 0, height: "100%",
    background: "var(--bg-2)", borderRight: "1px solid var(--line)",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "10px 0", gap: 4,
  },
  top: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  mid: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 },
  bot: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  btn: {
    width: 36, height: 36, borderRadius: 9,
    display: "grid", placeItems: "center",
    color: "var(--ink-3)", transition: "background 120ms, color 120ms",
  },
  avatarBtn: { width: 36, height: 36, borderRadius: 9, display: "grid", placeItems: "center" },
  avatar: {
    width: 28, height: 28, borderRadius: 7,
    background: "linear-gradient(135deg, var(--accent), oklch(0.66 0.17 18))",
    color: "white", display: "grid", placeItems: "center",
    fontSize: 10, fontWeight: 600,
  },
};

const sbOverlay = {
  position: "fixed", inset: 0, background: "oklch(0 0 0 / 0.35)",
  zIndex: 199, animation: "fadeIn 150ms ease-out",
};

const sbDrawer = {
  position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 200,
  animation: "slideIn 180ms ease-out",
};

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

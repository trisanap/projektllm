// App shell — orchestrates layout + Tweaks state.
const { useState: useStateA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "knowledgePosition": "right",
  "density": "default",
  "accent": "coral"
}/*EDITMODE-END*/;

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

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [projects, setProjects] = useStateA(window.PROJECTS);
  const [activeProjectId, setActiveProjectId] = useStateA(window.PROJECTS[0].id);
  const [activeChatId, setActiveChatId] = useStateA(null); // null = project overview
  const [knowledgeOpen, setKnowledgeOpen] = useStateA(true);
  const [viewportW, setViewportW] = useStateA(typeof window !== "undefined" ? window.innerWidth : 1280);
  const [sidebarOpen, setSidebarOpen] = useStateA(true);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeChat = activeChatId ? activeProject?.chats.find(c => c.id === activeChatId) : null;
  const inChat = !!activeChat;

  // Theme + density + accent application
  useEffectA(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
    applyAccent(tweaks.accent, tweaks.theme);
  }, [tweaks.theme, tweaks.density, tweaks.accent]);

  // Track viewport width for responsive layout decisions
  useEffectA(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Auto-collapse knowledge panel below ~1100px, sidebar below ~820px
  const NARROW_KB = 1100;
  const NARROW_SB = 820;
  const isNarrowKB = viewportW < NARROW_KB;
  const isNarrowSB = viewportW < NARROW_SB;

  const onSelectProject = (pid) => {
    setActiveProjectId(pid);
    setActiveChatId(null); // open project overview
  };
  const onSelectChat = (pid, cid) => {
    setActiveProjectId(pid);
    setActiveChatId(cid);
  };
  const onOpenChat = (cid) => setActiveChatId(cid);
  const onNewChat = () => {
    const newChat = {
      id: "c" + Date.now(),
      title: "New chat",
      updated: "just now",
    };
    setProjects(ps => ps.map(p => p.id === activeProjectId
      ? { ...p, chats: [newChat, ...p.chats] }
      : p
    ));
    setActiveChatId(newChat.id);
  };
  const onNewProject = () => {
    const id = "p" + Date.now();
    const newProject = {
      id,
      name: "Untitled project",
      color: "oklch(0.62 0.14 290)",
      glyph: "UP",
      description: "Empty project — add files and start a chat.",
      instructions: "",
      files: [],
      chats: [{ id: "c" + Date.now(), title: "New chat", updated: "just now" }],
    };
    setProjects(ps => [...ps, newProject]);
    setActiveProjectId(id);
    setActiveChatId(newProject.chats[0].id);
  };
  const onTogglePin = (pid, cid) => {
    setProjects(ps => ps.map(p => p.id === pid
      ? { ...p, chats: p.chats.map(c => c.id === cid ? { ...c, pinned: !c.pinned } : c) }
      : p
    ));
  };
  const onUpload = (newFiles) => {
    setProjects(ps => ps.map(p => p.id === activeProjectId
      ? { ...p, files: [...newFiles, ...p.files] }
      : p
    ));
  };
  const onRemove = (fid) => {
    setProjects(ps => ps.map(p => p.id === activeProjectId
      ? { ...p, files: p.files.filter(f => f.id !== fid) }
      : p
    ));
  };

  const cyclePosition = () => {
    const order = ["right", "left", "inline"];
    const next = order[(order.indexOf(tweaks.knowledgePosition) + 1) % order.length];
    setTweak("knowledgePosition", next);
  };

  const knowledgePos = tweaks.knowledgePosition;
  // When narrow, force inline mode regardless of saved preference
  const effectivePos = isNarrowKB ? "inline" : knowledgePos;
  const showSidePanel = knowledgeOpen && (effectivePos === "left" || effectivePos === "right");

  const knowledgeEl = activeProject && showSidePanel ? (
    <KnowledgePanel
      project={activeProject}
      files={activeProject.files}
      onUpload={onUpload}
      onRemove={onRemove}
      onClose={() => setKnowledgeOpen(false)}
      position={effectivePos}
    />
  ) : null;

  return (
    <div data-screen-label="App" style={{ display: "flex", height: "100%", width: "100%", position: "relative" }}>
      {!isNarrowSB && (
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
        />
      ) : (
        <ProjectView
          project={activeProject}
          onOpenChat={onOpenChat}
          onNewChat={onNewChat}
          onTogglePin={onTogglePin}
          onEnterInstructions={() => setKnowledgeOpen(true)}
          knowledgeOpen={knowledgeOpen}
          onToggleKnowledge={() => setKnowledgeOpen(o => !o)}
          knowledgePosition={effectivePos}
          onCyclePosition={cyclePosition}
          narrow={isNarrowKB}
        />
      )}
      {effectivePos === "right" && knowledgeEl}

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
            options={[
              { label: "Left", value: "left" },
              { label: "Right", value: "right" },
              { label: "Inline", value: "inline" },
            ]}
            onChange={(v) => setTweak("knowledgePosition", v)}
          />
        </TweakSection>
        <TweakSection title="Density">
          <TweakRadio
            value={tweaks.density}
            options={[
              { label: "Compact", value: "compact" },
              { label: "Default", value: "default" },
              { label: "Spacious", value: "spacious" },
            ]}
            onChange={(v) => setTweak("density", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

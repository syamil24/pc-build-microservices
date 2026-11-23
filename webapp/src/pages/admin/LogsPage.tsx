import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "../../api";
import type { LogFileInfo, LogTail } from "../../types";

const POLL_MS = 2000;
const FILES_POLL_MS = 10000;
const MAX_LINES = 2000;
const LEVELS = ["ALL", "ERROR", "WARN", "INFO", "DEBUG"] as const;
const LEVEL_IN_LINE = /^\S+\s+\S+\s+(TRACE|DEBUG|INFO|WARN|ERROR)\b/;

type Line = { id: number; text: string; level: string | null };

function mb(bytes: number) {
  return `${Math.round(bytes / 1048576)} MB`;
}

function levelOf(text: string) {
  const match = text.match(LEVEL_IN_LINE);
  return match ? match[1] : null;
}

export default function LogsPage() {
  const [files, setFiles] = useState<LogFileInfo[]>([]);
  const [file, setFile] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [paused, setPaused] = useState(false);
  const [follow, setFollow] = useState(true);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("ALL");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sizeBytes, setSizeBytes] = useState(0);
  const offsetRef = useRef(-1);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  useEffect(() => {
    let cancel = false;
    const load = () => {
      if (document.hidden) return;
      api<LogFileInfo[]>("/api/platform/logs/files").then((next) => {
        if (cancel) return;
        setFiles(next);
        setError("");
      }).catch((ex: Error) => {
        if (!cancel) setError(ex.message);
      });
    };
    load();
    const timer = window.setInterval(load, FILES_POLL_MS);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancel = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (files.length === 0) return;
    if (file && files.some((entry) => entry.name === file)) return;
    chooseFile(files[0].name);
  }, [files, file]);

  useEffect(() => {
    if (!file || paused) return;
    let cancel = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const tail = await api<LogTail>(`/api/platform/logs/tail?file=${encodeURIComponent(file)}&offset=${offsetRef.current}`);
        if (cancel) return;
        offsetRef.current = tail.nextOffset;
        setSizeBytes(tail.sizeBytes);
        setError("");
        setNotice(tail.reset ? "Log rotated: view restarted from the top of the new file." : tail.truncated ? "Output capped: older lines were skipped." : "");
        if (tail.lines.length > 0 || tail.reset) {
          const added = tail.lines.map((text) => ({ id: ++idRef.current, text, level: levelOf(text) }));
          setLines((prev) => (tail.reset ? added.slice(-MAX_LINES) : [...prev, ...added].slice(-MAX_LINES)));
        }
      } catch (ex) {
        if (!cancel) setError((ex as Error).message);
      }
    };
    tick();
    const timer = window.setInterval(tick, POLL_MS);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancel = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [file, paused]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return lines.filter((line) => {
      if (needle && !line.text.toLowerCase().includes(needle)) return false;
      if (level !== "ALL" && line.level !== level) return false;
      return true;
    });
  }, [lines, query, level]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 20,
    overscan: 12,
    getItemKey: (index) => rows[index].id
  });

  useLayoutEffect(() => {
    if (follow && stickRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [rows, follow]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  const chooseFile = (name: string) => {
    setFile(name);
    setLines([]);
    offsetRef.current = -1;
    setSizeBytes(0);
    setNotice("");
  };

  return (
    <section>
      <header className="page-head">
        <h1>Live logs</h1>
        <p className="muted">Tails today's files from the logs directory. Polls every two seconds and keeps the newest lines in view.</p>
      </header>
      {error && <p className="toast error" role="alert"><span role="img" aria-label="Error">!</span> {error}</p>}
      <div className="panel log-panel">
        <div className="log-bar">
          <label className="log-field">
            <span>File</span>
            <select value={file} onChange={(event) => chooseFile(event.target.value)}>
              {files.length === 0 && <option value="">No log files</option>}
              {files.map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {entry.name} ({mb(entry.sizeBytes)})
                </option>
              ))}
            </select>
          </label>
          <label className="log-field">
            <span>Level</span>
            <select value={level} onChange={(event) => setLevel(event.target.value as (typeof LEVELS)[number])}>
              {LEVELS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="log-field log-search">
            <span>Filter</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="substring match" />
          </label>
          <button type="button" className="btn" onClick={() => setPaused((value) => !value)}>
            {paused ? "Resume" : "Pause"}
          </button>
          <label className="log-check">
            <input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} />
            <span>Follow</span>
          </label>
        </div>
        <p className="log-status muted">
          {rows.length} of {lines.length} lines{sizeBytes > 0 ? ` · file ${mb(sizeBytes)}` : ""}
          {paused ? " · paused" : ""}{notice ? ` · ${notice}` : ""}
        </p>
        <div
          ref={scrollRef}
          className="log-view"
          role="log"
          aria-label="Live log output"
          aria-live="off"
          onScroll={onScroll}
          tabIndex={0}
        >
          {rows.length === 0 ? (
            <p className="muted log-empty">{files.length === 0 ? "No log files were found." : "No lines match the filter."}</p>
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
              {virtualizer.getVirtualItems().map((item) => {
                const line = rows[item.index];
                return (
                  <div
                    key={item.key}
                    ref={virtualizer.measureElement}
                    data-index={item.index}
                    className={line.level === "ERROR" || line.level === "WARN" ? `log-row lvl-${line.level.toLowerCase()}` : "log-row"}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${item.start}px)` }}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

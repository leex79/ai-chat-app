"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDeviceId } from "@/lib/device-id";
import {
  listSessions,
  createSession as dbCreateSession,
  renameSession as dbRenameSession,
  deleteSession as dbDeleteSession,
  clearAllSessions,
  insertMessage,
  updateMessage,
  touchSession,
} from "@/lib/db/chat";
import type { Message, Session, ToolInvocation } from "@/lib/types";

const DEFAULT_TITLE = "새 대화";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function newEmptySession(): Session {
  const now = Date.now();
  return { id: generateId(), title: DEFAULT_TITLE, messages: [], createdAt: now, updatedAt: now };
}

interface SseParsed {
  text?: string;
  error?: { code: string; message: string };
  toolCall?: { name: string; args?: Record<string, unknown> };
  toolResult?: { name: string; response?: unknown };
}

function parseSseLine(line: string): SseParsed | null {
  if (!line.startsWith("data: ")) return null;
  const payload = line.slice(6);
  if (payload === "[DONE]") return null;
  try {
    return JSON.parse(payload) as SseParsed;
  } catch {
    return null;
  }
}

export function useChat() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isResponding, setIsResponding] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const initialized = useRef(false);

  // 마운트 시 Supabase에서 세션 로드
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const deviceId = getDeviceId();

    listSessions(deviceId)
      .then((stored) => {
        if (stored.length > 0) {
          setSessions(stored);
          setActiveId(stored[stored.length - 1].id);
        } else {
          const s = newEmptySession();
          dbCreateSession(deviceId, s).catch(() => {});
          setSessions([s]);
          setActiveId(s.id);
        }
      })
      .catch(() => {
        const s = newEmptySession();
        setSessions([s]);
        setActiveId(s.id);
      });
  }, []);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  const messages = activeSession?.messages ?? [];

  // --- 세션 CRUD ---

  const newSession = useCallback(() => {
    const s = newEmptySession();
    const deviceId = getDeviceId();
    dbCreateSession(deviceId, s).catch(() => {});
    setSessions((prev) => [...prev, s]);
    setActiveId(s.id);
  }, []);

  const selectSession = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const renameSession = useCallback((id: string, title: string) => {
    const trimmed = title.trim() || DEFAULT_TITLE;
    dbRenameSession(id, trimmed).catch(() => {});
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: trimmed } : s)),
    );
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      dbDeleteSession(id).catch(() => {});
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (next.length === 0) {
          const s = newEmptySession();
          const deviceId = getDeviceId();
          dbCreateSession(deviceId, s).catch(() => {});
          setActiveId(s.id);
          return [s];
        }
        if (id === activeId) {
          setActiveId(next[next.length - 1].id);
        }
        return next;
      });
    },
    [activeId],
  );

  const clearAll = useCallback(() => {
    const deviceId = getDeviceId();
    clearAllSessions(deviceId).catch(() => {});
    const s = newEmptySession();
    dbCreateSession(deviceId, s).catch(() => {});
    setSessions([s]);
    setActiveId(s.id);
  }, []);

  // --- 스트리밍 ---

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsResponding(false);
  }, []);

  const cleanup = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (text: string, enabledServerIds: string[] = []) => {
      const trimmed = text.trim();
      if (!trimmed || isResponding || !activeId) return;

      const deviceId = getDeviceId();
      const targetId = activeId;

      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };
      const assistantId = generateId();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: Date.now() + 1,
      };

      let historyForRequest: Message[] = [];
      let autoTitle = DEFAULT_TITLE;

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== targetId) return s;
          const isFirstMessage = s.messages.length === 0;
          autoTitle =
            isFirstMessage && s.title === DEFAULT_TITLE
              ? trimmed.slice(0, 30)
              : s.title;
          const updatedMessages = [...s.messages, userMsg, assistantMsg];
          historyForRequest = [...s.messages, userMsg];
          return {
            ...s,
            title: autoTitle,
            messages: updatedMessages,
            updatedAt: Date.now(),
          };
        }),
      );

      // user 메시지 및 빈 assistant 메시지 DB insert (best-effort)
      insertMessage(deviceId, targetId, userMsg).catch(() => {});
      insertMessage(deviceId, targetId, assistantMsg).catch(() => {});
      if (autoTitle !== DEFAULT_TITLE) {
        dbRenameSession(targetId, autoTitle).catch(() => {});
      }
      touchSession(targetId).catch(() => {});

      setIsResponding(true);

      const controller = new AbortController();
      abortRef.current = controller;

      // toolCall name → invocation id 매핑 (같은 이름 도구가 여러 번 호출될 수 있으므로 큐로 관리)
      const callQueue: Map<string, string[]> = new Map();

      const appendToolCall = (name: string, args?: Record<string, unknown>) => {
        const invocationId = generateId();
        const invocation: ToolInvocation = { id: invocationId, name, args, status: "calling" };
        callQueue.set(name, [...(callQueue.get(name) ?? []), invocationId]);
        setSessions((prev) =>
          prev.map((s) =>
            s.id !== targetId
              ? s
              : {
                  ...s,
                  updatedAt: Date.now(),
                  messages: s.messages.map((m) =>
                    m.id === assistantId
                      ? { ...m, toolCalls: [...(m.toolCalls ?? []), invocation] }
                      : m,
                  ),
                },
          ),
        );
      };

      const resolveToolCall = (name: string, response: unknown) => {
        const queue = callQueue.get(name) ?? [];
        const invocationId = queue.shift();
        if (!invocationId) return;
        if (queue.length === 0) callQueue.delete(name);
        else callQueue.set(name, queue);

        setSessions((prev) =>
          prev.map((s) =>
            s.id !== targetId
              ? s
              : {
                  ...s,
                  updatedAt: Date.now(),
                  messages: s.messages.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolCalls: (m.toolCalls ?? []).map((tc) =>
                            tc.id === invocationId
                              ? { ...tc, result: response, status: "done" as const }
                              : tc,
                          ),
                        }
                      : m,
                  ),
                },
          ),
        );
      };

      // 스트리밍 완료 후 최종 메시지 상태를 캡처하기 위한 ref
      let finalContent = "";
      let finalToolCalls: ToolInvocation[] | undefined = undefined;

      try {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyForRequest, enabledServerIds }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const parsed = parseSseLine(line.trim());
            if (!parsed) continue;

            if (parsed.error) {
              const errContent = `오류: ${parsed.error.message}`;
              setSessions((prev) =>
                prev.map((s) =>
                  s.id !== targetId
                    ? s
                    : {
                        ...s,
                        updatedAt: Date.now(),
                        messages: s.messages.map((m) =>
                          m.id === assistantId
                            ? { ...m, content: errContent }
                            : m,
                        ),
                      },
                ),
              );
              updateMessage(assistantId, errContent).catch(() => {});
              setIsResponding(false);
              return;
            }

            if (parsed.toolCall) {
              appendToolCall(parsed.toolCall.name, parsed.toolCall.args);
            }

            if (parsed.toolResult) {
              resolveToolCall(parsed.toolResult.name, parsed.toolResult.response);
            }

            if (parsed.text) {
              finalContent += parsed.text;
              setSessions((prev) =>
                prev.map((s) =>
                  s.id !== targetId
                    ? s
                    : {
                        ...s,
                        updatedAt: Date.now(),
                        messages: s.messages.map((m) =>
                          m.id === assistantId
                            ? { ...m, content: m.content + parsed.text }
                            : m,
                        ),
                      },
                ),
              );
            }
          }
        }

        // 스트리밍 완료 후 최종 상태를 DB에 저장
        setSessions((prev) => {
          const session = prev.find((s) => s.id === targetId);
          const msg = session?.messages.find((m) => m.id === assistantId);
          if (msg) {
            finalContent = msg.content;
            finalToolCalls = msg.toolCalls;
          }
          return prev;
        });
        updateMessage(assistantId, finalContent, finalToolCalls).catch(() => {});
        touchSession(targetId).catch(() => {});
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // AbortError 시에도 현재까지 스트리밍된 내용을 저장
          setSessions((prev) => {
            const session = prev.find((s) => s.id === targetId);
            const msg = session?.messages.find((m) => m.id === assistantId);
            if (msg) {
              updateMessage(assistantId, msg.content, msg.toolCalls).catch(() => {});
            }
            return prev;
          });
          return;
        }

        const errContent = "오류: 요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
        setSessions((prev) =>
          prev.map((s) =>
            s.id !== targetId
              ? s
              : {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantId ? { ...m, content: errContent } : m,
                  ),
                },
          ),
        );
        updateMessage(assistantId, errContent).catch(() => {});
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setIsResponding(false);
      }
    },
    [isResponding, activeId],
  );

  return {
    sessions,
    activeId,
    activeSession,
    messages,
    isResponding,
    newSession,
    selectSession,
    renameSession,
    deleteSession,
    clearAll,
    sendMessage,
    stop,
    cleanup,
  };
}

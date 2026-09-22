"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Lightbulb,
  Send,
  Brain,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_ACTIONS = [
  { label: "Explain a concept", icon: BookOpen },
  { label: "Teach me with an example", icon: Lightbulb },
  { label: "Quiz me", icon: Brain },
  { label: "Why was I wrong?", icon: MessageCircle },
  { label: "Make a study plan", icon: Sparkles },
];

const FOLLOW_UP_ACTIONS = [
  "Explain simpler",
  "Give another example",
  "Quiz me on this",
];

export function TutorChat({ currentTopicId }: { currentTopicId?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [examMode, setExamMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; retryMessage: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, error]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  }, [input]);

  async function copyMessage(id: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);

      setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    } catch {
      // Clipboard may be unavailable.
    }
  }

  function getLastUserMessage(index: number) {
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i]?.role === "user") {
        return messages[i]?.content ?? "";
      }
    }

    return "";
  }

  async function regenerate(index: number) {
    const lastUserMessage = getLastUserMessage(index);

    if (!lastUserMessage || sending) return;

    setMessages((prev) => prev.slice(0, Math.max(0, index - 1)));
    await send(lastUserMessage);
  }

  async function send(text: string) {
    if (!text.trim() || sending) return;

    setError(null);
    setInput("");

    const userMessage: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };

    const assistantId = `stream-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: "",
      },
    ]);

    setSending(true);

    try {
      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: text.trim(),
          currentTopicId,
          examMode,
        }),
      });

      if (!res.ok) {
        let body: { error?: string; conversationId?: string } = {};

        try {
          body = await res.json();
        } catch {
          // Ignore invalid error JSON.
        }

        setConversationId(body.conversationId ?? conversationId);

        setMessages((prev) =>
          prev.filter((m) => m.id !== assistantId),
        );

        setError({
          text: body.error ?? "Nova couldn't connect right now.",
          retryMessage: text,
        });

        return;
      }

      if (!res.body) {
        throw new Error("No response stream received.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const dataLine = event
            .split("\n")
            .find((line) => line.startsWith("data:"));

          if (!dataLine) continue;

          const jsonText = dataLine.slice(5).trim();

          if (!jsonText) continue;

          let data: {
            type?: string;
            conversationId?: string;
            content?: string;
            error?: string;
          };

          try {
            data = JSON.parse(jsonText);
          } catch {
            continue;
          }

          if (data.type === "start" && data.conversationId) {
            setConversationId(data.conversationId);
          }

          if (data.type === "chunk" && data.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + data.content }
                  : m,
              ),
            );
          }

          if (data.type === "done") {
            if (data.conversationId) {
              setConversationId(data.conversationId);
            }

            if (data.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: data.content! }
                    : m,
                ),
              );
            }
          }

          if (data.type === "error") {
            setMessages((prev) =>
              prev.filter((m) => m.id !== assistantId),
            );

            setError({
              text: data.error ?? "Nova couldn't connect right now.",
              retryMessage: text,
            });
          }
        }
      }

      buffer += decoder.decode();

      if (buffer.trim()) {
        const dataLine = buffer
          .split("\n")
          .find((line) => line.startsWith("data:"));

        if (dataLine) {
          try {
            const data = JSON.parse(dataLine.slice(5).trim());

            if (data.type === "chunk" && data.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + data.content }
                    : m,
                ),
              );
            }
          } catch {
            // Ignore incomplete final event.
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.filter((m) => m.id !== assistantId),
      );

      setError({
        text: "Nova couldn't connect right now.",
        retryMessage: text,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-line/70 bg-paper shadow-sm md:h-[calc(100dvh-6rem)]">

      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-line/70 bg-paper/95 px-4 py-3 backdrop-blur md:px-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-signal-soft ring-1 ring-signal/15">
            <Sparkles className="h-5 w-5 text-signal" strokeWidth={1.8} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-signal" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-ink">Nova</h1>
              <span className="rounded-full bg-signal-soft px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-signal">
                AI Tutor
              </span>
            </div>
            <p className="text-[11px] text-ink/45">
              Your personal study companion
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-1.5 rounded-full border border-line/70 bg-paper px-2.5 py-1 text-[10px] text-ink/45 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-signal" />
          Online
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-5 sm:px-5 md:px-8"
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-5">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
              <div className="relative mb-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-signal-soft shadow-sm ring-1 ring-signal/15">
                  <Sparkles className="h-8 w-8 text-signal" strokeWidth={1.5} />
                </div>
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-paper bg-cobalt">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              </div>

              <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                What are we learning today?
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-ink/50">
                Ask Nova to explain a concept, solve a problem, quiz you,
                or help you plan your study session.
              </p>

              <div className="mt-7 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTED_ACTIONS.map((action) => {
                  const Icon = action.icon;

                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => send(action.label)}
                      className="group flex items-center gap-3 rounded-xl border border-line/70 bg-paper px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cobalt/30 hover:bg-cobalt/5 hover:shadow-sm"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/5 transition-colors group-hover:bg-cobalt/10">
                        <Icon className="h-4 w-4 text-ink/55 group-hover:text-cobalt" />
                      </span>

                      <span className="text-xs font-medium text-ink/70 group-hover:text-ink">
                        {action.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((m, index) => (
            <div
              key={m.id}
              className={`flex w-full gap-2.5 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {m.role === "assistant" && (
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-signal-soft ring-1 ring-signal/10">
                  <Sparkles
                    className="h-4 w-4 text-signal"
                    strokeWidth={1.8}
                  />
                </div>
              )}

              <div
                className={`max-w-[92%] sm:max-w-[82%] ${
                  m.role === "user"
                    ? "rounded-2xl rounded-br-md bg-cobalt px-4 py-3 text-white shadow-sm"
                    : "rounded-2xl rounded-bl-md border border-line/60 bg-paper px-4 py-3 text-ink shadow-sm"
                }`}
              >
                {m.role === "assistant" && !m.content ? (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal [animation-delay:-300ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal [animation-delay:-150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal" />
                    </div>
                    <span className="text-xs text-ink/45">
                      Nova is thinking
                    </span>
                  </div>
                ) : m.role === "user" ? (
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {m.content}
                  </p>
                ) : (
                  <div>
                    <div className="prose prose-sm max-w-none leading-6 prose-p:my-2 prose-headings:mb-2 prose-headings:mt-5 prose-headings:font-semibold prose-pre:overflow-x-auto prose-code:rounded-md prose-code:bg-ink/5 prose-code:px-1 prose-code:py-0.5">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>

                    {messages[messages.length - 1]?.id === m.id &&
                      !sending && (
                        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line/50 pt-3">
                          {FOLLOW_UP_ACTIONS.map((action) => (
                            <button
                              key={action}
                              type="button"
                              onClick={() => {
                                if (action === "Explain simpler") {
                                  send(
                                    "Explain your previous answer in simpler words with an easy example.",
                                  );
                                } else if (action === "Give another example") {
                                  send(
                                    "Give me another simple example related to your previous answer.",
                                  );
                                } else {
                                  send(
                                    "Quiz me on the concept you just explained.",
                                  );
                                }
                              }}
                              className="rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-medium text-ink/55 transition-all hover:border-cobalt/30 hover:bg-cobalt/5 hover:text-cobalt"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}

                    <div className="mt-2 flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => copyMessage(m.id, m.content)}
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] text-ink/40 transition hover:bg-ink/5 hover:text-ink/70"
                        title="Copy answer"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="h-3 w-3 text-signal" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => regenerate(index)}
                        disabled={sending}
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] text-ink/40 transition hover:bg-ink/5 hover:text-ink/70 disabled:opacity-40"
                        title="Regenerate answer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Regenerate
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const lastUserMessage = getLastUserMessage(index);

                          if (lastUserMessage) {
                            send(
                              `Explain this in simpler words with a very easy example: ${lastUserMessage}`,
                            );
                          }
                        }}
                        disabled={sending}
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] text-ink/40 transition hover:bg-ink/5 hover:text-ink/70 disabled:opacity-40"
                        title="Explain simpler"
                      >
                        <Lightbulb className="h-3 w-3" />
                        Explain
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Error */}
          {error && (
            <div className="flex justify-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mastery-attention/10">
                <Sparkles className="h-4 w-4 text-mastery-attention" />
              </div>

              <div className="rounded-2xl rounded-bl-md border border-mastery-attention/20 bg-mastery-attention/5 px-4 py-3">
                <p className="text-sm text-ink/75">{error.text}</p>
                <button
                  type="button"
                  onClick={() => send(error.retryMessage)}
                  className="mt-2 text-xs font-semibold text-cobalt underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-line/70 bg-paper px-3 pb-3 pt-3 sm:px-5">
        <div className="mx-auto max-w-4xl">
          {messages.length > 0 && !sending && (
            <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1">
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-ink/35">
                Quick ask
              </span>

              {["Explain simpler", "Give an example", "Quiz me"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => send(item)}
                  className="shrink-0 rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] text-ink/50 transition hover:border-cobalt/30 hover:text-cobalt"
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="relative rounded-2xl border border-line bg-paper shadow-sm transition-all focus-within:border-cobalt/40 focus-within:ring-2 focus-within:ring-cobalt/5"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-2">
              <button
                type="button"
                onClick={() => setExamMode((prev) => !prev)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                  examMode
                    ? "bg-cobalt/10 text-cobalt"
                    : "text-ink/45 hover:bg-ink/5 hover:text-ink/70"
                }`}
              >
                <span>{examMode ? "🎯" : "📝"}</span>
                {examMode ? "Exam Mode ON" : "Exam Mode"}
              </button>

              {examMode && (
                <span className="text-[10px] text-cobalt/60">
                  Exam-focused answers
                </span>
              )}
            </div>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask Nova anything..."
              rows={1}
              maxLength={4000}
              className="max-h-[140px] min-h-[48px] w-full resize-none bg-transparent px-4 pb-12 pt-3.5 pr-14 text-sm leading-6 text-ink outline-none placeholder:text-ink/35"
            />

            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
              <span className="text-[10px] text-ink/30">
                {input.length > 0 ? `${input.length}/4000` : "Enter to send"}
              </span>

              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-cobalt text-white shadow-sm transition-all hover:bg-cobalt/90 disabled:cursor-not-allowed disabled:opacity-30"
                title={sending ? "Nova is thinking" : "Send message"}
              >
                {sending ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Send className="h-3.5 w-3.5" strokeWidth={2} />
                )}
              </button>
            </div>
          </form>

          <p className="mt-2 text-center text-[9px] text-ink/25">
            Nova can make mistakes. Verify important answers.
          </p>
        </div>
      </div>
    </div>
  );
}







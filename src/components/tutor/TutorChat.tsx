"use client";

import { useEffect, useRef, useState } from "react";
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
  Mic,
  MicOff,
  Paperclip,
  Camera,
  Image as ImageIcon,
  X,
  AlertCircle,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

/* -------------------------------------------------------------------------- */
/*                         SAFE NOVA MARKDOWN / MATH                          */
/* -------------------------------------------------------------------------- */

function normalizeTutorMarkdown(input: string): string {
  if (!input) return "";

  let text = input.replace(/\r\n/g, "\n");

  // Convert completed ```math / ```latex fences to display math.
  text = text.replace(
    /```(?:math|latex)\s*\n?([\s\S]*?)\n?```/gi,
    (_match, body: string) => {
      const value = body.trim();
      return value ? `\n\n$$\n${value}\n$$\n\n` : "";
    },
  );

  // While streaming, close an unfinished math fence temporarily so raw
  // ```math / ```latex never appears in the UI.
  text = text.replace(
    /```(?:math|latex)\s*\n?([\s\S]*)$/gi,
    (_match, body: string) => {
      const value = body.trim();
      return value ? `\n\n$$\n${value}\n$$\n` : "";
    },
  );

  // Convert common LaTeX display/inline delimiters.
  text = text.replace(
    /\\\[\s*([\s\S]*?)\s*\\\]/g,
    (_match, body: string) => `\n\n$$\n${body.trim()}\n$$\n\n`,
  );

  text = text.replace(
    /\\\(\s*([\s\S]*?)\s*\\\)/g,
    (_match, body: string) => `$${body.trim()}$`,
  );

  // Remove empty display blocks created by streaming.
  text = text.replace(/\$\$\s*\$\$/g, "");

  return text;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePreviews?: string[];
}

interface SelectedImage {
  file: File;
  preview: string;
}

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

const SUGGESTED_ACTIONS = [
  {
    label: "Explain a concept",
    description: "Break down any topic simply",
    icon: BookOpen,
  },
  {
    label: "Teach me with an example",
    description: "Learn it step by step",
    icon: Lightbulb,
  },
  {
    label: "Quiz me",
    description: "Test what you know",
    icon: Brain,
  },
  {
    label: "Why was I wrong?",
    description: "Understand your mistakes",
    icon: MessageCircle,
  },
  {
    label: "Make a study plan",
    description: "Plan your preparation",
    icon: Sparkles,
  },
];

const FOLLOW_UP_ACTIONS = [
  "Explain simpler",
  "Give another example",
  "Quiz me on this",
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not preview image"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Could not read image"));
    };

    reader.readAsDataURL(file);
  });
}

export function TutorChat({
  currentTopicId,
}: {
  currentTopicId?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<
    string | undefined
  >(undefined);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [examMode, setExamMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [selectedImages, setSelectedImages] = useState<
    SelectedImage[]
  >([]);

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [listening, setListening] = useState(false);

  const [error, setError] = useState<{
    text: string;
    retryMessage: string;
    retryImages?: SelectedImage[];
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, error]);

  useEffect(() => {
    const textarea = inputRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height =
      `${Math.min(textarea.scrollHeight, 140)}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignore cleanup errors.
      }
    };
  }, []);

  async function copyMessage(
    id: string,
    content: string,
  ) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);

      window.setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    } catch {
      // Ignore clipboard errors.
    }
  }

  function findPreviousUserMessage(index: number) {
    for (let i = index - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "user") {
        return messages[i];
      }
    }

    return null;
  }

  async function regenerate(index: number) {
    if (sending) return;

    const previousUser =
      findPreviousUserMessage(index);

    if (!previousUser) return;

    setMessages((current) =>
      current.slice(0, index),
    );

    await sendMessage(previousUser.content);
  }

  async function selectImages(files: FileList | null) {
    if (!files || files.length === 0) return;

    setShowAttachMenu(false);

    const incoming = Array.from(files);

    if (
      selectedImages.length + incoming.length >
      MAX_IMAGES
    ) {
      setError({
        text: `Maximum ${MAX_IMAGES} images can be attached.`,
        retryMessage: "",
      });

      return;
    }

    const valid: SelectedImage[] = [];

    for (const file of incoming) {
      if (!file.type.startsWith("image/")) {
        setError({
          text: "Only image files are supported.",
          retryMessage: "",
        });

        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError({
          text: `${file.name} is larger than 20 MB.`,
          retryMessage: "",
        });

        continue;
      }

      try {
        const preview = await fileToDataUrl(file);

        valid.push({
          file,
          preview,
        });
      } catch {
        setError({
          text: `Could not read ${file.name}.`,
          retryMessage: "",
        });
      }
    }

    if (valid.length > 0) {
      setSelectedImages((current) => [
        ...current,
        ...valid,
      ]);

      setError(null);
    }
  }

  function removeImage(index: number) {
    setSelectedImages((current) =>
      current.filter((_, i) => i !== index),
    );
  }

  function toggleVoice() {
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore.
      }

      setListening(false);
      return;
    }

    const browserWindow = window as any;

    const SpeechRecognition =
      browserWindow.SpeechRecognition ||
      browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError({
        text:
          "Voice input isn't supported here. Try Chrome in a regular browser tab.",
        retryMessage: "",
      });

      return;
    }

    if (
      typeof window !== "undefined" &&
      window.isSecureContext === false
    ) {
      setError({
        text:
          "Voice input needs a secure (https) connection to work.",
        retryMessage: "",
      });

      return;
    }

    function startRecognition() {
      const recognition = new SpeechRecognition();

      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";

        for (
          let i = event.resultIndex;
          i < event.results.length;
          i += 1
        ) {
          transcript +=
            event.results[i][0]?.transcript || "";
        }

        if (transcript) {
          setInput((current) => {
            const separator =
              current.trim().length > 0 ? " " : "";

            return current + separator + transcript;
          });
        }
      };

      recognition.onerror = (event: any) => {
        setListening(false);
        recognitionRef.current = null;

        const reason = event?.error as
          | string
          | undefined;

        const messages: Record<string, string> = {
          "not-allowed":
            "Microphone access was blocked. Allow microphone permission and try again.",
          "service-not-allowed":
            "Microphone access was blocked. Allow microphone permission and try again.",
          "audio-capture":
            "No microphone was found on this device.",
          network:
            "Voice input needs an internet connection.",
          "no-speech":
            "Didn't catch that — try speaking again.",
        };

        if (reason && reason !== "no-speech") {
          setError({
            text:
              messages[reason] ??
              `Voice input stopped (${reason}).`,
            retryMessage: "",
          });
        }
      };

      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch {
        setListening(false);
        recognitionRef.current = null;

        setError({
          text: "Couldn't start voice input. Please try again.",
          retryMessage: "",
        });
      }
    }

    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((track) =>
            track.stop(),
          );

          startRecognition();
        })
        .catch((err: any) => {
          const name = err?.name as string | undefined;

          setError({
            text:
              name === "NotAllowedError" ||
              name === "PermissionDeniedError"
                ? "Microphone access was denied. Allow microphone permission and try again."
                : name === "NotFoundError"
                  ? "No microphone was found on this device."
                  : "Couldn't access the microphone on this device.",
            retryMessage: "",
          });
        });

      return;
    }

    startRecognition();
  }

  async function sendMessage(
    messageText: string,
    imagesOverride?: SelectedImage[],
  ) {
    if (sending) return;

    const images =
      imagesOverride !== undefined
        ? imagesOverride
        : selectedImages;

    const cleanMessage = messageText.trim();

    if (!cleanMessage && images.length === 0) {
      return;
    }

    const finalMessage =
      cleanMessage ||
      "Please analyze this image and help me understand it.";

    setSending(true);
    setError(null);
    setShowAttachMenu(false);

    const imagePreviews = images.map(
      (image) => image.preview,
    );

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: finalMessage,
        imagePreviews:
          imagePreviews.length > 0
            ? imagePreviews
            : undefined,
      },
    ]);

    setInput("");
    setSelectedImages([]);

    try {
      let body: BodyInit;
      let headers: HeadersInit | undefined;

      if (images.length > 0) {
        const formData = new FormData();

        if (conversationId) {
          formData.append(
            "conversationId",
            conversationId,
          );
        }

        formData.append("message", finalMessage);

        if (currentTopicId) {
          formData.append(
            "currentTopicId",
            currentTopicId,
          );
        }

        formData.append(
          "examMode",
          String(examMode),
        );

        for (const image of images) {
          formData.append(
            "images",
            image.file,
            image.file.name,
          );
        }

        body = formData;
      } else {
        headers = {
          "Content-Type": "application/json",
        };

        body = JSON.stringify({
          conversationId,
          message: finalMessage,
          currentTopicId,
          examMode,
        });
      }

      const response = await fetch(
        "/api/tutor/chat",
        {
          method: "POST",
          headers,
          body,
        },
      );

      if (!response.ok || !response.body) {
        const text = await response.text();

        throw new Error(
          text || "Nova could not answer.",
        );
      }

      const reader =
        response.body.getReader();

      const decoder = new TextDecoder();

      let buffer = "";
      let assistantContent = "";
      let assistantId = crypto.randomUUID();

      function updateAssistant(
        content: string,
      ) {
        setMessages((current) => {
          const exists = current.some(
            (message) =>
              message.id === assistantId,
          );

          if (!exists) {
            return [
              ...current,
              {
                id: assistantId,
                role: "assistant",
                content,
              },
            ];
          }

          return current.map((message) => {
            if (message.id !== assistantId) {
              return message;
            }

            return {
              ...message,
              content,
            };
          });
        });
      }

      function processLine(line: string) {
        const trimmed = line.trim();

        if (!trimmed.startsWith("data:")) {
          return;
        }

        const payload = trimmed
          .slice(5)
          .trim();

        if (!payload || payload === "[DONE]") {
          return;
        }

        let data: any;

        try {
          data = JSON.parse(payload);
        } catch {
          return;
        }

        if (data.type === "start") {
          if (data.messageId) {
            assistantId = data.messageId;
          }

          return;
        }

        if (data.type === "chunk") {
          assistantContent += data.content || "";

          updateAssistant(assistantContent);

          return;
        }

        if (data.type === "done") {
          if (data.conversationId) {
            setConversationId(
              data.conversationId,
            );
          }

          if (data.content) {
            assistantContent = data.content;

            updateAssistant(assistantContent);
          }

          return;
        }

        if (data.type === "error") {
          throw new Error(
            data.message ||
              "Nova could not answer.",
          );
        }
      }

      while (true) {
        const result = await reader.read();

        if (result.done) break;

        buffer += decoder.decode(
          result.value,
          {
            stream: true,
          },
        );

        const lines = buffer.split("\n");

        buffer = lines.pop() || "";

        for (const line of lines) {
          processLine(line);
        }
      }

      if (buffer.trim()) {
        processLine(buffer);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong.";

      setError({
        text: message,
        retryMessage: finalMessage,
        retryImages:
          images.length > 0
            ? images
            : undefined,
      });
    } finally {
      setSending(false);
    }
  }

  function submitForm(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    void sendMessage(input);
  }

  function useSuggestion(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  function useFollowUp(text: string) {
    void sendMessage(text);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-paper">

      {/* HEADER */}

      <header className="flex shrink-0 items-center justify-between border-b border-line/60 bg-paper px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">

          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-cobalt/20 bg-cobalt/10">
            <Sparkles className="h-4 w-4 text-cobalt" />

            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-emerald-500" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-ink">
                Nova
              </h1>

              <span className="rounded-full bg-cobalt/10 px-2 py-0.5 text-[10px] font-semibold text-cobalt">
                AI Tutor
              </span>
            </div>

            <p className="text-[11px] text-muted">
              Your personal study assistant
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-1.5 rounded-full border border-line/70 bg-ink/5 px-3 py-1.5 text-[11px] font-medium text-ink sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Ready
        </div>
      </header>

      {/* CHAT */}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-4xl px-4 py-7 sm:px-6 sm:py-9">

          {/* EMPTY STATE */}

          {messages.length === 0 && !sending ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center py-8 text-center">

              <div className="relative mb-7">
                <div className="absolute inset-0 scale-150 rounded-full bg-cobalt/10 blur-3xl" />

                <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] border border-cobalt/15 bg-cobalt/10">
                  <Sparkles className="h-8 w-8 text-cobalt" />
                </div>
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                What are we learning today?
              </h2>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted sm:text-[15px]">
                Ask Nova anything about your studies.
                Explain concepts, solve questions,
                analyze photos, or prepare for exams.
              </p>

              <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
                {SUGGESTED_ACTIONS.map(
                  (action) => {
                    const Icon = action.icon;

                    return (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() =>
                          useSuggestion(
                            action.label,
                          )
                        }
                        className="group flex items-center gap-3 rounded-2xl border border-line/70 bg-ink/5 p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-cobalt/30 hover:bg-cobalt/5"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cobalt/10 text-cobalt">
                          <Icon className="h-[18px] w-[18px]" />
                        </span>

                        <span>
                          <span className="block text-sm font-semibold text-ink">
                            {action.label}
                          </span>

                          <span className="mt-0.5 block text-xs text-muted">
                            {action.description}
                          </span>
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          ) : null}

          {/* MESSAGES */}

          <div className="space-y-7">
            {messages.map(
              (message, index) => {
                const isUser =
                  message.role === "user";

                return (
                  <div
                    key={message.id}
                    className={
                      isUser
                        ? "flex justify-end"
                        : "flex items-start gap-3"
                    }
                  >

                    {!isUser ? (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cobalt/20 bg-cobalt/10">
                        <Sparkles className="h-3.5 w-3.5 text-cobalt" />
                      </div>
                    ) : null}

                    <div
                      className={
                        isUser
                          ? "max-w-[92%] sm:max-w-[78%]"
                          : "min-w-0 w-full max-w-[92%] sm:max-w-[82%]"
                      }
                    >

                      {/* IMAGES */}

                      {isUser &&
                      message.imagePreviews &&
                      message.imagePreviews.length > 0 ? (
                        <div className="mb-2 flex flex-wrap justify-end gap-2">
                          {message.imagePreviews.map(
                            (
                              image,
                              imageIndex,
                            ) => (
                              <div
                                key={`${message.id}-${imageIndex}`}
                                className="overflow-hidden rounded-2xl border border-line bg-ink/5"
                              >
                                <img
                                  src={image}
                                  alt={`Attached image ${imageIndex + 1}`}
                                  className="max-h-60 max-w-[260px] object-cover"
                                />
                              </div>
                            ),
                          )}
                        </div>
                      ) : null}

                      {/* MESSAGE BUBBLE */}

                      <div
                        className={
                          isUser
                            ? "rounded-[22px] rounded-br-md bg-cobalt px-4 py-3 text-white shadow-md shadow-cobalt/20"
                            : "rounded-[22px] rounded-bl-md border border-line/70 bg-ink/5 px-5 py-4 text-ink shadow-sm"
                        }
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap text-sm leading-6 text-white">
                            {message.content}
                          </p>
                        ) : (
                          <div className="prose prose-sm max-w-none prose-headings:text-ink prose-p:text-ink prose-p:leading-7 prose-li:text-ink prose-strong:text-ink prose-code:rounded prose-code:bg-cobalt/10 prose-code:px-1 prose-code:text-cobalt">
                            <ReactMarkdown
                              remarkPlugins={[
                                remarkGfm,
                                remarkMath,
                              ]}
                              rehypePlugins={[
                                rehypeKatex,
                              ]}
                            >
                              {normalizeTutorMarkdown(
                                message.content,
                              )}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* ACTIONS */}

                      {!isUser ? (
                        <div className="mt-1.5 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              void copyMessage(
                                message.id,
                                message.content,
                              )
                            }
                            className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-muted transition hover:bg-ink/5 hover:text-ink"
                          >
                            {copiedId ===
                            message.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void regenerate(
                                index,
                              )
                            }
                            disabled={sending}
                            className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-muted transition hover:bg-ink/5 hover:text-ink disabled:opacity-40"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Regenerate</span>
                          </button>
                        </div>
                      ) : null}

                      {/* FOLLOW UPS */}

                      {!isUser &&
                      index ===
                        messages.length - 1 &&
                      !sending ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {FOLLOW_UP_ACTIONS.map(
                            (action) => (
                              <button
                                key={action}
                                type="button"
                                onClick={() =>
                                  useFollowUp(
                                    action,
                                  )
                                }
                                className="rounded-full border border-line/70 bg-ink/5 px-3.5 py-2 text-xs font-medium text-ink shadow-sm transition hover:border-cobalt/30 hover:bg-cobalt/10 hover:text-cobalt"
                              >
                                {action}
                              </button>
                            ),
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              },
            )}

            {/* NOVA THINKING */}

            {sending &&
            (messages.length === 0 ||
              messages[messages.length - 1]
                .role === "user") ? (
              <div className="flex items-start gap-3">

                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cobalt/20 bg-cobalt/10">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-cobalt" />
                </div>

                <div className="flex items-center gap-3 rounded-[22px] rounded-bl-md border border-line/70 bg-ink/5 px-4 py-3.5 shadow-sm">

                  <span className="text-sm font-medium text-ink">
                    Nova is thinking
                  </span>

                  <span className="flex items-center gap-1">
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-cobalt/70"
                      style={{
                        animationDelay: "0ms",
                      }}
                    />

                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-cobalt/70"
                      style={{
                        animationDelay: "150ms",
                      }}
                    />

                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-cobalt/70"
                      style={{
                        animationDelay: "300ms",
                      }}
                    />
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ERROR */}

      {error ? (
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <div className="mb-2 flex items-start justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 shadow-sm">
            <div className="flex min-w-0 items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <span className="leading-5">
                {error.text}
              </span>
            </div>

            {error.retryMessage ? (
              <button
                type="button"
                onClick={() =>
                  void sendMessage(
                    error.retryMessage,
                    error.retryImages,
                  )
                }
                className="shrink-0 rounded-lg border border-red-500/20 bg-ink/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
              >
                Retry
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* COMPOSER */}

      <div className="shrink-0 border-t border-line/60 bg-paper px-3 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto w-full max-w-4xl">

          {/* SELECTED IMAGES */}

          {selectedImages.length > 0 ? (
            <div className="mb-2.5 flex flex-wrap gap-2">
              {selectedImages.map(
                (image, index) => (
                  <div
                    key={`${image.file.name}-${index}`}
                    className="group relative"
                  >
                    <div className="overflow-hidden rounded-xl border border-line bg-ink/5 shadow-sm">
                      <img
                        src={image.preview}
                        alt={`Selected ${index + 1}`}
                        className="h-16 w-16 object-cover"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeImage(index)
                      }
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white shadow-md transition hover:scale-110"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ),
              )}
            </div>
          ) : null}

          {/* COMPOSER */}

          <form
            onSubmit={submitForm}
            className="flex items-end gap-1.5 rounded-[24px] border border-line/80 bg-ink/5 p-1.5 shadow-lg shadow-black/10 transition-all focus-within:border-cobalt/40 focus-within:bg-ink/10"
          >

            {/* ATTACHMENT */}

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowAttachMenu(
                    (current) => !current,
                  )
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] text-muted transition hover:bg-ink/10 hover:text-ink"
                title="Attach"
              >
                <Paperclip className="h-[18px] w-[18px]" />
              </button>

              {showAttachMenu ? (
                <div className="absolute bottom-12 left-0 z-20 w-52 overflow-hidden rounded-2xl border border-line bg-paper p-1.5 shadow-xl shadow-black/30">

                  <button
                    type="button"
                    onClick={() =>
                      galleryInputRef.current?.click()
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink transition hover:bg-cobalt/10"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cobalt/10 text-cobalt">
                      <ImageIcon className="h-4 w-4" />
                    </span>

                    <span>
                      <span className="block font-medium text-ink">
                        Photo library
                      </span>

                      <span className="text-[10px] text-muted">
                        Choose from your device
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      cameraInputRef.current?.click()
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink transition hover:bg-cobalt/10"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cobalt/10 text-cobalt">
                      <Camera className="h-4 w-4" />
                    </span>

                    <span>
                      <span className="block font-medium text-ink">
                        Take photo
                      </span>

                      <span className="text-[10px] text-muted">
                        Use your camera
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink transition hover:bg-cobalt/10"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cobalt/10 text-cobalt">
                      <Paperclip className="h-4 w-4" />
                    </span>

                    <span>
                      <span className="block font-medium text-ink">
                        Upload image
                      </span>

                      <span className="text-[10px] text-muted">
                        Up to 20 MB
                      </span>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                void selectImages(
                  event.target.files,
                );
                event.target.value = "";
              }}
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(event) => {
                void selectImages(
                  event.target.files,
                );
                event.target.value = "";
              }}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                void selectImages(
                  event.target.files,
                );
                event.target.value = "";
              }}
            />

            {/* TEXT INPUT */}

            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  void sendMessage(input);
                }
              }}
              rows={1}
              placeholder={
                listening
                  ? "Listening..."
                  : "Ask Nova anything..."
              }
              className="max-h-[140px] min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-6 text-ink outline-none placeholder:text-muted"
            />

            {/* EXAM MODE */}

            <button
              type="button"
              onClick={() =>
                setExamMode(
                  (current) => !current,
                )
              }
              className={
                examMode
                  ? "hidden h-9 shrink-0 items-center justify-center rounded-xl bg-cobalt/10 px-3 text-xs font-semibold text-cobalt sm:flex"
                  : "hidden h-9 shrink-0 items-center justify-center rounded-xl px-3 text-xs font-medium text-muted transition hover:bg-ink/10 hover:text-ink sm:flex"
              }
              title="Toggle exam mode"
            >
              Exam
            </button>

            {/* VOICE */}

            <button
              type="button"
              onClick={toggleVoice}
              className={
                listening
                  ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-red-500/10 text-red-400"
                  : "flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] text-muted transition hover:bg-ink/10 hover:text-ink"
              }
              title={
                listening
                  ? "Stop listening"
                  : "Voice input"
              }
            >
              {listening ? (
                <MicOff className="h-[18px] w-[18px]" />
              ) : (
                <Mic className="h-[18px] w-[18px]" />
              )}
            </button>

            {/* SEND */}

            <button
              type="submit"
              disabled={
                sending ||
                (!input.trim() &&
                  selectedImages.length === 0)
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-cobalt text-white shadow-sm shadow-cobalt/20 transition hover:bg-cobalt/90 disabled:cursor-not-allowed disabled:opacity-35"
              title="Send"
            >
              <Send className="h-[17px] w-[17px]" />
            </button>
          </form>

          <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-muted">
            <span>Nova can make mistakes.</span>
            <span>•</span>
            <span>Check important answers.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

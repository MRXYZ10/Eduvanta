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
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

import { normalizeTutorMarkdown } from "./normalizeTutorMarkdown";

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
    icon: BookOpen,
  },
  {
    label: "Teach me with an example",
    icon: Lightbulb,
  },
  {
    label: "Quiz me",
    icon: Brain,
  },
  {
    label: "Why was I wrong?",
    icon: MessageCircle,
  },
  {
    label: "Make a study plan",
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
          "Voice input is not supported in this browser. Try Chrome or Edge.",
        retryMessage: "",
      });

      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

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

    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
      recognitionRef.current = null;
    }
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
    <div className="flex h-full min-h-0 flex-col bg-paper">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
      >
        <div className="mx-auto w-full max-w-4xl">
          {messages.length === 0 && !sending ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-cobalt/10">
                <Sparkles className="h-8 w-8 text-cobalt" />
              </div>

              <h2 className="text-2xl font-bold text-ink">
                Hi, I&apos;m Nova 👋
              </h2>

              <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
                Ask me anything about your
                studies. You can also send a
                photo of a question and I&apos;ll
                help you solve it.
              </p>

              <div className="mt-7 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
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
                        className="flex items-center gap-3 rounded-xl border border-line/70 bg-white/70 px-4 py-3 text-left text-sm transition hover:border-cobalt/30 hover:bg-cobalt/5"
                      >
                        <Icon className="h-4 w-4 text-cobalt" />
                        <span>
                          {action.label}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          ) : null}

          <div className="space-y-6">
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
                        : "flex justify-start"
                    }
                  >
                    <div
                      className={
                        isUser
                          ? "max-w-[90%] sm:max-w-[78%]"
                          : "w-full max-w-[90%] sm:max-w-[82%]"
                      }
                    >
                      {isUser &&
                      message.imagePreviews &&
                      message.imagePreviews.length >
                        0 ? (
                        <div className="mb-2 flex flex-wrap justify-end gap-2">
                          {message.imagePreviews.map(
                            (
                              image,
                              imageIndex,
                            ) => (
                              <img
                                key={`${message.id}-${imageIndex}`}
                                src={image}
                                alt={`Attached image ${imageIndex + 1}`}
                                className="max-h-56 max-w-[240px] rounded-xl border border-line object-cover"
                              />
                            ),
                          )}
                        </div>
                      ) : null}

                      <div
                        className={
                          isUser
                            ? "rounded-2xl rounded-br-md bg-cobalt px-4 py-3 text-white shadow-sm"
                            : "rounded-2xl rounded-bl-md border border-line/60 bg-white px-4 py-4 text-ink shadow-sm"
                        }
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap text-sm leading-6">
                            {message.content}
                          </p>
                        ) : (
                          <div className="prose prose-sm max-w-none prose-headings:text-ink prose-p:text-ink prose-li:text-ink prose-strong:text-ink">
                            <ReactMarkdown
                              remarkPlugins={[
                                remarkGfm,
                                remarkMath,
                              ]}
                              rehypePlugins={[
                                rehypeKatex,
                              ]}
                              children={normalizeTutorMarkdown(
                                message.content,
                              )}
                            />
                          </div>
                        )}
                      </div>

                      {!isUser ? (
                        <div className="mt-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              void copyMessage(
                                message.id,
                                message.content,
                              )
                            }
                            className="rounded-lg p-2 text-muted transition hover:bg-line/30 hover:text-ink"
                            title="Copy"
                          >
                            {copiedId ===
                            message.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
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
                            className="rounded-lg p-2 text-muted transition hover:bg-line/30 hover:text-ink disabled:opacity-40"
                            title="Regenerate"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}

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
                                className="rounded-full border border-line/70 bg-white px-3 py-1.5 text-xs text-muted transition hover:border-cobalt/30 hover:bg-cobalt/5"
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
          </div>
        </div>
      </div>

      {error ? (
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error.text}</span>

            {error.retryMessage ? (
              <button
                type="button"
                onClick={() =>
                  void sendMessage(
                    error.retryMessage,
                    error.retryImages,
                  )
                }
                className="shrink-0 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100"
              >
                Retry
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="shrink-0 border-t border-line/60 bg-paper/80 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto w-full max-w-4xl">
          {selectedImages.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedImages.map((image, index) => (
                <div
                  key={`${image.file.name}-${index}`}
                  className="relative"
                >
                  <img
                    src={image.preview}
                    alt={`Selected ${index + 1}`}
                    className="h-16 w-16 rounded-lg border border-line object-cover"
                  />

                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white shadow"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={submitForm}
            className="flex items-end gap-2 rounded-2xl border border-line/70 bg-white px-2 py-2 shadow-sm"
          >
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowAttachMenu((current) => !current)
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-line/30 hover:text-ink"
                title="Attach"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              {showAttachMenu ? (
                <div className="absolute bottom-11 left-0 z-10 w-44 overflow-hidden rounded-xl border border-line/70 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink transition hover:bg-line/20"
                  >
                    <ImageIcon className="h-4 w-4 text-muted" />
                    Photo library
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink transition hover:bg-line/20"
                  >
                    <Camera className="h-4 w-4 text-muted" />
                    Take photo
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink transition hover:bg-line/20"
                  >
                    <Paperclip className="h-4 w-4 text-muted" />
                    Upload file
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
                void selectImages(event.target.files);
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
                void selectImages(event.target.files);
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
                void selectImages(event.target.files);
                event.target.value = "";
              }}
            />

            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(input);
                }
              }}
              rows={1}
              placeholder="Ask Nova anything..."
              className="max-h-[140px] min-h-[36px] flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-ink outline-none placeholder:text-muted"
            />

            <button
              type="button"
              onClick={toggleVoice}
              className={
                listening
                  ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"
                  : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-line/30 hover:text-ink"
              }
              title={listening ? "Stop listening" : "Voice input"}
            >
              {listening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setExamMode((current) => !current)}
              className={
                examMode
                  ? "hidden shrink-0 items-center justify-center rounded-xl bg-cobalt/10 px-2.5 text-xs font-medium text-cobalt sm:flex"
                  : "hidden shrink-0 items-center justify-center rounded-xl px-2.5 text-xs font-medium text-muted transition hover:bg-line/30 sm:flex"
              }
              title="Toggle exam mode"
            >
              Exam
            </button>

            <button
              type="submit"
              disabled={
                sending ||
                (!input.trim() && selectedImages.length === 0)
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cobalt text-white transition hover:bg-cobalt/90 disabled:opacity-40"
              title="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

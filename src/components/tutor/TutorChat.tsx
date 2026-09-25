"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

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

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: {
    transcript: string;
  };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((event: SpeechRecognitionEventLike) => void)
    | null;
  onerror:
    | ((event: { error: string }) => void)
    | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not preview image."));
      }
    };

    reader.onerror = () => {
      reject(new Error("Could not read image."));
    };

    reader.readAsDataURL(file);
  });
}

export function TutorChat({
  currentTopicId,
}: {
  currentTopicId?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    [],
  );

  const [conversationId, setConversationId] = useState<
    string | undefined
  >();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [examMode, setExamMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(
    null,
  );

  const [selectedImages, setSelectedImages] = useState<
    SelectedImage[]
  >([]);

  const [showAttachMenu, setShowAttachMenu] =
    useState(false);

  const [listening, setListening] = useState(false);

  const [error, setError] = useState<{
    text: string;
    retryMessage: string;
    retryImages?: SelectedImage[];
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const galleryInputRef =
    useRef<HTMLInputElement>(null);

  const cameraInputRef =
    useRef<HTMLInputElement>(null);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(null);

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

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      140,
    )}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
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
      // Clipboard unavailable.
    }
  }

  function getPreviousUserMessage(index: number) {
    for (let i = index - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "user") {
        return messages[i];
      }
    }

    return null;
  }

  async function regenerate(index: number) {
    if (sending) return;

    const userMessage =
      getPreviousUserMessage(index);

    if (!userMessage) return;

    setMessages((previous) =>
      previous.slice(0, index),
    );

    await sendMessage(
      userMessage.content,
      undefined,
    );
  }

  async function handleImageSelection(
    fileList: FileList | null,
  ) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    setShowAttachMenu(false);

    const incomingFiles = Array.from(fileList);

    if (
      selectedImages.length + incomingFiles.length >
      MAX_IMAGES
    ) {
      setError({
        text: `You can attach a maximum of ${MAX_IMAGES} images.`,
        retryMessage: "",
      });

      return;
    }

    const newImages: SelectedImage[] = [];

    for (const file of incomingFiles) {
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
        const preview =
          await readFileAsDataUrl(file);

        newImages.push({
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

    if (newImages.length > 0) {
      setSelectedImages((previous) => [
        ...previous,
        ...newImages,
      ]);

      setError(null);
    }
  }

  function removeImage(index: number) {
    setSelectedImages((previous) =>
      previous.filter((_, i) => i !== index),
    );
  }

  function toggleVoiceInput() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

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

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i += 1
      ) {
        transcript +=
          event.results[i]?.[0]?.transcript ?? "";
      }

      if (transcript) {
        setInput((previous) => {
          const separator =
            previous.trim().length > 0 ? " " : "";

          return `${previous}${separator}${transcript}`;
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

    const trimmedMessage = messageText.trim();

    if (!trimmedMessage && images.length === 0) {
      return;
    }

    const finalMessage =
      trimmedMessage ||
      "Please analyze this image and help me understand it.";

    setSending(true);
    setError(null);
    setShowAttachMenu(false);

    const previews = images.map(
      (image) => image.preview,
    );

    setMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: finalMessage,
        imagePreviews:
          previews.length > 0
            ? previews
            : undefined,
      },
    ]);

    setInput("");
    setSelectedImages([]);

    try {
      let requestBody: BodyInit;
      let requestHeaders: HeadersInit | undefined;

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

        requestBody = formData;
      } else {
        requestHeaders = {
          "Content-Type": "application/json",
        };

        requestBody = JSON.stringify({
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
          headers: requestHeaders,
          body: requestBody,
        },
      );

      if (!response.ok || !response.body) {
        const responseText =
          await response.text();

        throw new Error(
          responseText ||
            "Nova could not process the request.",
        );
      }

      const reader =
        response.body.getReader();

      const decoder = new TextDecoder();

      let buffer = "";
      let assistantContent = "";
      let assistantMessageId =
        crypto.randomUUID();

      function updateAssistantMessage(
        content: string,
      ) {
        setMessages((previous) => {
          const exists = previous.some(
            (message) =>
              message.id === assistantMessageId,
          );

          if (!exists) {
            return [
              ...previous,
              {
                id: assistantMessageId,
                role: "assistant",
                content,
              },
            ];
          }

          return previous.map((message) =>
            message.id ===
            assistantMessageId
              ? {
                  ...message,
                  content,
                }
              : message,
          );
        });
      }

      function processSseLine(line: string) {
        const trimmed = line.trim();

        if (!trimmed.startsWith("data:")) {
          return;
        }

        const payload = trimmed
          .slice(5)
          .trim();

        if (!payload) return;

        if (payload === "[DONE]") {
          return;
        }

        let data: {
          type?: string;
          messageId?: string;
          conversationId?: string;
          content?: string;
          message?: string;
        };

        try {
          data = JSON.parse(payload);
        } catch {
          return;
        }

        if (data.type === "start") {
          if (data.messageId) {
            assistantMessageId =
              data.messageId;
          }

          return;
        }

        if (data.type === "chunk") {
          const chunk = data.content ?? "";

          assistantContent += chunk;

          updateAssistantMessage(
            assistantContent,
          );

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

            updateAssistantMessage(
              assistantContent,
            );
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
        const { done, value } =
          await reader.read();

        if (done) break;

        buffer += decoder.decode(value, {
          stream: true,
        });

        const lines = buffer.split("\n");

        buffer = lines.pop() ?? "";

        for (const line of lines) {
          processSseLine(line);
        }
      }

      if (buffer.trim()) {
        processSseLine(buffer);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Something went wrong.";

      setError({
        text: errorMessage,
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

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
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
          {messages.length === 0 &&
            !sending && (
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
                    ({
                      label,
                      icon: Icon,
                    }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() =>
                          useSuggestion(label)
                        }
                        className="flex items-center gap-3 rounded-xl border border-line/70 bg-white/70 px-4 py-3 text-left text-sm transition hover:border-cobalt/30 hover:bg-cobalt/5"
                      >
                        <Icon className="h-4 w-4 text-cobalt" />
                        <span>{label}</span>
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

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
                        message.imagePreviews
                          .length > 0 && (
                          <div className="mb-2 flex flex-wrap justify-end gap-2">
                            {message.imagePreviews.map(
                              (
                                image,
                                imageIndex,
                              ) => (
                                <img
                                  key={`${message.id}-${imageIndex}`}
                                  src={image}
                                  alt={`Attached image ${
                                    imageIndex +
                                    1
                                  }`}
                                  className="max-h-56 max-w-[240px] rounded-xl border border-line object-cover"
                                />
                              ),
                            )}
                          </div>
                        )}

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
                            >
                              {normalizeTutorMarkdown(
                                message.content,
                              )}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {!isUser && (
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
                      
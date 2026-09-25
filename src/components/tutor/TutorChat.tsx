"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onstart: (() => void) | null;
  onresult:
    | ((event: SpeechRecognitionResultLike) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionResultLike {
  resultIndex: number;
  results: ArrayLike<
    ArrayLike<{
      transcript: string;
    }>
  >;
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<
    string | undefined
  >(undefined);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [examMode, setExamMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(
    null,
  );

  const [selectedImages, setSelectedImages] = useState<
    SelectedImage[]
  >([]);

  const [showAttachMenu, setShowAttachMenu] =
    useState(false);

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

  /* --------------------------------
     Auto scroll
  -------------------------------- */

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, error]);

  /* --------------------------------
     Auto resize textarea
  -------------------------------- */

  useEffect(() => {
    const textarea = inputRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      140,
    )}px`;
  }, [input]);

  /* --------------------------------
     Cleanup voice recognition
  -------------------------------- */

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort?.();
        recognitionRef.current?.stop();
      } catch {
        // Ignore cleanup errors.
      }

      recognitionRef.current = null;
    };
  }, []);

  /* --------------------------------
     Copy
  -------------------------------- */

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

  /* --------------------------------
     Find previous user message
  -------------------------------- */

  function getLastUserMessage(index: number) {
    for (let i = index - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "user") {
        return messages[i];
      }
    }

    return null;
  }

  /* --------------------------------
     Regenerate
  -------------------------------- */

  async function regenerate(index: number) {
    if (sending) return;

    const previousUser =
      getLastUserMessage(index);

    if (!previousUser) return;

    const userIndex = messages.findIndex(
      (message) =>
        message.id === previousUser.id,
    );

    setMessages((current) =>
      current.slice(
        0,
        Math.max(0, userIndex),
      ),
    );

    await sendMessage(
      previousUser.content,
      undefined,
    );
  }

  /* --------------------------------
     Select images
  -------------------------------- */

  async function selectImages(
    files: FileList | null,
  ) {
    if (!files || files.length === 0) return;

    setShowAttachMenu(false);

    const incoming = Array.from(files);

    if (
      selectedImages.length +
        incoming.length >
      MAX_IMAGES
    ) {
      setError({
        text: `You can attach maximum ${MAX_IMAGES} images.`,
        retryMessage: "",
      });

      return;
    }

    const validImages: SelectedImage[] = [];

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
        const preview =
          await fileToDataUrl(file);

        validImages.push({
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

    if (validImages.length > 0) {
      setSelectedImages((current) => [
        ...current,
        ...validImages,
      ]);

      setError(null);
    }
  }

  /* --------------------------------
     Remove image
  -------------------------------- */

  function removeImage(index: number) {
    setSelectedImages((current) =>
      current.filter(
        (_, imageIndex) =>
          imageIndex !== index,
      ),
    );
  }

  /* --------------------------------
     Voice input
  -------------------------------- */

  function toggleVoice() {
    if (typeof window === "undefined") {
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore.
      }

      recognitionRef.current = null;
      setListening(false);

      return;
    }

    const speechWindow =
      window as Window & {
        SpeechRecognition?: new () =>
          SpeechRecognitionLike;
        webkitSpeechRecognition?: new () =>
          SpeechRecognitionLike;
      };

    const SpeechRecognition =
      speechWindow.SpeechRecognition ??
      speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError({
        text:
          "Voice input is not supported in this browser. Try Chrome on Android.",
        retryMessage: "",
      });

      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    const startingText =
      input.trim();

    recognition.onstart = () => {
      setListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i += 1
      ) {
        transcript +=
          event.results[i]?.[0]
            ?.transcript ?? "";
      }

      const cleaned =
        transcript.trim();

      if (!cleaned) return;

      setInput(
        startingText
          ? `${startingText} ${cleaned}`
          : cleaned,
      );
    };

    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
    }
  }

  /* --------------------------------
     Send message
  -------------------------------- */

  async function sendMessage(
    messageText: string,
    imagesOverride?: SelectedImage[],
  ) {
    if (sending) return;

    const images =
      imagesOverride !== undefined
        ? imagesOverride
        : selectedImages;

    const cleanMessage =
      messageText.trim();

    if (
      !cleanMessage &&
      images.length === 0
    ) {
      return;
    }

    const finalMessage =
      cleanMessage ||
      "Please analyze this image and help me understand it.";

    setSending(true);
    setError(null);
    setShowAttachMenu(false);

    const imagePreviews =
      images.map(
        (image) => image.preview,
      );

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random()}`,
      role: "user",
      content: finalMessage,
      imagePreviews:
        imagePreviews.length > 0
          ? imagePreviews
          : undefined,
    };

    const assistantId =
      `assistant-${Date.now()}-${Math.random()}`;

    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: "",
      },
    ]);

    setInput("");
    setSelectedImages([]);

    try {
      let body: BodyInit;
      let headers: HeadersInit | undefined;

      /* ----------------------------
         Image request
      ---------------------------- */

      if (images.length > 0) {
        const formData =
          new FormData();

        if (conversationId) {
          formData.append(
            "conversationId",
            conversationId,
          );
        }

        formData.append(
          "message",
          finalMessage,
        );

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
        /* ----------------------------
           Normal text request
        ---------------------------- */

        headers = {
          "Content-Type":
            "application/json",
        };

        body = JSON.stringify({
          conversationId,
          message: finalMessage,
          currentTopicId,
          examMode,
        });
      }

      const response =
        await fetch(
          "/api/tutor/chat",
          {
            method: "POST",
            headers,
            body,
          },
        );

      if (!response.ok) {
        let errorBody: {
          error?: string;
          message?: string;
          conversationId?: string;
        } = {};

        try {
          errorBody =
            await response.json();
        } catch {
          // Ignore invalid JSON.
        }

        if (
          errorBody.conversationId
        ) {
          setConversationId(
            errorBody.conversationId,
          );
        }

        throw new Error(
          errorBody.error ??
            errorBody.message ??
            `Nova request failed (${response.status}).`,
        );
      }

      if (!response.body) {
        throw new Error(
          "Nova did not return a response stream.",
        );
      }

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      let buffer = "";

      let assistantContent = "";

      /* ----------------------------
         Update assistant
      ---------------------------- */

      function updateAssistant(
        content: string,
      ) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content,
                }
              : message,
          ),
        );
      }

      /* ----------------------------
         Process SSE event
      ---------------------------- */

      function processEvent(
        event: string,
      ) {
        const lines =
          event.split("\n");

        const dataLine =
          lines.find((line) =>
            line.startsWith(
              "data:",
            ),
          );

        if (!dataLine) return;

        const jsonText =
          dataLine
            .slice(5)
            .trim();

        if (
          !jsonText ||
          jsonText === "[DONE]"
        ) {
          return;
        }

        let data: {
          type?: string;
          messageId?: string;
          conversationId?: string;
          content?: string;
          message?: string;
          error?: string;
        };

        try {
          data =
            JSON.parse(jsonText);
        } catch {
          return;
        }

        /* start */

        if (
          data.type === "start"
        ) {
          if (
            data.conversationId
          ) {
            setConversationId(
              data.conversationId,
            );
          }

          if (
            data.messageId &&
            data.messageId !==
              assistantId
          ) {
            setMessages(
              (current) =>
                current.map(
                  (message) =>
                    message.id ===
                    assistantId
                      ? {
                          ...message,
                          id: data.messageId!,
                        }
                      : message,
                ),
            );
          }

          return;
        }

        /* chunk */

        if (
          data.type === "chunk"
        ) {
          if (data.content) {
            assistantContent +=
              data.content;

            updateAssistant(
              assistantContent,
            );
          }

          return;
        }

        /* done */

        if (
          data.type === "done"
        ) {
          if (
            data.conversationId
          ) {
            setConversationId(
              data.conversationId,
            );
          }

          if (
            typeof data.content ===
            "string"
          ) {
            assistantContent =
              data.content;

            updateAssistant(
              assistantContent,
            );
          }

          return;
        }

        /* error */

        if (
          data.type === "error"
        ) {
          throw new Error(
            data.error ??
              data.message ??
              "Nova could not answer.",
          );
        }
      }

      /* ----------------------------
         Read stream
      ---------------------------- */

      while (true) {
        const {
          done,
          value,
        } = await reader.read();

        if (done) break;

        buffer +=
          decoder.decode(
            value,
            {
              stream: true,
            },
          );

        const events =
          buffer.split(
            "\n\n",
          );

        buffer =
          events.pop() ?? "";

        for (const event of events) {
          processEvent(event);
        }
      }

      /* Flush decoder */

      buffer +=
        decoder.decode();

      if (buffer.trim()) {
        processEvent(buffer);
      }
    } catch (err) {
      setMessages((current) =>
        current.filter(
          (message) =>
            message.id !==
            assistantId,
        ),
      );

      const errorText =
        err instanceof Error
          ? err.message
          : "Nova could not connect right now.";

      setError({
        text: errorText,
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

  /* --------------------------------
     Form submit
  -------------------------------- */

  function submitForm(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    void sendMessage(input);
  }

  /* --------------------------------
     Suggestion
  -------------------------------- */

  function useSuggestion(
    text: string,
  ) {
    setInput(text);
    inputRef.current?.focus();
  }

  /* --------------------------------
     Follow up
  -------------------------------- */

  function useFollowUp(
    action: string,
  ) {
    if (
      action ===
      "Explain simpler"
    ) {
      void sendMessage(
        "Explain your previous answer in simpler words with an easy example.",
      );

      return;
    }

    if (
      action ===
      "Give another example"
    ) {
      void sendMessage(
        "Give me another simple example related to your previous answer.",
      );

      return;
    }

    void sendMessage(
      "Quiz me on the concept you just explained.",
    );
  }

  /* --------------------------------
     UI
  -------------------------------- */

  return (
    <div className="nova-shell flex h-[calc(100dvh-7rem)] min-h-[520px] flex-col overflow-hidden rounded-[30px] border border-line/60 bg-paper shadow-2xl md:h-[calc(100dvh-6rem)]">

      {/* ============================
          HEADER
      ============================ */}

      <header className="flex shrink-0 items-center justify-between border-b border-line/60 bg-paper/70 px-4 py-3 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-3">

          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-signal-soft ring-1 ring-signal/20">
            <Sparkles
              className="h-5 w-5 text-signal"
              strokeWidth={1.7}
            />

            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-signal" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="bg-gradient-to-r from-ink via-cobalt to-signal bg-clip-text text-sm font-bold tracking-tight text-transparent">
                Nova
              </h1>

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
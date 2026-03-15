import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";

interface FeatureRequestItem {
  id: string;
  userId: string;
  message: string;
  pageUrl?: string;
  createdAt: string;
}

const MAX_MESSAGE_LENGTH = 2000;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FeatureRequestScreen() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [requests, setRequests] = useState<FeatureRequestItem[]>([]);

  const remaining = useMemo(
    () => MAX_MESSAGE_LENGTH - message.length,
    [message.length]
  );

  const loadRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const response = await apiClient("/api/feature-requests", { method: "GET" });
      if (!response.ok) {
        throw new Error(`Failed to load feature requests (${response.status})`);
      }

      const data = (await response.json()) as FeatureRequestItem[];
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load feature requests:", error);
      toast.error("Unable to load previous requests.");
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleSubmit = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 3) {
      toast.error("Please write at least 3 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient("/api/feature-requests", {
        method: "POST",
        body: JSON.stringify({
          message: trimmedMessage,
          pageUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const messageFromApi =
          typeof errorData?.error === "string" ? errorData.error : null;
        throw new Error(messageFromApi || `Failed to submit (${response.status})`);
      }

      const created = (await response.json()) as FeatureRequestItem;
      setRequests((prev) => [created, ...prev]);
      setMessage("");
      toast.success("Feature request sent.");
    } catch (error) {
      console.error("Failed to submit feature request:", error);
      const err = error as Error;
      toast.error(err.message || "Failed to submit feature request.");
    } finally {
      setIsSubmitting(false);
    }
  }, [message]);

  return (
    <motion.div
      key="feature-request"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen w-full px-4 py-20"
    >
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="space-y-2">
          <p
            className="text-[10px] uppercase tracking-[0.25em] text-[#1a1a1a]/45"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Product Feedback
          </p>
          <h1
            className="text-4xl text-[#1a1a1a]"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}
          >
            Request a Feature
          </h1>
          <p
            className="text-sm text-[#1a1a1a]/55"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Share what would make your speaking practice better.
          </p>
        </div>

        <div className="border border-[#1a1a1a]/15 bg-[#ffffff]/35 p-5 sm:p-6">
          <label
            htmlFor="feature-message"
            className="text-[10px] uppercase tracking-[0.2em] text-[#1a1a1a]/45"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          >
            Your idea
          </label>

          <textarea
            id="feature-message"
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder="Example: Add AI feedback history filters by score trend..."
            rows={6}
            className="mt-3 w-full resize-y border border-[#1a1a1a]/20 bg-transparent px-4 py-3 text-sm text-[#1a1a1a] outline-none placeholder:text-[#1a1a1a]/35 focus:border-[#1a1a1a]/45"
            style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
          />

          <div className="mt-3 flex items-center justify-between gap-4">
            <span
              className="text-[10px] tracking-[0.1em] text-[#1a1a1a]/45"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {remaining} characters remaining
            </span>

            <motion.button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              whileHover={isSubmitting ? {} : { backgroundColor: "rgba(26, 26, 26, 0.92)" }}
              whileTap={isSubmitting ? {} : { scale: 0.98 }}
              className="px-6 py-3 bg-[#1a1a1a] text-[#FDF6F0]/90 text-[11px] tracking-[0.2em] uppercase transition-all duration-300 disabled:cursor-wait disabled:opacity-55"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              {isSubmitting ? "Sending..." : "Send request"}
            </motion.button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-sm uppercase tracking-[0.2em] text-[#1a1a1a]/55"
              style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
            >
              Your recent requests
            </h2>
          </div>

          {isLoadingRequests ? (
            <div className="border border-dashed border-[#1a1a1a]/20 px-6 py-8 text-center">
              <p
                className="text-sm text-[#1a1a1a]/55"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                Loading requests...
              </p>
            </div>
          ) : requests.length === 0 ? (
            <div className="border border-dashed border-[#1a1a1a]/20 px-6 py-8 text-center">
              <p
                className="text-sm text-[#1a1a1a]/55"
                style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
              >
                No feature requests yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <article
                  key={request.id}
                  className="border border-[#1a1a1a]/15 bg-[#ffffff]/30 px-4 py-4"
                >
                  <p
                    className="text-sm leading-relaxed text-[#1a1a1a]/85"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    {request.message}
                  </p>
                  <p
                    className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[#1a1a1a]/45"
                    style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
                  >
                    {formatDate(request.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}


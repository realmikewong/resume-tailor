"use client";

import { useState } from "react";

export function RequestForm() {
  const [description, setDescription] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) {
      setState("error");
      setErrorMsg("Please describe your request in at least 10 characters.");
      return;
    }
    setState("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/roadmap/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't submit");
      }
      setState("sent");
      setDescription("");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Couldn't submit");
    }
  }

  if (state === "sent") {
    return <p className="mt-2 text-green-700">Thanks — your request is in. I read every one.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="What would you like to see?"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
      />
      {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
      <button
        type="submit"
        disabled={state === "sending"}
        className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Submit request"}
      </button>
    </form>
  );
}

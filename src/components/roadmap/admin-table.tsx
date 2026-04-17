"use client";

import { useState } from "react";
import type { RoadmapItem, RoadmapStatus } from "@/lib/roadmap/types";
import { ROADMAP_STATUSES, STATUS_LABELS } from "@/lib/roadmap/types";

export function AdminTable({ initialItems }: { initialItems: RoadmapItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/roadmap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || null,
          status: "backlog",
        }),
      });
      if (!res.ok) throw new Error("create failed");
      const { item } = (await res.json()) as { item: RoadmapItem };
      setItems((cur) => [item, ...cur]);
      setNewTitle("");
      setNewDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(id: string, status: RoadmapStatus) {
    const prev = items;
    setItems(items.map((i) => (i.id === id ? { ...i, status } : i)));
    const res = await fetch(`/api/admin/roadmap/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) setItems(prev);
    else {
      const { item } = (await res.json()) as { item: RoadmapItem };
      setItems((cur) => cur.map((i) => (i.id === id ? item : i)));
    }
  }

  async function updateContent(id: string, patch: { title?: string; description?: string | null }): Promise<boolean> {
    const res = await fetch(`/api/admin/roadmap/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setError("Couldn't save — please try again.");
      return false;
    }
    const { item } = (await res.json()) as { item: RoadmapItem };
    setItems((cur) => cur.map((i) => (i.id === id ? item : i)));
    return true;
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item? Votes are also deleted.")) return;
    const res = await fetch(`/api/admin/roadmap/${id}`, { method: "DELETE" });
    if (res.ok) setItems((cur) => cur.filter((i) => i.id !== id));
  }

  return (
    <div className="mt-6">
      <form onSubmit={createItem} className="bg-white border rounded-lg p-4 space-y-3">
        <h2 className="font-sans font-bold">Add feature</h2>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Title"
          className="w-full px-3 py-2 border border-gray-300 rounded"
          required
        />
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Markdown description (optional)"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? "Adding\u2026" : "Add"}
        </button>
      </form>

      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="text-left text-sm text-gray-500 border-b">
            <th className="py-2">Title</th>
            <th>Status</th>
            <th>Votes</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <AdminRow
              key={item.id}
              item={item}
              onStatusChange={(s) => updateStatus(item.id, s)}
              onEdit={(patch) => updateContent(item.id, patch)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminRow({
  item,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  item: RoadmapItem;
  onStatusChange: (s: RoadmapStatus) => void;
  onEdit: (patch: { title?: string; description?: string | null }) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");

  return (
    <tr className="border-b align-top">
      <td className="py-3 pr-3">
        {editing ? (
          <div className="space-y-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-2 py-1 border rounded" />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-2 py-1 border rounded font-mono text-sm"
            />
            <button
              type="button"
              onClick={async () => {
                const ok = await onEdit({ title, description: description || null });
                if (ok) setEditing(false);
              }}
              className="text-blue-600 text-sm"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle(item.title);
                setDescription(item.description ?? "");
                setEditing(false);
              }}
              className="ml-3 text-gray-500 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div>
            <div className="font-medium">{item.title}</div>
            {item.description && <div className="text-sm text-gray-600">{item.description}</div>}
          </div>
        )}
      </td>
      <td className="py-3 pr-3">
        <select
          aria-label={`Status for ${item.title}`}
          value={item.status}
          onChange={(e) => onStatusChange(e.target.value as RoadmapStatus)}
          className="px-2 py-1 border rounded"
        >
          {ROADMAP_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </td>
      <td className="py-3 pr-3 text-sm">{item.vote_count}</td>
      <td className="py-3 pr-3 text-sm text-gray-500">
        {new Date(item.created_at).toLocaleDateString()}
      </td>
      <td className="py-3 text-sm whitespace-nowrap">
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-blue-600 mr-3">Edit</button>
        )}
        <button type="button" onClick={onDelete} className="text-red-600">Delete</button>
      </td>
    </tr>
  );
}

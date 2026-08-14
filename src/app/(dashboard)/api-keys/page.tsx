"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Copy, Trash, KeySquare, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  masked: string;
  created: string;
  lastUsed: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [permission, setPermission] = useState("Full Access");
  const [expiry, setExpiry] = useState("Never");
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/keys");
        if (!res.ok) throw new Error("Failed to load API keys");
        const data = await res.json();
        setKeys(data.keys ?? []);
      } catch {
        toast.error("Failed to load API keys");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCreate = async () => {
    if (!keyName.trim()) {
      toast.error("Key name is required");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create API key");
      }
      const data = await res.json();

      setKeys((prev) => [data.key, ...prev]);
      setNewlyCreatedKey(data.secret);
      toast.success("API key created");

      setKeyName("");
      setPermission("Full Access");
      setExpiry("Never");
    } catch (err: any) {
      toast.error(err.message || "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete API key");
      }
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("API key deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
          <p className="text-muted-foreground text-sm">Manage your API keys for programmatic access.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors duration-200 self-start sm:self-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create New Key
        </Button>
      </div>

      <div className="bg-card border border-border shadow-sm overflow-hidden rounded-none">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Key</th>
              <th className="px-6 py-4 font-medium">Created</th>
              <th className="px-6 py-4 font-medium">Last Used</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin inline-block" />
                </td>
              </tr>
            ) : (
              <>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-border hover:bg-muted/30 transition-colors duration-200">
                    <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                      <KeySquare className="w-4 h-4 text-muted-foreground" />
                      {k.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">{k.masked}</td>
                    <td className="px-6 py-4 text-muted-foreground">{k.created}</td>
                    <td className="px-6 py-4 text-muted-foreground">{k.lastUsed}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-none transition-colors duration-200" onClick={() => copyToClipboard(k.masked)}>
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-destructive rounded-none transition-colors duration-200" onClick={() => deleteKey(k.id)}>
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {keys.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No API keys found. Create one to get started.
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="bg-card border border-border p-6 shadow-sm mt-8 rounded-none">
        <h3 className="text-lg font-medium text-foreground mb-4">Quickstart Example</h3>
        <div className="bg-[#111827] text-white p-4 font-mono text-sm overflow-x-auto rounded-none">
          <pre>
{`curl -X POST https://api.lipi.ai/v1/extract \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@nepal_gazette.pdf" \\
  -F "model=lipi-extract-v2"`}
          </pre>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-4 sm:p-6 border border-border shadow-lg rounded-none relative max-h-[90vh] overflow-y-auto">
            {!newlyCreatedKey && (
              <Button variant="ghost" size="sm" className="absolute top-4 right-4 h-8 w-8 p-0 rounded-none text-muted-foreground hover:text-foreground transition-colors duration-200" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            )}

            {newlyCreatedKey ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-success font-medium mb-4">
                  <Check className="w-5 h-5" />
                  <h2>API Key Created Successfully</h2>
                </div>

                <p className="text-sm text-muted-foreground">
                  Please copy this key now. You won't be able to see it again!
                </p>

                <div className="flex items-center gap-2 bg-muted p-3 border border-border rounded-none">
                  <code className="flex-1 text-sm font-mono break-all text-foreground">{newlyCreatedKey}</code>
                  <Button variant="outline" size="sm" className="rounded-none h-8 px-2 transition-colors duration-200" onClick={() => copyToClipboard(newlyCreatedKey)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>

                <div className="flex justify-end mt-6">
                  <Button onClick={() => {
                    setShowModal(false);
                    setNewlyCreatedKey(null);
                  }} className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200">
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4">Create API Key</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Key Name</label>
                    <input
                      type="text"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      className="w-full h-10 px-3 border border-border bg-background text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
                      placeholder="e.g. Production App"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Permissions</label>
                    <select
                      value={permission}
                      onChange={(e) => setPermission(e.target.value)}
                      className="w-full h-10 px-3 border border-border bg-background text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
                    >
                      <option value="Full Access">Full Access</option>
                      <option value="Read Only">Read Only</option>
                      <option value="Write Only">Write Only</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Expiry</label>
                    <select
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full h-10 px-3 border border-border bg-background text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
                    >
                      <option value="Never">Never</option>
                      <option value="30 days">30 days</option>
                      <option value="90 days">90 days</option>
                      <option value="1 year">1 year</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-none transition-colors duration-200">
                      Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={creating} className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200">
                      {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

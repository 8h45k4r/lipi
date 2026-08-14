"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash, Shield, ShieldAlert, Mail, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [inviteMessage, setInviteMessage] = useState("");

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/team');
      if (!res.ok) throw new Error('Failed to fetch team members');
      const data = await res.json();
      setMembers(data);
    } catch (error) {
      toast.error('Could not load team members');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail) {
      try {
        const res = await fetch('/api/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole, message: inviteMessage })
        });
        if (!res.ok) throw new Error('Failed to invite member');
        
        const newMember = await res.json();
        setMembers([...members, newMember]);
        toast.success(`Invite sent to ${inviteEmail}`);
        setIsInviteModalOpen(false);
        setInviteEmail("");
        setInviteRole("Member");
        setInviteMessage("");
      } catch (error) {
        toast.error('Failed to send invite');
      }
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from the team?`)) {
      try {
        const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to remove member');
        
        setMembers(members.filter(m => m.id !== id));
        toast.success("Team member removed");
      } catch (error) {
        toast.error('Failed to remove member');
      }
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Failed to update role');
      
      setMembers(members.map(m => m.id === id ? { ...m, role: newRole } : m));
      toast.success("Role updated");
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="text-muted-foreground text-sm">Manage who has access to this workspace.</p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-none">
          <Plus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      <div className="bg-card border border-border shadow-sm overflow-hidden rounded-none">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading team members...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-muted-foreground">No team members found.</td>
              </tr>
            ) : (
              members.map(member => (
                <tr key={member.id} className="border-b border-border hover:bg-muted/30 transition-colors duration-200">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-primary/10 flex items-center justify-center font-medium text-primary border border-primary/20 rounded-none">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{member.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {member.role === 'Owner' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium border bg-primary/10 text-primary border-primary/20 rounded-none">
                        <ShieldAlert className="w-3 h-3" />
                        {member.role}
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="bg-transparent border border-border text-xs px-2 py-1 rounded-none focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Member">Member</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${member.status === 'Active' ? 'text-success' : 'text-warning'}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {member.role !== 'Owner' && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-destructive rounded-none" onClick={() => handleRemove(member.id, member.name)}>
                        <Trash className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-md w-full max-w-md p-6 rounded-none space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Invite Team Member</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsInviteModalOpen(false)} className="rounded-none h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded-none"
                  placeholder="colleague@lipi.ai"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded-none"
                >
                  <option value="Admin">Admin</option>
                  <option value="Member">Member</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Personal Message (Optional)</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded-none resize-none h-20"
                  placeholder="Join me on Lipi to process documents..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)} className="rounded-none">
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-none">
                  Send Invite
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

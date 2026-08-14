"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash, ShieldAlert, Mail, X, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  hasAccount?: boolean;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [inviteMessage, setInviteMessage] = useState("");
  const [createLogin, setCreateLogin] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const resetInviteForm = () => {
    setIsInviteModalOpen(false);
    setInviteEmail("");
    setInviteRole("Member");
    setInviteMessage("");
    setCreateLogin(false);
    setInviteName("");
    setInvitePassword("");
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    if (createLogin && invitePassword.length < 8) {
      toast.error("Temporary password must be at least 8 characters");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: Record<string, string> = {
        email: inviteEmail,
        role: inviteRole,
        message: inviteMessage,
      };
      if (createLogin) {
        payload.name = inviteName;
        payload.password = invitePassword;
      }
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to invite member');

      setMembers([...members, data]);
      toast.success(
        createLogin
          ? `${inviteEmail} added with an active login`
          : `Invite sent to ${inviteEmail}`,
      );
      resetInviteForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invite');
    } finally {
      setIsSubmitting(false);
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="text-muted-foreground text-sm">Manage who has access to this workspace.</p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-none self-start sm:self-auto">
          <Plus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      <div className="bg-card border border-border shadow-sm overflow-hidden rounded-none">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm text-left">
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
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate flex items-center gap-1.5">
                          <span className="truncate">{member.name}</span>
                          {member.hasAccount && (
                            <span
                              title="This member has a login and can sign in."
                              className="inline-flex items-center gap-1 px-1.5 py-px text-[10px] font-medium border bg-success/10 text-success border-success/20 rounded-none shrink-0"
                            >
                              <KeyRound className="w-2.5 h-2.5" />
                              Has login
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{member.email}</span>
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
      </div>

      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-md w-full max-w-md p-4 sm:p-6 rounded-none space-y-4 max-h-[90vh] overflow-y-auto">
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
              <div className="border border-border bg-muted/10 p-3 space-y-3 rounded-none">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <label className="text-sm font-medium text-foreground">Create login now</label>
                    <p className="text-xs text-muted-foreground">
                      Set a temporary password so this person can sign in immediately.
                    </p>
                  </div>
                  <div
                    className={`w-9 h-5 border border-border relative shrink-0 cursor-pointer transition-colors duration-200 rounded-none ${createLogin ? 'bg-primary' : 'bg-muted'}`}
                    onClick={() => setCreateLogin(!createLogin)}
                  >
                    <div className={`w-4 h-4 bg-background border border-border absolute top-[1px] transition-all duration-200 rounded-none ${createLogin ? 'left-[17px]' : 'left-[1px]'}`}></div>
                  </div>
                </div>
                {createLogin && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Full Name</label>
                      <input
                        type="text"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded-none"
                        placeholder="Sita Sharma"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Temporary Password</label>
                      <input
                        type="password"
                        required={createLogin}
                        minLength={8}
                        value={invitePassword}
                        onChange={(e) => setInvitePassword(e.target.value)}
                        className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary rounded-none"
                        placeholder="At least 8 characters"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      They sign in with this email and password, and should change the password after
                      their first login. If this email already has a Lipi account, that account is
                      linked instead and its password stays unchanged.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetInviteForm} className="rounded-none">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-none">
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {createLogin ? 'Add Member' : 'Send Invite'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

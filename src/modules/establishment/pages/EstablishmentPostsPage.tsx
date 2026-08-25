import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Wallet, ArrowLeft, Users, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { StatCardSkeleton } from '@/shared/components/Skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useEstablishmentPosts,
  useEstablishmentEmployees,
  useEstablishmentLastSyncedAt,
  useSaveEstablishmentPosts,
  useHydrateEstablishment,
  useEstablishmentAutoSync,
} from '../hooks/useEstablishment';
import { EstablishmentSyncStatusBadge } from '../components/EstablishmentSyncStatusBadge';
import { EstablishmentPostDesignationPicker } from '../components/EstablishmentPostDesignationPicker';
import { EstablishmentClassPicker } from '../components/EstablishmentClassPicker';
import { vacantFor } from '../types';
import type { EstablishmentPost } from '../types';

export function EstablishmentPostsPage() {
  const { toast } = useToast();
  const postsQuery = useEstablishmentPosts();
  const employeesQuery = useEstablishmentEmployees();
  const lastSyncedQuery = useEstablishmentLastSyncedAt();
  const savePostsMutation = useSaveEstablishmentPosts();
  const hydrateMutation = useHydrateEstablishment();
  const queryClient = useQueryClient();

  const lastSyncedAt = lastSyncedQuery.data ?? null;

  useEstablishmentAutoSync();

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'establishment:refresh') {
        queryClient.invalidateQueries({ queryKey: ['establishmentPosts'] });
        queryClient.invalidateQueries({ queryKey: ['establishmentLastSync'] });
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'establishment:refresh') {
        queryClient.invalidateQueries({ queryKey: ['establishmentPosts'] });
      }
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('storage', onStorage);
    };
  }, [queryClient]);

  const [postsDraft, setPostsDraft] = useState<EstablishmentPost[]>(() => postsQuery.data ?? []);
  const [postsTouched, setPostsTouched] = useState(false);

  // Keep draft in sync when backend data loads/changes (unless user is editing)
  useEffect(() => {
    if (postsQuery.data && !postsTouched) {
      setPostsDraft(postsQuery.data);
    }
  }, [postsQuery.data, postsTouched]);

  // Initial sync if draft was empty and data arrives later
  useEffect(() => {
    if (postsQuery.isSuccess && postsQuery.data.length > 0 && postsDraft.length === 0 && !postsTouched) {
      setPostsDraft(postsQuery.data);
    }
  }, [postsQuery.isSuccess, postsQuery.data, postsDraft.length, postsTouched]);

  const stats = useMemo(() => {
    const source = postsTouched ? postsDraft : postsQuery.data ?? postsDraft;
    const sanctioned = source.reduce((s, p) => s + p.sanctioned, 0);
    const filled = source.reduce((s, p) => s + p.filled, 0);
    const vacant = Math.max(0, sanctioned - filled);
    const totalPosts = source.length;
    return { sanctioned, filled, vacant, totalPosts };
  }, [postsDraft, postsQuery.data, postsTouched]);

  const employeeCount = employeesQuery.data?.length ?? 0;

  const handleSync = async () => {
    try {
      await hydrateMutation.mutateAsync();
      setPostsTouched(false);
      toast({ title: 'Synced', description: 'Sanctioned posts refreshed from backend.' });
    } catch (error) {
      toast({ title: 'Sync failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const updatePost = (postId: string, field: keyof EstablishmentPost, value: string | number) => {
    setPostsTouched(true);
    setPostsDraft((cur) =>
      cur.map((p) => {
        if (p.id !== postId) return p;
        const updated = { ...p, [field]: value };
        if (field === 'sanctioned' || field === 'filled') {
          const sanc = Number(field === 'sanctioned' ? value : p.sanctioned) || 0;
          const fill = Number(field === 'filled' ? value : p.filled) || 0;
          updated.sanctioned = sanc;
          updated.filled = fill;
        }
        return updated;
      })
    );
  };

  const addPost = () => {
    setPostsTouched(true);
    setPostsDraft((cur) => [
      ...cur,
      { id: crypto.randomUUID(), srNo: cur.length + 1, designation: '', cadreClass: '૩', sanctioned: 1, filled: 0 },
    ]);
  };

  const removePost = (postId: string) => {
    setPostsTouched(true);
    setPostsDraft((cur) => cur.filter((p) => p.id !== postId).map((p, i) => ({ ...p, srNo: i + 1 })));
  };

  const savePosts = async () => {
    try {
      // Auto-serial normalization before save — srNo follows visual order
      const normalized = postsDraft.map((p, i) => ({ ...p, srNo: i + 1 }));
      await savePostsMutation.mutateAsync(normalized);
      setPostsDraft(normalized);
      setPostsTouched(false);
      toast({ title: 'Posts Saved', description: 'Sanctioned post information updated.' });
    } catch (error) {
      toast({ title: 'Save failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const resetDraft = () => {
    setPostsDraft(postsQuery.data ?? []);
    setPostsTouched(false);
  };

  const isLoading = postsQuery.isLoading || employeesQuery.isLoading;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <WorkspaceHeader
        eyebrow="Establishment · મહેકમ માહિતી"
        title="Sanctioned Posts"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <EstablishmentSyncStatusBadge lastSyncedAt={lastSyncedAt} isHydrating={hydrateMutation.isPending} onSync={handleSync} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.history.back()}
              className="hidden sm:inline-flex"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">Manage sanctioned strength (મહેકમ) for your office — designation, cadre class, sanctioned vs filled positions. Feeds Page 9 of government pay bills.</p>
      </WorkspaceHeader>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="stat-tile p-4">
              <div className="stat-label flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Total Posts</div>
              <div className="stat-value">{stats.totalPosts}</div>
              <div className="stat-sub">{employeeCount} employees registered</div>
            </Card>
            <Card className="stat-tile stat-tile-accent border-l-blue-500 p-4">
              <div className="stat-label text-blue-600">Sanctioned Posts</div>
              <div className="stat-value">{stats.sanctioned}</div>
              <div className="stat-sub">મંજૂર જગ્યાઓ</div>
            </Card>
            <Card className="stat-tile stat-tile-accent border-l-emerald-500 p-4">
              <div className="stat-label text-emerald-600">Filled Posts</div>
              <div className="stat-value text-emerald-600">{stats.filled}</div>
              <div className="stat-sub">ભરાયેલ જગ્યાઓ</div>
            </Card>
            <Card className="stat-tile stat-tile-accent border-l-amber-500 p-4">
              <div className="stat-label text-amber-600">Vacant Posts</div>
              <div className="stat-value">{stats.vacant}</div>
              <div className="stat-sub">ખાલી જગ્યાઓ (મહેકમ)</div>
            </Card>
          </div>

          {/* Posts (મહેકમ માહિતી) */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">Sanctioned Posts (મહેકમ માહિતી)</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Vacant = Sanctioned − Filled · Feeds Page 9 (Establishment) of pay bills</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={addPost} className="bg-white dark:bg-slate-900">
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Post
                </Button>
                {postsTouched && (
                  <Button size="sm" variant="ghost" onClick={resetDraft} disabled={savePostsMutation.isPending}>
                    Reset
                  </Button>
                )}
                <Button size="sm" onClick={savePosts} disabled={!postsTouched || savePostsMutation.isPending} className="font-bold bg-blue-600 hover:bg-blue-700 text-white">
                  {savePostsMutation.isPending ? 'Saving…' : 'Save Posts'}
                </Button>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {postsDraft.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/20">
                  <div className="mx-auto h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No posts configured</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Add sanctioned posts for your office to track filled and vacant positions. This list is used in pay bill generation and establishment reports.
                  </p>
                  <Button size="sm" onClick={addPost} className="mt-4">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add First Post
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid gap-2 sm:grid-cols-12 items-end text-[10px] font-bold uppercase tracking-wide text-slate-400 px-1">
                    <div className="sm:col-span-1">Sr. — ક્રમ</div>
                    <div className="sm:col-span-4">Designation / Post — હોદ્દો</div>
                    <div className="sm:col-span-2">Class — વર્ગ</div>
                    <div className="sm:col-span-2">Sanctioned — મંજૂર</div>
                    <div className="sm:col-span-2">Filled — ભરાયેલ</div>
                    <div className="sm:col-span-1 text-right">Vacant</div>
                  </div>
                  {postsDraft.map((post, idx) => (
                    <div key={post.id} data-post-row className="grid gap-2 sm:grid-cols-12 items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 hover:border-blue-200 dark:hover:border-slate-700 transition-colors focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-200 dark:focus-within:border-blue-800">
                      <div className="sm:col-span-1">
                        <label className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Sr. — ક્રમ (auto)</label>
                        {/* Auto serial — read-only, keyboard skipped */}
                        <div
                          className="flex h-8 w-full items-center justify-center rounded-md border border-slate-200 bg-slate-100 dark:bg-slate-800 dark:border-slate-700 font-mono text-xs font-bold text-slate-700 dark:text-slate-300 select-none"
                          aria-label={`Serial number ${idx + 1} auto`}
                          title="Auto serial — ક્રમ આપોઆપ"
                          tabIndex={-1}
                        >
                          {idx + 1}
                        </div>
                      </div>
                      <div className="sm:col-span-4">
                        <label className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Designation — હોદ્દો</label>
                        <EstablishmentPostDesignationPicker
                          id={`establishment-post-${post.id}`}
                          value={post.designation}
                          onChange={(value) => updatePost(post.id, 'designation', value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Class — વર્ગ</label>
                        <EstablishmentClassPicker
                          id={`establishment-class-${post.id}`}
                          value={post.cadreClass ?? ''}
                          onChange={(value) => updatePost(post.id, 'cadreClass', value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Sanctioned — મંજૂર</label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={post.sanctioned}
                          onChange={(e) => updatePost(post.id, 'sanctioned', parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              // move focus to Filled of same row
                              const next = (e.currentTarget.closest('[data-post-row]') as HTMLElement | null)?.querySelector<HTMLInputElement>(`#establishment-filled-${post.id}`);
                              next?.focus();
                              next?.select();
                            }
                          }}
                          id={`establishment-sanctioned-${post.id}`}
                          aria-label={`Sanctioned for ${post.designation || `row ${idx + 1}`} — મંજૂર`}
                          className="money-input h-8 bg-white dark:bg-slate-900 font-mono font-bold focus-visible:ring-blue-600"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Filled — ભરાયેલ</label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={post.filled}
                          onChange={(e) => updatePost(post.id, 'filled', parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              // move to next row designation or Add
                              const rows = Array.from(document.querySelectorAll<HTMLInputElement>('[data-post-row] input, [data-post-row] button[role="combobox"]'));
                              const currentIdx = rows.indexOf(e.currentTarget);
                              rows[currentIdx + 2]?.focus();
                            }
                          }}
                          id={`establishment-filled-${post.id}`}
                          aria-label={`Filled for ${post.designation || `row ${idx + 1}`} — ભરાયેલ`}
                          className="money-input h-8 bg-white dark:bg-slate-900 font-mono font-bold focus-visible:ring-blue-600"
                        />
                      </div>
                      <div className="sm:col-span-1 flex items-center justify-between sm:justify-end gap-1">
                        <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Vacant</span>
                        <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 min-w-[1.5rem] text-right" aria-live="polite" aria-label={`Vacant ${vacantFor(post)}`}>{vacantFor(post)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 focus-visible:ring-rose-500"
                          onClick={() => removePost(post.id)}
                          title="Remove post (Delete)"
                          aria-label={`Remove post ${post.designation || idx + 1}`}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              removePost(post.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {postsDraft.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 mt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-400">Vacant = Sanctioned − Filled. Serial (ક્રમ) auto — આપોઆપ. This list feeds Page 9 (Establishment) of government pay bills.</p>
                    {postsTouched && <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">● Unsaved changes</span>}
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-lg px-2.5 py-1.5 border border-slate-100 dark:border-slate-800">
                    <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">Tab</kbd> / <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">Shift+Tab</kbd> to move ·
                    <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px] ml-1">↑ ↓</kbd> navigate ·
                    <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px] ml-1">Enter</kbd> select ·
                    <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px] ml-1">Esc</kbd> close ·
                    <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px] ml-1">૧ ૨ ૩ ૪</kbd> quick class
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Helper card */}
          <Card className="border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl p-4">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-blue-900 dark:text-blue-100">About મહેકમ માહિતી — Keyboard friendly</h3>
                <p className="mt-1 text-xs text-blue-700/80 dark:text-blue-300 leading-relaxed">
                  Sanctioned posts represent the approved strength for each cadre/designation in your office. <b>Serial (ક્રમ) auto</b> — order follows list position and updates automatically on add/remove.
                  Keep <b>Sanctioned</b> as per government sanction order, and <b>Filled</b> as currently occupied. Vacant is auto-calculated for Page 9. <b>Class (વર્ગ)</b> is a Gujarati dropdown (વર્ગ ૧–૪) — use mouse or keyboard (<kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">↑ ↓ Enter Esc</kbd>).
                  Designation picker is also fully keyboard navigable — <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">Tab</kbd> to focus, type to filter, <kbd className="px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">↑ ↓ Home End Enter</kbd> to select.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

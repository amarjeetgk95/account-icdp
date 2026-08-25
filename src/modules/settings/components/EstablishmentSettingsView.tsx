import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users, Layers, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { StatCardSkeleton } from '@/shared/components/Skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useEstablishmentPosts,
  useEstablishmentEmployees,
  useEstablishmentLastSyncedAt,
  useSaveEstablishmentPosts,
  useHydrateEstablishment,
  useEstablishmentAutoSync,
} from '@/modules/establishment/hooks/useEstablishment';
import { EstablishmentSyncStatusBadge } from '@/modules/establishment/components/EstablishmentSyncStatusBadge';
import { EstablishmentPostDesignationPicker } from '@/modules/establishment/components/EstablishmentPostDesignationPicker';
import { EstablishmentClassPicker } from '@/modules/establishment/components/EstablishmentClassPicker';
import { vacantFor } from '@/modules/establishment/types';
import type { EstablishmentPost } from '@/modules/establishment/types';

export function EstablishmentSettingsView() {
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

  useEffect(() => {
    if (postsQuery.data && !postsTouched) {
      setPostsDraft(postsQuery.data);
    }
  }, [postsQuery.data, postsTouched]);

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
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
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
      const normalized = postsDraft.map((p, i) => ({ ...p, srNo: i + 1 }));
      await savePostsMutation.mutateAsync(normalized);
      setPostsDraft(normalized);
      setPostsTouched(false);
      toast({ title: 'Posts Saved', description: 'Sanctioned post information updated.' });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const resetDraft = () => {
    setPostsDraft(postsQuery.data ?? []);
    setPostsTouched(false);
  };

  const isLoading = postsQuery.isLoading || employeesQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Top Banner with Stats & Sync */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            Sanctioned Posts &amp; Cadre Master (મહેકમ માહિતી)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure approved office cadre strength, designation names, class tiers (વર્ગ ૧–૪), and positions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <EstablishmentSyncStatusBadge
            lastSyncedAt={lastSyncedAt}
            isHydrating={hydrateMutation.isPending}
            onSync={handleSync}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* Quick Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="stat-tile p-4 border border-slate-200 dark:border-slate-800">
              <div className="stat-label flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <Layers className="h-3.5 w-3.5" /> Total Cadre Posts
              </div>
              <div className="stat-value text-xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalPosts}</div>
              <div className="stat-sub text-[11px] text-slate-400">{employeeCount} staff registered</div>
            </Card>
            <Card className="stat-tile p-4 border border-slate-200 dark:border-slate-800 border-l-4 border-l-blue-500">
              <div className="stat-label text-xs text-blue-600 font-semibold">Sanctioned Strength</div>
              <div className="stat-value text-xl font-bold text-blue-600 mt-1">{stats.sanctioned}</div>
              <div className="stat-sub text-[11px] text-slate-400">મંજૂર જગ્યાઓ</div>
            </Card>
            <Card className="stat-tile p-4 border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500">
              <div className="stat-label text-xs text-emerald-600 font-semibold">Occupied / Filled</div>
              <div className="stat-value text-xl font-bold text-emerald-600 mt-1">{stats.filled}</div>
              <div className="stat-sub text-[11px] text-slate-400">ભરાયેલ જગ્યાઓ</div>
            </Card>
            <Card className="stat-tile p-4 border border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500">
              <div className="stat-label text-xs text-amber-600 font-semibold">Vacant Positions</div>
              <div className="stat-value text-xl font-bold text-amber-600 mt-1">{stats.vacant}</div>
              <div className="stat-sub text-[11px] text-slate-400">ખાલી જગ્યાઓ (મહેકમ)</div>
            </Card>
          </div>

          {/* Posts Table */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-2xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div>
                <h3 className="text-sm font-bold uppercase text-slate-800 dark:text-slate-100">
                  Establishment Cadre Registry
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vacant = Sanctioned − Filled · Automatically feeds Page 9 (Establishment) of GTR-30 Pay Bills
                </p>
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
                <Button
                  size="sm"
                  onClick={savePosts}
                  disabled={!postsTouched || savePostsMutation.isPending}
                  className="font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {savePostsMutation.isPending ? 'Saving…' : 'Save Posts'}
                </Button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {postsDraft.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/20">
                  <div className="mx-auto h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No posts configured</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Add sanctioned posts for your office to track filled and vacant positions.
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
                    <div
                      key={post.id}
                      data-post-row
                      className="grid gap-2 sm:grid-cols-12 items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 hover:border-indigo-200 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="sm:col-span-1">
                        <label className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Sr. (auto)</label>
                        <div
                          className="flex h-8 w-full items-center justify-center rounded-md border border-slate-200 bg-slate-100 dark:bg-slate-800 dark:border-slate-700 font-mono text-xs font-bold text-slate-700 dark:text-slate-300 select-none"
                          tabIndex={-1}
                        >
                          {idx + 1}
                        </div>
                      </div>
                      <div className="sm:col-span-4">
                        <label className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Designation</label>
                        <EstablishmentPostDesignationPicker
                          id={`settings-establishment-post-${post.id}`}
                          value={post.designation}
                          onChange={(value) => updatePost(post.id, 'designation', value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Class</label>
                        <EstablishmentClassPicker
                          id={`settings-establishment-class-${post.id}`}
                          value={post.cadreClass ?? ''}
                          onChange={(value) => updatePost(post.id, 'cadreClass', value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Sanctioned</label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={post.sanctioned}
                          onChange={(e) => updatePost(post.id, 'sanctioned', parseInt(e.target.value) || 0)}
                          id={`settings-establishment-sanctioned-${post.id}`}
                          className="h-8 bg-white dark:bg-slate-900 font-mono font-bold focus-visible:ring-indigo-600"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Filled</label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={post.filled}
                          onChange={(e) => updatePost(post.id, 'filled', parseInt(e.target.value) || 0)}
                          id={`settings-establishment-filled-${post.id}`}
                          className="h-8 bg-white dark:bg-slate-900 font-mono font-bold focus-visible:ring-indigo-600"
                        />
                      </div>
                      <div className="sm:col-span-1 flex items-center justify-between sm:justify-end gap-1">
                        <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Vacant</span>
                        <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 min-w-[1.5rem] text-right">
                          {vacantFor(post)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600"
                          onClick={() => removePost(post.id)}
                          title="Remove post"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

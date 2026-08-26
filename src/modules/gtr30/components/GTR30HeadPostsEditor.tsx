import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GTR30PostItem } from '../types';

interface Props {
  posts: GTR30PostItem[];
  onChange: (posts: GTR30PostItem[]) => void;
}

/**
 * Edits the establishment (મહેકમ) post list attached to a single budget head.
 * Mirrors the vacant/total computation used on the bill's own post editor.
 */
export function GTR30HeadPostsEditor({ posts, onChange }: Props) {
  const updatePost = (postId: string, field: keyof GTR30PostItem, value: string | number) => {
    onChange(
      posts.map((post) => {
        if (post.id !== postId) return post;
        const updated: GTR30PostItem = { ...post, [field]: value };
        if (field === 'sanctioned' || field === 'filled') {
          const sanc = Number(field === 'sanctioned' ? value : post.sanctioned) || 0;
          const fill = Number(field === 'filled' ? value : post.filled) || 0;
          updated.vacant = Math.max(0, sanc - fill);
          updated.total = sanc;
        }
        return updated;
      })
    );
  };

  const addPost = () => {
    onChange([
      ...posts,
      {
        id: crypto.randomUUID(),
        srNo: String(posts.length + 1),
        designation: '',
        cadreClass: '૩',
        sanctioned: 1,
        filled: 0,
        vacant: 1,
        total: 1,
      },
    ]);
  };

  const removePost = (postId: string) => {
    onChange(posts.filter((p) => p.id !== postId));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">
          Establishment Posts (મહેકમ · Page 9) — {posts.length}
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addPost} className="text-xs h-8">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Post
        </Button>
      </div>
      {posts.length === 0 ? (
        <p className="text-xs text-slate-500 py-1">
          No posts yet for this budget head. Bills created with this head will fall back to the
          office default posts unless you add them here.
        </p>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="grid gap-2 sm:grid-cols-7 items-center bg-slate-50 p-2 rounded-lg border"
            >
              <div>
                <Label className="text-xs">Sr.</Label>
                <Input
                  value={post.srNo}
                  onChange={(e) => updatePost(post.id, 'srNo', e.target.value)}
                  className="h-8 text-xs font-serif"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Designation / Post</Label>
                <Input
                  value={post.designation}
                  onChange={(e) => updatePost(post.id, 'designation', e.target.value)}
                  placeholder="e.g. આંકડા અધિકારી"
                  className="h-8 text-xs font-serif font-bold"
                />
              </div>
              <div>
                <Label className="text-xs">Class (વર્ગ)</Label>
                <Input
                  value={post.cadreClass}
                  onChange={(e) => updatePost(post.id, 'cadreClass', e.target.value)}
                  className="h-8 text-xs font-serif"
                />
              </div>
              <div>
                <Label className="text-xs">Sanctioned</Label>
                <Input
                  type="number"
                  min="0"
                  value={post.sanctioned}
                  onChange={(e) => updatePost(post.id, 'sanctioned', parseInt(e.target.value) || 0)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Filled</Label>
                <Input
                  type="number"
                  min="0"
                  value={post.filled}
                  onChange={(e) => updatePost(post.id, 'filled', parseInt(e.target.value) || 0)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex items-end gap-1">
                <div className="flex-1">
                  <Label className="text-xs">Vacant</Label>
                  <Input value={post.vacant} disabled className="h-8 text-xs bg-slate-100 font-bold" />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Remove post"
                  onClick={() => removePost(post.id)}
                  className="h-8 w-8 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

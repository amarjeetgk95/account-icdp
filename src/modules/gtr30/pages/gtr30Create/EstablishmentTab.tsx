import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import type { GTR30FormData, GTR30PostItem } from '../../types';

export interface EstablishmentTabProps {
  data: GTR30FormData;
  setField: (field: keyof GTR30FormData, value: string | number) => void;
  updatePost: (postId: string, field: keyof GTR30PostItem, value: string | number) => void;
  addPost: () => void;
  removePost: (postId: string) => void;
  setActiveTab: (tab: string) => void;
}

/**
 * Tab 3: Establishment Information Posts (Page 9) + Government Resolutions
 * (extracted from GTR30CreatePage). Behaviour is identical.
 */
export function EstablishmentTab({ data, setField, updatePost, addPost, removePost, setActiveTab }: EstablishmentTabProps) {
  return (
    <>
      {/* TAB 3: Establishment & Schemes */}
        <TabsContent value="establishment" className="mt-4 space-y-4">
          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase text-slate-800">
                  Establishment Information Posts (મહેકમની માહિતી · Page 9)
                </h2>
                <p className="text-xs text-slate-500">
                  Sanctioned and occupied posts listed on Page 9 of the bill.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={addPost}>
                <Plus className="mr-1 h-4 w-4" /> Add Post
              </Button>
            </div>

            <div className="space-y-3">
              {data.establishmentPosts.map((post) => (
                <div key={post.id} className="grid gap-2 sm:grid-cols-7 items-center bg-slate-50 p-3 rounded-lg border">
                  <div>
                    <Label className="text-xs">Sr.</Label>
                    <Input
                      value={post.srNo}
                      onChange={(e) => updatePost(post.id, 'srNo', e.target.value)}
                      className="font-gujSans"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Designation / Post</Label>
                    <Input
                      value={post.designation}
                      onChange={(e) => updatePost(post.id, 'designation', e.target.value)}
                      placeholder="e.g. આંકડા અધિકારી"
                      className="font-gujSans font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Class (વર્ગ)</Label>
                    <Input
                      value={post.cadreClass}
                      onChange={(e) => updatePost(post.id, 'cadreClass', e.target.value)}
                      className="font-gujSans"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sanctioned (મંજુર)</Label>
                    <Input
                      type="number" inputMode="decimal"
                      min="0"
                      value={post.sanctioned}
                      onChange={(e) => updatePost(post.id, 'sanctioned', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Filled (ભરાયેલ)</Label>
                    <Input
                      type="number" inputMode="decimal"
                      min="0"
                      value={post.filled}
                      onChange={(e) => updatePost(post.id, 'filled', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Vacant (ખાલી)</Label>
                      <Input value={post.vacant} disabled className="bg-slate-100 font-bold" />
                    </div>
                    {data.establishmentPosts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 mt-5"
                        onClick={() => removePost(post.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase text-slate-800">
              Government Resolutions (સરકારી ઠરાવ લખાણ)
            </h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Scheme Permanent Sanction Resolution (Page 3 Header Box)</Label>
                <Input
                  value={data.schemeResolutionText}
                  onChange={(e) => setField('schemeResolutionText', e.target.value)}
                  className="font-gujSans"
                />
              </div>
              <div>
                <Label className="text-xs">7th Pay Commission DA Resolution (Page 10 Point 9)</Label>
                <Input
                  value={data.daResolutionText}
                  onChange={(e) => setField('daResolutionText', e.target.value)}
                  className="font-gujSans"
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-between pt-3">
            <Button variant="outline" onClick={() => setActiveTab('office')}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to Office
            </Button>
            <Button onClick={() => setActiveTab('preview')}>
              Next: View Full 10-Page Preview <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
    </>
  );
}

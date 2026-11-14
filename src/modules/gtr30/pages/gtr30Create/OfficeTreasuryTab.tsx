import type { Dispatch, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import type { GTR30FormData, GTR30BudgetHead, GTR30BillCodeMapping } from '../../types';

export interface OfficeTreasuryTabProps {
  data: GTR30FormData;
  setField: (field: keyof GTR30FormData, value: string | number) => void;
  setData: Dispatch<SetStateAction<GTR30FormData>>;
  billCodeOptions: GTR30BillCodeMapping[];
  budgetHeadOptions: GTR30BudgetHead[];
  setActiveTab: (tab: string) => void;
}

/**
 * Tab 2: Bill & Treasury metadata + budget-head / bill-code cascade
 * (extracted from GTR30CreatePage). Behaviour is identical.
 */
export function OfficeTreasuryTab({ data, setField, setData, billCodeOptions, budgetHeadOptions, setActiveTab }: OfficeTreasuryTabProps) {
  return (
    <>
      {/* TAB 2: Office & Treasury */}
        <TabsContent value="office" className="mt-4 space-y-4">
          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase text-slate-800">Bill &amp; Treasury Metadata</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-xs">Bill Register No.</Label>
                <Input value={data.billRegisterNo} onChange={(e) => setField('billRegisterNo', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Bill Date</Label>
                <Input value={data.billDate} onChange={(e) => setField('billDate', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">For the Month of</Label>
                <Input value={data.monthOf} onChange={(e) => setField('monthOf', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Bill Code</Label>
                <select
                  value={data.billCode}
                  onChange={(e) => {
                    const nextCode = e.target.value;
                    const matched = billCodeOptions.find((m) => m.billCode === nextCode);
                    if (matched) {
                      const codeHead = matched.budgetHeadId
                        ? budgetHeadOptions.find((h) => h.id === matched.budgetHeadId)
                        : undefined;
                      setData((prev) => ({
                        ...prev,
                        billCode: nextCode,
                        ...(codeHead?.establishmentPosts?.length
                          ? { establishmentPosts: codeHead.establishmentPosts.map((p) => ({ ...p })) }
                          : {}),
                        controllingOfficer: matched.controllingOfficer || prev.controllingOfficer,
                        classOfExpenditure: matched.classOfExpenditure || prev.classOfExpenditure,
                        fund: matched.fund || prev.fund,
                        drawingOfficer: matched.drawingOfficer || prev.drawingOfficer,
                        demandNo: matched.demandNo || prev.demandNo,
                        demandNoLabel: matched.demandNo ? `Demand No. ${matched.demandNo}` : prev.demandNoLabel,
                        typeOfBudget: matched.typeOfBudget || prev.typeOfBudget,
                        schemeNo: matched.schemeNo || prev.schemeNo,
                        headChargeable: matched.headChargeable || prev.headChargeable,
                        sector: matched.sector || prev.sector,
                        majorHead: matched.majorHead || prev.majorHead,
                        subMajorHead: matched.subMajorHead || prev.subMajorHead,
                        minorHead: matched.minorHead || prev.minorHead,
                        subHead: matched.subHead || prev.subHead,
                        budgetYear: matched.budgetYear || prev.budgetYear,
                      }));
                    } else {
                      setField('billCode', nextCode);
                    }
                  }}
                  className="w-full h-9 rounded-md border border-slate-300 px-2 text-xs font-medium"
                >
                  <option value="">Select Bill Code</option>
                  {billCodeOptions.map((opt) => (
                    <option key={opt.id} value={opt.billCode}>
                      {opt.billCode} - {opt.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Budget Head</Label>
                <select
                  value={data.budgetHeadId ?? ''}
                  onChange={(e) => {
                    const head = budgetHeadOptions.find((h) => h.id === e.target.value);
                    if (!head) {
                      setField('budgetHeadId', '');
                      return;
                    }
                    setData((prev) => ({
                      ...prev,
                      budgetHeadId: head.id,
                      ...(head.establishmentPosts?.length
                        ? { establishmentPosts: head.establishmentPosts.map((p) => ({ ...p })) }
                        : {}),
                      controllingOfficer: head.controllingOfficer || prev.controllingOfficer,
                      classOfExpenditure: head.classOfExpenditure || prev.classOfExpenditure,
                      fund: head.fund || prev.fund,
                      drawingOfficer: head.drawingOfficer || prev.drawingOfficer,
                      demandNo: head.demandNo || prev.demandNo,
                      demandNoLabel: head.demandNo ? `Demand No. ${head.demandNo}` : prev.demandNoLabel,
                      typeOfBudget: head.typeOfBudget || prev.typeOfBudget,
                      schemeNo: head.schemeNo || prev.schemeNo,
                      headChargeable: head.headChargeable || prev.headChargeable,
                      sector: head.sector || prev.sector,
                      majorHead: head.majorHead || prev.majorHead,
                      subMajorHead: head.subMajorHead || prev.subMajorHead,
                      minorHead: head.minorHead || prev.minorHead,
                      subHead: head.subHead || prev.subHead,
                      budgetYear: head.budgetYear || prev.budgetYear,
                    }));
                  }}
                  className="w-full h-9 rounded-md border border-slate-300 px-2 text-xs font-medium"
                  title="Overrides the bill code's configured budget head"
                >
                  <option value="">Bill code&apos;s own head</option>
                  {budgetHeadOptions.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} {h.headChargeable ? `(${h.headChargeable})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Station / District</Label>
                <Input value={data.station} onChange={(e) => setField('station', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">District Code</Label>
                <Input value={data.district} onChange={(e) => setField('district', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Branch Name (Establishment)</Label>
                <Input value={data.branchName} onChange={(e) => setField('branchName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Office Name (Short)</Label>
                <Input value={data.officeName} onChange={(e) => setField('officeName', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Office Full Name</Label>
                <Input value={data.officeFullName} onChange={(e) => setField('officeFullName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Treasury Name</Label>
                <Input value={data.treasuryName} onChange={(e) => setField('treasuryName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Office Telephone</Label>
                <Input value={data.phoneNo} onChange={(e) => setField('phoneNo', e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <h2 className="text-xs font-bold uppercase text-slate-800">Budget Classification &amp; Heads</h2>
              {billCodeOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Select Budget Head Option:</span>
                  <select
                    className="h-8 rounded-md border border-blue-300 px-2 text-xs bg-blue-50/70 font-semibold text-blue-800"
                    onChange={(e) => {
                      const matched = billCodeOptions.find((m) => m.billCode === e.target.value);
                      if (matched) {
                        setData((prev) => ({
                          ...prev,
                          controllingOfficer: matched.controllingOfficer || prev.controllingOfficer,
                          classOfExpenditure: matched.classOfExpenditure || prev.classOfExpenditure,
                          fund: matched.fund || prev.fund,
                          drawingOfficer: matched.drawingOfficer || prev.drawingOfficer,
                          demandNo: matched.demandNo || prev.demandNo,
                          demandNoLabel: matched.demandNo ? `Demand No. ${matched.demandNo}` : prev.demandNoLabel,
                          typeOfBudget: matched.typeOfBudget || prev.typeOfBudget,
                          schemeNo: matched.schemeNo || prev.schemeNo,
                          headChargeable: matched.headChargeable || prev.headChargeable,
                          sector: matched.sector || prev.sector,
                          majorHead: matched.majorHead || prev.majorHead,
                          subMajorHead: matched.subMajorHead || prev.subMajorHead,
                          minorHead: matched.minorHead || prev.minorHead,
                          subHead: matched.subHead || prev.subHead,
                          budgetYear: matched.budgetYear || prev.budgetYear,
                        }));
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Choose Budget Head Option...</option>
                    {billCodeOptions.map((opt) => (
                      <option key={opt.id} value={opt.billCode}>
                        {opt.billCode} — {opt.headChargeable ? `${opt.headChargeable} (${opt.demandNo || '004'})` : opt.description}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-xs">Controlling Officer Code (Field 4)</Label>
                <Input value={data.controllingOfficer} onChange={(e) => setField('controllingOfficer', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Class of Expenditure</Label>
                <Input value={data.classOfExpenditure} onChange={(e) => setField('classOfExpenditure', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Fund</Label>
                <Input value={data.fund} onChange={(e) => setField('fund', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Drawing Officer Code</Label>
                <Input value={data.drawingOfficer} onChange={(e) => setField('drawingOfficer', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Demand No.</Label>
                <Input value={data.demandNo} onChange={(e) => setField('demandNo', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Type of Budget</Label>
                <Input value={data.typeOfBudget} onChange={(e) => setField('typeOfBudget', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Scheme No.</Label>
                <Input value={data.schemeNo} onChange={(e) => setField('schemeNo', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Head Chargeable (13 Digits)</Label>
                <Input value={data.headChargeable} onChange={(e) => setField('headChargeable', e.target.value)} className="num" />
              </div>
              <div>
                <Label className="text-xs">Sector</Label>
                <Input value={data.sector} onChange={(e) => setField('sector', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Major Head</Label>
                <Input value={data.majorHead} onChange={(e) => setField('majorHead', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Minor Head</Label>
                <Input value={data.minorHead} onChange={(e) => setField('minorHead', e.target.value)} />
              </div>
              <div className="sm:col-span-3">
                <Label className="text-xs">Sub Head</Label>
                <Input value={data.subHead} onChange={(e) => setField('subHead', e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase text-slate-800">Drawing Officer &amp; Messenger</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-xs">Drawing Officer Name (English)</Label>
                <Input value={data.drawingOfficerName} onChange={(e) => setField('drawingOfficerName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Drawing Officer Name (Gujarati)</Label>
                <Input value={data.drawingOfficerNameGujarati} onChange={(e) => setField('drawingOfficerNameGujarati', e.target.value)} className="font-gujSans" />
              </div>
              <div>
                <Label className="text-xs">Designation (English)</Label>
                <Input value={data.drawingOfficerDesignation} onChange={(e) => setField('drawingOfficerDesignation', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Designation (Gujarati)</Label>
                <Input value={data.drawingOfficerDesignationGujarati} onChange={(e) => setField('drawingOfficerDesignationGujarati', e.target.value)} className="font-gujSans" />
              </div>
              <div>
                <Label className="text-xs">Cardex No.</Label>
                <Input value={data.cardexNo} onChange={(e) => setField('cardexNo', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">DDO Code No.</Label>
                <Input value={data.ddoCode} onChange={(e) => setField('ddoCode', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Authorised Messenger Name</Label>
                <Input value={data.messengerName} onChange={(e) => setField('messengerName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Messenger Designation</Label>
                <Input value={data.messengerDesignation} onChange={(e) => setField('messengerDesignation', e.target.value)} />
              </div>
            </div>
          </Card>

          <div className="flex justify-between pt-3">
            <Button variant="outline" onClick={() => setActiveTab('employees')}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to Employees
            </Button>
            <Button onClick={() => setActiveTab('establishment')}>
              Next: Establishment Posts &amp; Resolutions <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
    </>
  );
}

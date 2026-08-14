import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { HelpCircle, Mail, Phone, ShieldCheck, Laptop, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthHelpDialogProps {
  triggerClassName?: string;
}

export function AuthHelpDialog({ triggerClassName }: AuthHelpDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={triggerClassName || 'text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5'}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Need help signing in?</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white border-slate-200">
        <DialogHeader>
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 mb-2">
            <KeyRound className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-semibold text-slate-900">
            Portal Sign-in Help
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Assistance for Accountants and System Administrators
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 text-xs text-slate-600 py-1">
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-1.5">
            <p className="font-medium text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Role Accounts & Access
            </p>
            <p className="leading-relaxed">
              Sign-in credentials are assigned by the administrative wing.
              Office accounts have access to Payroll, GTR-44, and Ledger modules.
              Admin credentials grant access to user management and system audits.
            </p>
          </div>

          <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-1.5">
            <p className="font-medium text-slate-800 flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-indigo-500" />
              Supported Browsers & System Requirements
            </p>
            <p className="leading-relaxed">
              For best experience, use recent versions of Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari with JavaScript and LocalStorage enabled.
            </p>
          </div>

          <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-2">
            <p className="font-medium text-slate-800">
              Technical & Administrative Desk
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>support@icdp.example.com</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Mon–Sat, 10:30 AM – 6:00 PM</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

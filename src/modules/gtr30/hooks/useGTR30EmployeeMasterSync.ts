import { useEffect, useState } from 'react';
import {
  getGtr30SyncStatus,
  subscribeGtr30Sync,
  type Gtr30SyncStatus,
} from '../services/gtr30EmployeeMaster.service';

export function useGTR30EmployeeMasterSyncStatus(): Gtr30SyncStatus {
  const [status, setStatus] = useState<Gtr30SyncStatus>(() => getGtr30SyncStatus());
  useEffect(() => subscribeGtr30Sync(() => setStatus(getGtr30SyncStatus())), []);
  return status;
}

import { useTranslation } from "react-i18next";

import type { JobStatus } from "../lib/types";

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { t } = useTranslation();
  const label = t(`jobStatus.${status}`);

  return <span className={`status status-${status}`}>{label}</span>;
}

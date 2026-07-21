import { serve } from "inngest/next";
import { inngest, onOrderConfirmed, onProjectStatusChanged, onUploadScanRequested } from "@repo/jobs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [onOrderConfirmed, onProjectStatusChanged, onUploadScanRequested],
});

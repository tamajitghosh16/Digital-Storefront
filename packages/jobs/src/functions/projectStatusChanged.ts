import { inngest } from "../client";
import { sendProjectStatusChanged } from "@repo/email";
import { prisma } from "@repo/database";

export const onProjectStatusChanged = inngest.createFunction(
  { id: "project-status-changed-notify" },
  { event: "project/status_changed" },
  async ({ event }) => {
    await sendProjectStatusChanged({
      to: event.data.authorEmail,
      bookTitle: event.data.bookTitle,
      status: event.data.status,
    });

    // In-app notification row, read by both apps.
    const project = await prisma.selfPublishingProject.findUnique({
      where: { id: event.data.projectId },
      select: { authorId: true },
    });
    if (project) {
      await prisma.notification.create({
        data: {
          userId: project.authorId,
          type: "project.status_changed",
          title: `"${event.data.bookTitle}" is now ${event.data.status}`,
        },
      });
    }
  }
);

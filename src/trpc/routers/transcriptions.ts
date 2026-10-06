import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/db";
import { createTRPCRouter, orgProcedure } from "../init";

export const transcriptionsRouter = createTRPCRouter({
  getAll: orgProcedure.query(async ({ ctx }) => {
    return prisma.transcript.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      omit: { orgId: true },
    });
  }),

  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const transcript = await prisma.transcript.findUnique({
        where: { id: input.id, orgId: ctx.orgId },
        omit: { orgId: true },
      });

      if (!transcript) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return transcript;
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { count } = await prisma.transcript.deleteMany({
        where: { id: input.id, orgId: ctx.orgId },
      });

      if (count === 0) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return { success: true };
    }),
});

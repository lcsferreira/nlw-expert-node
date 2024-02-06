import z from "zod";
import { prisma } from "../lib/prisma";
import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";

export async function voteOnPoll(app: FastifyInstance) {
  app.post("/polls/:pollId/votes", async (request, reply) => {
    const votePollBody = z.object({
      pollOptionId: z.string().uuid(),
    });

    const voteOnPollParams = z.object({
      pollId: z.string().uuid(),
    });

    const { pollId } = voteOnPollParams.parse(request.params);
    const { pollOptionId } = votePollBody.parse(request.body);

    let { sessionId } = request.cookies;

    if (!sessionId) {
      sessionId = randomUUID();
      reply.setCookie("sessionId", sessionId, {
        path: "/", //indica quais rotas terão acesso ao cookie
        maxAge: 60 * 60 * 24 * 30, //tempo de vida do cookie em segundos (30 dias),
        signed: true, //criptografa o cookie
        httpOnly: true, //não permite acesso ao cookie via javascript
      });
    } else {
      const userPreviousVote = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId,
          },
        },
      });
      if (userPreviousVote && userPreviousVote.pollOptionId !== pollOptionId) {
        //apaga vote anterior
        await prisma.vote.delete({
          where: {
            id: userPreviousVote.id,
          },
        });
      } else if (userPreviousVote) {
        return reply.status(400).send({
          error: "You have already voted on this poll.",
        });
      }
    }

    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionId,
      },
    });

    return reply.status(201).send();
  });
}

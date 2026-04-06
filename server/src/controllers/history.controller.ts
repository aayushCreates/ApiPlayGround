import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";

export const createHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      specId,
      method,
      url,
      requestHeaders,
      requestBody,
      statusCode,
      responseBody,
      responseHeaders,
      latencyMs,
    } = req.body;

    const historyItem = await prisma.requestHistory.create({
      data: {
        clerkId: req.clerkId!,
        specId,
        method,
        url,
        requestHeaders: requestHeaders ?? {},
        requestBody,
        statusCode,
        responseBody,
        responseHeaders: responseHeaders ?? {},
        latencyMs,
      },
    });

    const count = await prisma.requestHistory.count({
      where: { clerkId: req.clerkId! },
    });

    if (count > 200) {
      const oldestItems = await prisma.requestHistory.findMany({
        where: { clerkId: req.clerkId! },
        orderBy: { createdAt: "asc" },
        take: count - 200,
        select: { id: true },
      });
      await prisma.requestHistory.deleteMany({
        where: { id: { in: oldestItems.map((i: any) => i.id) } },
      });
    }

    res.status(201).json(historyItem);
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { specId, limit } = req.query;
    const take = Math.min(parseInt(limit as string) || 50, 100);

    const filter: any = { clerkId: req.clerkId! };
    if (specId) filter.specId = specId;

    const items = await prisma.requestHistory.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        clerkId: true,
        specId: true,
        method: true,
        url: true,
        requestHeaders: true,
        requestBody: true,
        statusCode: true,
        // no responseBody to save bandwidth
        responseHeaders: true,
        latencyMs: true,
        createdAt: true,
      },
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

export const getHistoryById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const item = await prisma.requestHistory.findUnique({ where: { id } });
    if (!item)
      return res.status(404).json({ message: "History item not found" });
    if (item.clerkId !== req.clerkId)
      return res.status(403).json({ message: "Forbidden" });

    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const clearHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await prisma.requestHistory.deleteMany({
      where: { clerkId: req.clerkId! },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

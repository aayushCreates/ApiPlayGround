import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";

export const createCollection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { specId, name } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });

    const collection = await prisma.collection.create({
      data: {
        clerkId: req.clerkId!,
        specId,
        name,
      },
    });
    res.status(201).json(collection);
  } catch (error) {
    next(error);
  }
};

export const getCollections = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { specId } = req.query;
    const filter: any = { clerkId: req.clerkId! };
    if (specId) filter.specId = specId;

    const collections = await prisma.collection.findMany({
      where: filter,
      include: {
        _count: { select: { requests: true } },
        requests: true,
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(collections);
  } catch (error) {
    next(error);
  }
};

export const createSavedRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const collectionId = req.params.id as string;
    const { name, method, path, parameters, requestBody } = req.body;

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection)
      return res.status(404).json({ message: "Collection not found" });
    if (collection.clerkId !== req.clerkId)
      return res.status(403).json({ message: "Forbidden" });

    const savedRequest = await prisma.savedRequest.create({
      data: {
        collectionId,
        name,
        method,
        path,
        parameters: parameters ?? {},
        requestBody,
      },
    });
    res.status(201).json(savedRequest);
  } catch (error) {
    next(error);
  }
};

export const deleteSavedRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const collectionId = req.params.collectionId as string;
    const requestId = req.params.requestId as string;

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection)
      return res.status(404).json({ message: "Collection not found" });
    if (collection.clerkId !== req.clerkId)
      return res.status(403).json({ message: "Forbidden" });

    await prisma.savedRequest.delete({
      where: { id: requestId, collectionId },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

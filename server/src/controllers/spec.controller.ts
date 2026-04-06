import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { nanoid } from "nanoid";

export const createSpec = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, content, parsedUrl, description } = req.body;
    if (!name || name.length > 100)
      return res
        .status(400)
        .json({ message: "Valid name (max 100) is required" });
    if (!content || Buffer.byteLength(content, "utf8") > 5 * 1024 * 1024)
      return res
        .status(400)
        .json({ message: "Content exceed 5MB or missing" });

    const spec = await prisma.spec.create({
      data: {
        clerkId: req.clerkId!,
        name,
        content,
        parsedUrl,
        description,
      },
    });
    res.status(201).json(spec);
  } catch (error) {
    next(error);
  }
};

export const createManualSpec = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, method, url } = req.body;
    if (!name || !method || !url) {
      return res.status(400).json({ message: "Name, method, and URL are required" });
    }

    // Extract base and path for minimal spec
    let baseUrl = "";
    let path = "/";
    try {
      const urlObj = new URL(url);
      baseUrl = urlObj.origin + urlObj.pathname.split('/').slice(0, -1).join('/');
      path = '/' + urlObj.pathname.split('/').pop();
    } catch {
      return res.status(400).json({ message: "Invalid URL format" });
    }

    const content = JSON.stringify({
      openapi: "3.0.0",
      info: { title: name, version: "1.0.0" },
      servers: [{ url: baseUrl }],
      paths: {
        [path]: {
          [method.toLowerCase()]: {
            summary: "Manual Endpoint",
            responses: { "200": { description: "OK" } }
          }
        }
      }
    });

    const spec = await prisma.spec.create({
      data: {
        clerkId: req.clerkId!,
        name,
        content,
        description: `Manual endpoint: ${method} ${url}`,
      },
    });
    res.status(201).json(spec);
  } catch (error) {
    next(error);
  }
};

export const getSpecs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const specs = await prisma.spec.findMany({
      where: { clerkId: req.clerkId! },
      select: {
        id: true,
        clerkId: true,
        name: true,
        description: true,
        parsedUrl: true,
        isPublic: true,
        shareToken: true,
        createdAt: true,
        updatedAt: true,
        // specifically omits content due to size constraints
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(specs);
  } catch (error) {
    next(error);
  }
};

export const getSpecById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const spec = await prisma.spec.findUnique({ where: { id } });
    if (!spec) return res.status(404).json({ message: "Spec not found" });

    if (!spec.isPublic && spec.clerkId !== req.clerkId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.json(spec);
  } catch (error) {
    next(error);
  }
};

export const updateSpec = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const { name, description, isPublic, content, parsedUrl } = req.body;

    const existing = await prisma.spec.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Spec not found" });
    if (existing.clerkId !== req.clerkId)
      return res.status(403).json({ message: "Forbidden" });

    // Validate content if provided
    if (content && Buffer.byteLength(content, "utf8") > 5 * 1024 * 1024) {
      return res.status(400).json({ message: "Content exceeds 5MB" });
    }

    let shareToken = existing.shareToken;
    if (isPublic && !shareToken) {
      shareToken = nanoid(12);
    }

    const updated = await prisma.spec.update({
      where: { id },
      data: { 
        name, 
        description, 
        isPublic, 
        shareToken,
        content,
        parsedUrl 
      },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteSpec = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.spec.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Spec not found" });
    if (existing.clerkId !== req.clerkId)
      return res.status(403).json({ message: "Forbidden" });

    await prisma.spec.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getSpecByShareToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.params.token as string;
    const spec = await prisma.spec.findUnique({
      where: { shareToken: token },
    });
    if (!spec) return res.status(404).json({ message: "Spec not found" });
    res.json(spec);
  } catch (error) {
    next(error);
  }
};

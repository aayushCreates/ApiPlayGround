-- CreateTable
CREATE TABLE "Spec" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "parsedUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestHistory" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "specId" TEXT,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "requestHeaders" JSONB NOT NULL,
    "requestBody" TEXT,
    "statusCode" INTEGER,
    "responseBody" TEXT,
    "responseHeaders" JSONB,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedRequest" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "requestBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiExplanation" (
    "id" TEXT NOT NULL,
    "endpointHash" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Spec_shareToken_key" ON "Spec"("shareToken");

-- CreateIndex
CREATE INDEX "Spec_clerkId_idx" ON "Spec"("clerkId");

-- CreateIndex
CREATE INDEX "RequestHistory_clerkId_idx" ON "RequestHistory"("clerkId");

-- CreateIndex
CREATE INDEX "RequestHistory_specId_idx" ON "RequestHistory"("specId");

-- CreateIndex
CREATE INDEX "Collection_clerkId_idx" ON "Collection"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "AiExplanation_endpointHash_key" ON "AiExplanation"("endpointHash");

-- CreateIndex
CREATE INDEX "AiExplanation_endpointHash_idx" ON "AiExplanation"("endpointHash");

-- AddForeignKey
ALTER TABLE "RequestHistory" ADD CONSTRAINT "RequestHistory_specId_fkey" FOREIGN KEY ("specId") REFERENCES "Spec"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_specId_fkey" FOREIGN KEY ("specId") REFERENCES "Spec"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedRequest" ADD CONSTRAINT "SavedRequest_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

import { DocumentationVectorStoreRepository } from "../repositories/documentation-vector-store-repository.ts";
import { CheerioWebBaseLoader } from "npm:langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "npm:langchain/text_splitter";
import { PGVectorStore } from "npm:@langchain/community/vectorstores/pgvector";
import { OllamaEmbeddings } from "npm:@langchain/community/embeddings/ollama";

export class ReloadDocumentationCommand {
  constructor() {
  }

  public async initReloadingDocumentation(): Promise<void> {
      await DocumentationVectorStoreRepository.clearDocumentationVectorStore();
      const embeddings = new OllamaEmbeddings({
        model: Deno.env.get("LLM"),
        baseUrl: Deno.env.get("OLLAMA_URL"),
      });
    await this.getCSharpDocumentation(embeddings);
  }

  private async getCSharpDocumentation(
    embeddings: OllamaEmbeddings,
  ): Promise<void> {
    const cSharpNonParllelDocs = new CheerioWebBaseLoader(
      "https://raw.githubusercontent.com/Cryptographic-API-Services/cas-dotnet-sdk/main/docs/EXAMPLES.md"
    );
    const typeScriptNonParllelDocs = new CheerioWebBaseLoader(
      "https://raw.githubusercontent.com/Cryptographic-API-Services/cas-typescript-sdk/main/docs/EXAMPLES.md"
    );
    const splitter = new RecursiveCharacterTextSplitter();
    const nonParallelDocumentationDocs = await cSharpNonParllelDocs.load();
    const nonParallelDocumentationSplitDocs = await splitter.splitDocuments(nonParallelDocumentationDocs);
    const config = DocumentationVectorStoreRepository.getPgConnectionForVectorStore();
      const pgvectorStore = await PGVectorStore.initialize(
        embeddings,
        config
      );
    await pgvectorStore.addDocuments(nonParallelDocumentationSplitDocs);
    const typeScriptNonParallelDocumentationDocs = await typeScriptNonParllelDocs.load();
    const typeScriptNonParallelDocumentationSplitDocs = await splitter.splitDocuments(typeScriptNonParallelDocumentationDocs);
    await pgvectorStore.addDocuments(typeScriptNonParallelDocumentationSplitDocs);
    await pgvectorStore.end();
  }
}

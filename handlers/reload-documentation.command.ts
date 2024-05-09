import { DocumentationVectorStoreRepository } from "../repositories/documentation-vector-store-repository.ts";
import { CheerioWebBaseLoader } from "npm:langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "npm:langchain/text_splitter";
import { NeonPostgres } from "npm:@langchain/community/vectorstores/neon";
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
    const nonParallelDocumentationLoader = new CheerioWebBaseLoader(
      "https://raw.githubusercontent.com/Cryptographic-API-Services/cas-dotnet-sdk/main/docs/EXAMPLES.md",
    );
    const parallelDocumentationLoader = new CheerioWebBaseLoader(
        "https://raw.githubusercontent.com/Cryptographic-API-Services/cas-dotnet-sdk/main/docs/PARALLEL.md"
    );
    const splitter = new RecursiveCharacterTextSplitter();
    const nonParallelDocumentationDocs = await nonParallelDocumentationLoader.load();
    const nonParallelDocumentationSplitDocs = await splitter.splitDocuments(nonParallelDocumentationDocs);
    const vectorStore = await NeonPostgres.initialize(embeddings, {
      connectionString: Deno.env.get("POSTGRES_URL") as string,
    });
    await vectorStore.addDocuments(nonParallelDocumentationSplitDocs);
    const parallelDocumentationDocs = await parallelDocumentationLoader.load();
    const parallelDocumentationSplitDocs = await splitter.splitDocuments(parallelDocumentationDocs);
    await vectorStore.addDocuments(parallelDocumentationSplitDocs);
  }
}

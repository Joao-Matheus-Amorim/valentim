type QueueJobOptions = {
  jobId?: string;
};

type QueueJob<TPayload> = {
  name: string;
  payload: TPayload;
  options?: QueueJobOptions;
  createdAt: Date;
};

class InMemoryQueue<TPayload extends Record<string, unknown>> {
  private readonly jobs = new Map<string, QueueJob<TPayload>>();

  async add(name: string, payload: TPayload, options?: QueueJobOptions) {
    const id = options?.jobId ?? `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (this.jobs.has(id)) {
      return { id, duplicated: true };
    }

    this.jobs.set(id, {
      name,
      payload,
      options,
      createdAt: new Date()
    });

    return { id, duplicated: false };
  }

  list() {
    return Array.from(this.jobs.entries()).map(([id, job]) => ({ id, ...job }));
  }

  async drain() {
    const jobs = this.list();
    this.jobs.clear();
    return jobs;
  }
}

type MediaDownloadPayload = {
  documentFileId: string;
  metaMediaId: string;
  filename: string;
  mimeType: string;
};

// MVP local: mantém a interface de fila estável sem adicionar Redis/BullMQ agora.
// Próximo passo: trocar esta implementação por BullMQ/Redis ou outro worker persistente.
export const mediaDownloadQueue = new InMemoryQueue<MediaDownloadPayload>();

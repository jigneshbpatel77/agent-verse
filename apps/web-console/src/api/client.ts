export interface ApiClientOptions {
  baseUrl: string;
  token?: string;
}

export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  async get<T>(path: string): Promise<T> {
    const response = await fetch(new URL(path, this.options.baseUrl), {
      headers: this.options.token ? { Authorization: `Bearer ${this.options.token}` } : undefined,
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }
}

import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,

  NodeOperationError,
} from 'n8n-workflow';

export class ApiyiEmbedding implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'APIYI Embedding',
    name: 'apiyiEmbedding',
    icon: 'file:apiyi.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["model"]}}',
    description: 'Generate text embeddings (vectors) via APIYI',
    defaults: { name: 'APIYI Embedding' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'apiyiApi', required: true }],
    properties: [
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        options: [
          { name: 'text-embedding-3-large (3072 dims)', value: 'text-embedding-3-large' },
          { name: 'text-embedding-3-small (1536 dims)', value: 'text-embedding-3-small' },
          { name: 'text-embedding-ada-002 (1536 dims)', value: 'text-embedding-ada-002' },
        ],
        default: 'text-embedding-3-small',
        description: 'Embedding model to use',
      },
      {
        displayName: 'Input',
        name: 'input',
        type: 'string',
        typeOptions: { rows: 3 },
        default: '',
        required: true,
        description: 'Text to embed. Can be a single string or JSON array of strings for batch.',
      },
      {
        displayName: 'Input Type',
        name: 'inputType',
        type: 'options',
        options: [
          { name: 'Single Text', value: 'single' },
          { name: 'Batch (JSON Array)', value: 'batch' },
        ],
        default: 'single',
      },
      {
        displayName: 'Dimensions',
        name: 'dimensions',
        type: 'number',
        default: 0,
        description: 'Number of dimensions to return (0 = model default). Only for text-embedding-3-*',
        displayOptions: { show: { model: ['text-embedding-3-large', 'text-embedding-3-small'] } },
      },
      {
        displayName: 'Encoding Format',
        name: 'encodingFormat',
        type: 'options',
        options: [
          { name: 'Float Array', value: 'float' },
          { name: 'Base64', value: 'base64' },
        ],
        default: 'float',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const credentials = await this.getCredentials('apiyiApi');

    for (let i = 0; i < items.length; i++) {
      try {
        const model = this.getNodeParameter('model', i) as string;
        const inputRaw = this.getNodeParameter('input', i) as string;
        const inputType = this.getNodeParameter('inputType', i) as string;
        const dimensions = this.getNodeParameter('dimensions', i, 0) as number;
        const encodingFormat = this.getNodeParameter('encodingFormat', i) as string;

        let input: string | string[];
        if (inputType === 'batch') {
          try {
            input = JSON.parse(inputRaw) as string[];
          } catch {
            input = inputRaw.split('\n').filter(Boolean);
          }
        } else {
          input = inputRaw;
        }

        const body: Record<string, unknown> = { model, input, encoding_format: encodingFormat };
        if (dimensions > 0 && model !== 'text-embedding-ada-002') {
          body.dimensions = dimensions;
        }

        const response = await this.helpers.request({
          method: 'POST',
          url: `${credentials.baseUrl}/embeddings`,
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          json: false,
        }) as string;

        const parsed = JSON.parse(response);
        const embeddings = parsed.data ?? [];
        const usage = parsed.usage ?? {};

        if (inputType === 'batch') {
          returnData.push({
            json: {
              embeddings: embeddings.map((e: { embedding: unknown; index: number }) => e.embedding),
              count: embeddings.length,
              model: parsed.model,
              usage_prompt_tokens: usage.prompt_tokens,
              usage_total_tokens: usage.total_tokens,
            },
          });
        } else {
          returnData.push({
            json: {
              embedding: embeddings[0]?.embedding ?? [],
              dimensions: (embeddings[0]?.embedding as unknown[])?.length ?? 0,
              model: parsed.model,
              usage_prompt_tokens: usage.prompt_tokens,
              usage_total_tokens: usage.total_tokens,
            },
          });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message } });
          continue;
        }
        throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
      }
    }

    return [returnData];
  }
}

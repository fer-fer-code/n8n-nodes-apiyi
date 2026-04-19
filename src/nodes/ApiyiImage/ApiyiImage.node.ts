import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,

  NodeOperationError,
} from 'n8n-workflow';

export class ApiyiImage implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'APIYI Image Generation',
    name: 'apiyiImage',
    icon: 'file:apiyi.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["model"]}}',
    description: 'Generate images via APIYI (DALL-E, Flux, GPT-Image)',
    defaults: { name: 'APIYI Image' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'apiyiApi', required: true }],
    properties: [
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        options: [
          { name: 'GPT-Image-1', value: 'gpt-image-1' },
          { name: 'DALL-E 3', value: 'dall-e-3' },
          { name: 'DALL-E 2', value: 'dall-e-2' },
          { name: 'Flux 1.1 Pro', value: 'flux-1.1-pro' },
          { name: 'Flux Dev', value: 'flux-dev' },
          { name: 'Nano Banana Pro', value: 'nano-banana-pro' },
        ],
        default: 'gpt-image-1',
        description: 'Image generation model',
      },
      {
        displayName: 'Prompt',
        name: 'prompt',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        required: true,
        description: 'Text description of the image to generate',
      },
      {
        displayName: 'Size',
        name: 'size',
        type: 'options',
        options: [
          { name: '1024×1024 (Square)', value: '1024x1024' },
          { name: '1792×1024 (Landscape)', value: '1792x1024' },
          { name: '1024×1792 (Portrait)', value: '1024x1792' },
          { name: '512×512', value: '512x512' },
          { name: '256×256', value: '256x256' },
        ],
        default: '1024x1024',
      },
      {
        displayName: 'Quality',
        name: 'quality',
        type: 'options',
        options: [
          { name: 'Standard', value: 'standard' },
          { name: 'HD', value: 'hd' },
        ],
        default: 'standard',
        displayOptions: { show: { model: ['dall-e-3', 'gpt-image-1'] } },
      },
      {
        displayName: 'Number of Images',
        name: 'n',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 4 },
        default: 1,
        description: 'Number of images to generate',
      },
      {
        displayName: 'Response Format',
        name: 'responseFormat',
        type: 'options',
        options: [
          { name: 'URL', value: 'url' },
          { name: 'Base64 JSON', value: 'b64_json' },
        ],
        default: 'url',
        description: 'Format of generated image response',
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
        const prompt = this.getNodeParameter('prompt', i) as string;
        const size = this.getNodeParameter('size', i) as string;
        const n = this.getNodeParameter('n', i) as number;
        const responseFormat = this.getNodeParameter('responseFormat', i) as string;

        const body: Record<string, unknown> = { model, prompt, size, n, response_format: responseFormat };

        // Quality only for supported models
        if (['dall-e-3', 'gpt-image-1'].includes(model)) {
          body.quality = this.getNodeParameter('quality', i) as string;
        }

        const response = await this.helpers.request({
          method: 'POST',
          url: `${credentials.baseUrl}/images/generations`,
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          json: false,
        });

        const parsed = JSON.parse(response as string);
        const images = parsed.data ?? [];

        for (const img of images) {
          returnData.push({
            json: {
              url: img.url ?? null,
              b64_json: img.b64_json ?? null,
              revised_prompt: img.revised_prompt ?? null,
              model,
              size,
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

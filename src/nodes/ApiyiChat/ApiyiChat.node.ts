import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,

  NodeOperationError,
} from 'n8n-workflow';

export class ApiyiChat implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'APIYI Chat',
    name: 'apiyiChat',
    icon: 'file:apiyi.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["model"]}}',
    description: 'Chat with AI models via APIYI (Claude, GPT, Gemini, DeepSeek, Kimi)',
    defaults: { name: 'APIYI Chat' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'apiyiApi', required: true }],
    properties: [
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        options: [
          { name: 'Claude Opus 4.6', value: 'claude-opus-4-6' },
          { name: 'Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
          { name: 'Claude Haiku 4.5', value: 'claude-haiku-4-5-20251001' },
          { name: 'GPT-4o', value: 'gpt-4o' },
          { name: 'GPT-4o Mini', value: 'gpt-4o-mini' },
          { name: 'GPT-4.1', value: 'gpt-4.1' },
          { name: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
          { name: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
          { name: 'DeepSeek V3', value: 'deepseek-chat' },
          { name: 'DeepSeek R1', value: 'deepseek-reasoner' },
          { name: 'Kimi K2.5', value: 'kimi-k2.5' },
        ],
        default: 'claude-sonnet-4-6',
        description: 'AI model to use for chat',
      },
      {
        displayName: 'Prompt',
        name: 'prompt',
        type: 'string',
        typeOptions: { rows: 5 },
        default: '',
        required: true,
        description: 'User message / prompt',
      },
      {
        displayName: 'System Prompt',
        name: 'systemPrompt',
        type: 'string',
        typeOptions: { rows: 3 },
        default: '',
        description: 'Optional system prompt to set context',
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          {
            displayName: 'Max Tokens',
            name: 'maxTokens',
            type: 'number',
            default: 2048,
            description: 'Maximum tokens in response',
          },
          {
            displayName: 'Temperature',
            name: 'temperature',
            type: 'number',
            typeOptions: { minValue: 0, maxValue: 2, numberStepSize: 0.1 },
            default: 0.7,
            description: 'Sampling temperature (0 = deterministic, 2 = very random)',
          },
          {
            displayName: 'Thinking Mode',
            name: 'thinking',
            type: 'boolean',
            default: false,
            description: 'Enable extended thinking (for supported models like DeepSeek R1, Kimi)',
          },
        ],
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
        const systemPrompt = this.getNodeParameter('systemPrompt', i) as string;
        const options = this.getNodeParameter('options', i) as {
          maxTokens?: number;
          temperature?: number;
          thinking?: boolean;
        };

        const messages: Array<{ role: string; content: string }> = [];
        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        const body: Record<string, unknown> = {
          model,
          messages,
          max_tokens: options.maxTokens ?? 2048,
          temperature: options.temperature ?? 0.7,
        };

        if (options.thinking) {
          body.thinking = { type: 'enabled', budget_tokens: 8000 };
        }

        const response = await this.helpers.request({
          method: 'POST',
          url: `${credentials.baseUrl}/chat/completions`,
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          json: false,
        });

        const parsed = JSON.parse(response as string);
        const content = parsed.choices?.[0]?.message?.content ?? '';
        const usage = parsed.usage ?? {};

        returnData.push({
          json: {
            content,
            model: parsed.model,
            finish_reason: parsed.choices?.[0]?.finish_reason,
            usage_prompt_tokens: usage.prompt_tokens,
            usage_completion_tokens: usage.completion_tokens,
            usage_total_tokens: usage.total_tokens,
          },
        });
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

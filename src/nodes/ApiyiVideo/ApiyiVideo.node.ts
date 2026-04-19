import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,

  NodeOperationError,
} from 'n8n-workflow';

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 60; // 5 min max wait

export class ApiyiVideo implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'APIYI Video Generation',
    name: 'apiyiVideo',
    icon: 'file:apiyi.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["model"]}}',
    description: 'Generate videos via APIYI (Sora, Kling, SeeDance) with auto-polling',
    defaults: { name: 'APIYI Video' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'apiyiApi', required: true }],
    properties: [
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        options: [
          { name: 'Sora', value: 'sora' },
          { name: 'Kling 1.6 Pro', value: 'kling-v1-6-pro' },
          { name: 'Kling 1.6 Standard', value: 'kling-v1-6-standard' },
          { name: 'SeeDance', value: 'seedance-1-lite' },
        ],
        default: 'kling-v1-6-standard',
        description: 'Video generation model',
      },
      {
        displayName: 'Prompt',
        name: 'prompt',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        required: true,
        description: 'Text description of the video to generate',
      },
      {
        displayName: 'Duration (seconds)',
        name: 'duration',
        type: 'options',
        options: [
          { name: '5 seconds', value: 5 },
          { name: '10 seconds', value: 10 },
        ],
        default: 5,
      },
      {
        displayName: 'Aspect Ratio',
        name: 'aspectRatio',
        type: 'options',
        options: [
          { name: '16:9 (Landscape)', value: '16:9' },
          { name: '9:16 (Portrait / Reels)', value: '9:16' },
          { name: '1:1 (Square)', value: '1:1' },
        ],
        default: '16:9',
      },
      {
        displayName: 'Negative Prompt',
        name: 'negativePrompt',
        type: 'string',
        default: '',
        description: 'What to avoid in the generated video',
      },
      {
        displayName: 'Wait for Completion',
        name: 'waitForCompletion',
        type: 'boolean',
        default: true,
        description: 'Poll until video is ready and return the final URL. If false, returns job ID immediately.',
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
        const duration = this.getNodeParameter('duration', i) as number;
        const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
        const negativePrompt = this.getNodeParameter('negativePrompt', i) as string;
        const waitForCompletion = this.getNodeParameter('waitForCompletion', i) as boolean;

        // Submit generation job
        const submitBody: Record<string, unknown> = {
          model,
          prompt,
          duration,
          aspect_ratio: aspectRatio,
        };
        if (negativePrompt) submitBody.negative_prompt = negativePrompt;

        const submitRes = await this.helpers.request({
          method: 'POST',
          url: `${credentials.baseUrl}/videos/generations`,
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitBody),
          json: false,
        });

        const job = JSON.parse(submitRes as string);
        const jobId = job.id ?? job.task_id;

        if (!waitForCompletion || !jobId) {
          returnData.push({ json: { job_id: jobId, status: 'submitted', model } });
          continue;
        }

        // Poll for completion
        let videoUrl: string | null = null;
        let status = 'processing';
        for (let poll = 0; poll < MAX_POLLS; poll++) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

          const pollRes = await this.helpers.request({
            method: 'GET',
            url: `${credentials.baseUrl}/videos/generations/${jobId}`,
            headers: { Authorization: `Bearer ${credentials.apiKey}` },
            json: false,
          });

          const pollData = JSON.parse(pollRes as string);
          status = pollData.status ?? pollData.task_status ?? 'processing';

          if (status === 'succeeded' || status === 'completed') {
            videoUrl = pollData.url ?? pollData.video_url ?? pollData.data?.[0]?.url ?? null;
            break;
          }
          if (status === 'failed' || status === 'error') {
            throw new Error(`Video generation failed: ${pollData.error ?? status}`);
          }
        }

        returnData.push({
          json: {
            job_id: jobId,
            status,
            video_url: videoUrl,
            model,
            duration,
            aspect_ratio: aspectRatio,
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

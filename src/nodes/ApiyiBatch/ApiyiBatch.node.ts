import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,

  NodeOperationError,
} from 'n8n-workflow';

export class ApiyiBatch implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'APIYI Batch',
    name: 'apiyiBatch',
    icon: 'file:apiyi.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Manage OpenAI-compatible batch jobs via APIYI (/v1/batches)',
    defaults: { name: 'APIYI Batch' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'apiyiApi', required: true }],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Create Batch', value: 'create', description: 'Create a new batch job from a JSONL file' },
          { name: 'Get Batch', value: 'get', description: 'Retrieve status of a batch job' },
          { name: 'List Batches', value: 'list', description: 'List all batch jobs' },
          { name: 'Cancel Batch', value: 'cancel', description: 'Cancel an in-progress batch job' },
        ],
        default: 'create',
      },
      // Create
      {
        displayName: 'Input File ID',
        name: 'inputFileId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: ['create'] } },
        description: 'The ID of the uploaded JSONL file (upload via Files API first)',
      },
      {
        displayName: 'Endpoint',
        name: 'endpoint',
        type: 'options',
        options: [
          { name: '/v1/chat/completions', value: '/v1/chat/completions' },
          { name: '/v1/embeddings', value: '/v1/embeddings' },
        ],
        default: '/v1/chat/completions',
        displayOptions: { show: { operation: ['create'] } },
      },
      {
        displayName: 'Completion Window',
        name: 'completionWindow',
        type: 'string',
        default: '24h',
        displayOptions: { show: { operation: ['create'] } },
        description: 'Time window for batch completion (e.g. 24h)',
      },
      // Get / Cancel
      {
        displayName: 'Batch ID',
        name: 'batchId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: ['get', 'cancel'] } },
        description: 'The ID of the batch job',
      },
      // List
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 20,
        displayOptions: { show: { operation: ['list'] } },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const credentials = await this.getCredentials('apiyiApi');
    const baseUrl = credentials.baseUrl as string;
    const headers = {
      Authorization: `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
    };

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        let response: string;

        if (operation === 'create') {
          const inputFileId = this.getNodeParameter('inputFileId', i) as string;
          const endpoint = this.getNodeParameter('endpoint', i) as string;
          const completionWindow = this.getNodeParameter('completionWindow', i) as string;

          response = await this.helpers.request({
            method: 'POST',
            url: `${baseUrl}/batches`,
            headers,
            body: JSON.stringify({ input_file_id: inputFileId, endpoint, completion_window: completionWindow }),
            json: false,
          }) as string;
        } else if (operation === 'get') {
          const batchId = this.getNodeParameter('batchId', i) as string;
          response = await this.helpers.request({
            method: 'GET',
            url: `${baseUrl}/batches/${batchId}`,
            headers,
            json: false,
          }) as string;
        } else if (operation === 'cancel') {
          const batchId = this.getNodeParameter('batchId', i) as string;
          response = await this.helpers.request({
            method: 'POST',
            url: `${baseUrl}/batches/${batchId}/cancel`,
            headers,
            json: false,
          }) as string;
        } else {
          // list
          const limit = this.getNodeParameter('limit', i) as number;
          response = await this.helpers.request({
            method: 'GET',
            url: `${baseUrl}/batches?limit=${limit}`,
            headers,
            json: false,
          }) as string;
        }

        const parsed = JSON.parse(response);
        returnData.push({ json: parsed });
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

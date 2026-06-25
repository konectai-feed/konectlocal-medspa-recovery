import { writeFile } from 'node:fs/promises';

const BREVO_BASE_URL = 'https://api.brevo.com/v3';
const FOLDER_NAME = 'KonectLocal Med Spa Recovery';
const PAGE_SIZE = 50;

export type AttributeType = 'text' | 'float' | 'date' | 'boolean';

type RetryConfig = {
  maxRetries: number;
  baseDelayMs: number;
};

type BrevoFolder = {
  id: number;
  name: string;
};

type BrevoList = {
  id: number;
  name: string;
};

type BrevoAttribute = {
  name: string;
  type: AttributeType | string;
};

type BrevoBootstrapResult = {
  folderId: number;
  listIds: Record<string, number>;
  envLines: string[];
};

type BootstrapOptions = {
  apiKey: string;
  fetchFn?: typeof fetch;
  sleepFn?: (ms: number) => Promise<void>;
  retry?: RetryConfig;
  writeGeneratedEnvFile?: boolean;
  generatedEnvFilePath?: string;
  logger?: Pick<typeof console, 'log' | 'error'>;
};

type ListDefinition = {
  name: string;
  envKey: string;
};

type AttributeDefinition = {
  name: string;
  type: AttributeType;
};

export const LISTS: ListDefinition[] = [
  { name: 'Assessment Started', envKey: 'BREVO_LIST_ASSESSMENT_STARTED' },
  { name: 'Assessment Completed', envKey: 'BREVO_LIST_ASSESSMENT_COMPLETED' },
  { name: 'Assessment Abandoned', envKey: 'BREVO_LIST_ASSESSMENT_ABANDONED' },
  { name: 'Missed Inquiry Leak', envKey: 'BREVO_LIST_MISSED_INQUIRY_LEAK' },
  { name: 'Consultation Conversion Leak', envKey: 'BREVO_LIST_CONSULTATION_CONVERSION_LEAK' },
  { name: 'No-Show Recovery', envKey: 'BREVO_LIST_NO_SHOW_RECOVERY' },
  { name: 'Patient Reactivation', envKey: 'BREVO_LIST_PATIENT_REACTIVATION' },
  { name: 'Revenue Recovery System Qualified', envKey: 'BREVO_LIST_REVENUE_SYSTEM_QUALIFIED' },
  { name: 'Command Center Qualified', envKey: 'BREVO_LIST_COMMAND_CENTER_QUALIFIED' },
  { name: 'Booked Review', envKey: 'BREVO_LIST_BOOKED_REVIEW' },
  { name: 'Checkout Abandoned', envKey: 'BREVO_LIST_CHECKOUT_ABANDONED' },
  { name: 'Purchased', envKey: 'BREVO_LIST_PURCHASED' },
  { name: 'Payment Failed', envKey: 'BREVO_LIST_PAYMENT_FAILED' },
  { name: 'Suppression', envKey: 'BREVO_LIST_SUPPRESSION' },
  { name: 'Onboarding Required', envKey: 'BREVO_LIST_ONBOARDING_REQUIRED' },
  { name: 'Onboarding Started', envKey: 'BREVO_LIST_ONBOARDING_STARTED' },
  { name: 'Onboarding Submitted', envKey: 'BREVO_LIST_ONBOARDING_SUBMITTED' },
  { name: 'Activation Review', envKey: 'BREVO_LIST_ACTIVATION_REVIEW' },
  { name: 'Configuration', envKey: 'BREVO_LIST_CONFIGURATION' },
  { name: 'Ready for Launch', envKey: 'BREVO_LIST_READY_FOR_LAUNCH' },
  { name: 'Active Customers', envKey: 'BREVO_LIST_ACTIVE_CUSTOMERS' },
  { name: 'Activation Delayed', envKey: 'BREVO_LIST_ACTIVATION_DELAYED' },
  { name: 'Cancelled Customers', envKey: 'BREVO_LIST_CANCELLED_CUSTOMERS' },
];

export const ATTRIBUTES: AttributeDefinition[] = [
  { name: 'BUSINESS_NAME', type: 'text' },
  { name: 'WEBSITE', type: 'text' },
  { name: 'CITY', type: 'text' },
  { name: 'STATE', type: 'text' },
  { name: 'RECOVERY_LEVEL', type: 'text' },
  { name: 'PRIMARY_LEAK', type: 'text' },
  { name: 'SECONDARY_LEAK', type: 'text' },
  { name: 'THIRD_LEAK', type: 'text' },
  { name: 'RECOMMENDED_PACKAGE', type: 'text' },
  { name: 'REPORT_URL', type: 'text' },
  { name: 'LEAD_SOURCE', type: 'text' },
  { name: 'CAMPAIGN_VARIANT', type: 'text' },
  { name: 'ASSESSMENT_STATUS', type: 'text' },
  { name: 'BOOKING_STATUS', type: 'text' },
  { name: 'CUSTOMER_STATUS', type: 'text' },
  { name: 'FORMULA_VERSION', type: 'text' },
  { name: 'CONFIDENCE_LEVEL', type: 'text' },
  { name: 'STRIPE_CUSTOMER_ID', type: 'text' },
  { name: 'SUBSCRIPTION_STATUS', type: 'text' },
  { name: 'PROMOTION_CODE', type: 'text' },
  { name: 'PURCHASED_PACKAGE', type: 'text' },
  { name: 'ACTIVATION_STATUS', type: 'text' },
  { name: 'ONBOARDING_STATUS', type: 'text' },
  { name: 'RECOVERY_SCORE', type: 'float' },
  { name: 'OPPORTUNITY_LOW', type: 'float' },
  { name: 'OPPORTUNITY_HIGH', type: 'float' },
  { name: 'LOCATION_COUNT', type: 'float' },
  { name: 'MONTHLY_INQUIRIES', type: 'float' },
  { name: 'SALES_READINESS_SCORE', type: 'float' },
  { name: 'ACCOUNT_VALUE_SCORE', type: 'float' },
  { name: 'ONBOARDING_COMPLETION_PERCENT', type: 'float' },
  { name: 'LAST_ASSESSMENT_DATE', type: 'date' },
  { name: 'LAUNCH_DATE', type: 'date' },
  { name: 'PREVIOUS_CAMPAIGN_OPENER', type: 'boolean' },
  { name: 'MANUAL_REVIEW_REQUIRED', type: 'boolean' },
];

function toBrevoAttributeType(type: AttributeType): string {
  return type.toUpperCase();
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export class AuthFailureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthFailureError';
  }
}

class BrevoClient {
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;
  private readonly retry: RetryConfig;
  private readonly sleepFn: (ms: number) => Promise<void>;

  constructor(params: { apiKey: string; fetchFn: typeof fetch; retry: RetryConfig; sleepFn: (ms: number) => Promise<void> }) {
    this.apiKey = params.apiKey;
    this.fetchFn = params.fetchFn;
    this.retry = params.retry;
    this.sleepFn = params.sleepFn;
  }

  private async request<T>(path: string, init: RequestInit = {}, attempt = 0): Promise<T> {
    const response = await this.fetchFn(`${BREVO_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
        ...(init.headers ?? {}),
      },
    });

    if (response.status === 401 || response.status === 403) {
      throw new AuthFailureError(`Brevo authentication failed with status ${response.status}.`);
    }

    if ((response.status === 429 || response.status >= 500) && attempt < this.retry.maxRetries) {
      const waitMs = this.retry.baseDelayMs * 2 ** attempt;
      await this.sleepFn(waitMs);
      return this.request<T>(path, init, attempt + 1);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Brevo API request failed (${response.status}) for ${path}: ${body.slice(0, 300)}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  async listAllFolders() {
    const folders: BrevoFolder[] = [];
    let offset = 0;

    while (true) {
      const data = await this.request<{ folders?: BrevoFolder[] }>(`/contacts/folders?limit=${PAGE_SIZE}&offset=${offset}`);
      const page = data.folders ?? [];
      folders.push(...page);
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    return folders;
  }

  async createFolder(name: string) {
    const data = await this.request<{ id: number }>('/contacts/folders', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return data.id;
  }

  async listAllLists() {
    const lists: BrevoList[] = [];
    let offset = 0;

    while (true) {
      const data = await this.request<{ lists?: BrevoList[] }>(`/contacts/lists?limit=${PAGE_SIZE}&offset=${offset}`);
      const page = data.lists ?? [];
      lists.push(...page);
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    return lists;
  }

  async createList(name: string, folderId: number) {
    const data = await this.request<{ id: number }>('/contacts/lists', {
      method: 'POST',
      body: JSON.stringify({ name, folderId }),
    });
    return data.id;
  }

  async listAllAttributes() {
    const data = await this.request<{
      attributes?: {
        normal?: BrevoAttribute[];
      };
    }>('/contacts/attributes');

    return data.attributes?.normal ?? [];
  }

  async createAttribute(attribute: AttributeDefinition) {
    await this.request(`/contacts/attributes/normal/${attribute.name}`, {
      method: 'POST',
      body: JSON.stringify({ type: toBrevoAttributeType(attribute.type) }),
    });
  }
}

async function ensureFolder(client: BrevoClient, logger: Pick<typeof console, 'log'>) {
  const folders = await client.listAllFolders();
  const existing = folders.find((folder) => folder.name === FOLDER_NAME);
  if (existing) {
    logger.log(`Reusing folder: ${FOLDER_NAME} (${existing.id})`);
    return existing.id;
  }

  const createdId = await client.createFolder(FOLDER_NAME);
  logger.log(`Created folder: ${FOLDER_NAME} (${createdId})`);
  return createdId;
}

async function ensureLists(client: BrevoClient, folderId: number, logger: Pick<typeof console, 'log'>) {
  const existingLists = await client.listAllLists();
  const byName = new Map(existingLists.map((list) => [list.name, list.id] as const));

  const result: Record<string, number> = {};
  for (const listDef of LISTS) {
    const existingId = byName.get(listDef.name);
    if (existingId) {
      result[listDef.envKey] = existingId;
      logger.log(`Reusing list: ${listDef.name} (${existingId})`);
      continue;
    }

    const createdId = await client.createList(listDef.name, folderId);
    result[listDef.envKey] = createdId;
    logger.log(`Created list: ${listDef.name} (${createdId})`);
  }

  return result;
}

async function ensureAttributes(client: BrevoClient, logger: Pick<typeof console, 'log'>) {
  const existingAttributes = await client.listAllAttributes();
  const byName = new Map(existingAttributes.map((attribute) => [attribute.name, attribute] as const));

  for (const attribute of ATTRIBUTES) {
    const existing = byName.get(attribute.name);
    if (!existing) {
      await client.createAttribute(attribute);
      logger.log(`Created attribute: ${attribute.name} (${attribute.type})`);
      continue;
    }

    const existingType = String(existing.type).toLowerCase();
    if (existingType !== attribute.type) {
      throw new Error(
        `Attribute type mismatch for ${attribute.name}: expected ${attribute.type}, found ${existingType}.`,
      );
    }

    logger.log(`Reusing attribute: ${attribute.name} (${existingType})`);
  }
}

function buildEnvLines(listIds: Record<string, number>) {
  return LISTS.map((list) => `${list.envKey}=${listIds[list.envKey]}`);
}

export async function runBrevoBootstrap(options: BootstrapOptions): Promise<BrevoBootstrapResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const sleepFn = options.sleepFn ?? delay;
  const logger = options.logger ?? console;
  const retry = options.retry ?? { maxRetries: 5, baseDelayMs: 400 };

  const client = new BrevoClient({
    apiKey: options.apiKey,
    fetchFn,
    retry,
    sleepFn,
  });

  const folderId = await ensureFolder(client, logger);
  const listIds = await ensureLists(client, folderId, logger);
  await ensureAttributes(client, logger);

  const envLines = buildEnvLines(listIds);

  logger.log('Brevo list IDs (.env format):');
  for (const line of envLines) {
    logger.log(line);
  }

  if (options.writeGeneratedEnvFile) {
    const generatedEnvFilePath = options.generatedEnvFilePath ?? '.brevo.generated.env';
    const content = [`BREVO_FOLDER_NAME=${FOLDER_NAME}`, `BREVO_FOLDER_ID=${folderId}`, ...envLines].join('\n') + '\n';
    await writeFile(generatedEnvFilePath, content, 'utf8');
    logger.log(`Wrote ${generatedEnvFilePath}`);
  }

  return { folderId, listIds, envLines };
}

async function main() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('Missing BREVO_API_KEY environment variable.');
    process.exitCode = 1;
    return;
  }

  const writeGeneratedEnvFile = process.argv.includes('--write-env-file');

  try {
    await runBrevoBootstrap({
      apiKey,
      writeGeneratedEnvFile,
    });
  } catch (error) {
    if (error instanceof AuthFailureError) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }

    const message = error instanceof Error ? error.message : 'Brevo bootstrap failed.';
    console.error(message);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}

export { FOLDER_NAME };

import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import dotenv from 'dotenv';
import { pageStructureSchema } from '../src/helpers/schema-generator';
import { objectSchema } from '../src/lib/ai';
import { CachedComponentsProvider } from '../src/components';
import { SitecoreGraphqlAuthoringComponentsProvider } from '../src/components/sitecore/SitecoreGraphqlAuthoringComponentsProvider';
import findConfig from 'find-config';

dotenv.config({ path: findConfig('.env') ?? undefined });

const site = 'blueprint';

const provider = new SitecoreGraphqlAuthoringComponentsProvider(
    {
        accessToken: process.env.SITECORE_GRAPHQL_ACCESS_TOKEN!,
        baseUrl: process.env.SITECORE_GRAPHQL_BASE_URL!,
    },
    site,
);
const componentsProvider = new CachedComponentsProvider(
    provider,
    ['.sitecore', site],
    true,
);

console.log('... Generate schema');

const { schema, registry } = pageStructureSchema(
    await componentsProvider.getComponents(),
);

console.log('... Generate object');

const finalSchema = objectSchema(schema, registry);

const stream = streamObject({
    model: openai('gpt-4.1-mini'),
    messages: [
        {
            role: 'user',
            content: `I write a comprehensive guide on Sitecore pipeline: ootb pipelines, how to write a custom pipeline, etc.`,
        },
    ],
    system: `
## Instructions
Generate a page based on user requirements.

## Components rules
- Always start with Container component in the main content area. And then place row/column components to style and organize the page.
- Try to use 'Rich Text' component as minimum as possible (only when it's absolutely necessary, e.g. for code blocks).

## Datasource rules
- For any RTE field use HTML (markdown is not supported).
        `,
    schema: finalSchema,
});

for await (const part of stream.textStream) {
    process.stdout.write(part);
}

const finalObject = await stream.object;
console.dir(finalObject, { depth: null });
